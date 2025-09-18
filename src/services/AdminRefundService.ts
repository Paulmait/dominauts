/**
 * Admin Refund Service
 * Comprehensive refund management system for administrators
 */

import { supabase } from './SupabaseService';
import { admin2FAService } from './Admin2FAService';

export interface RefundRequest {
  id: string;
  user_id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'failed';
  stripe_payment_intent?: string;
  stripe_refund_id?: string;
  admin_notes?: string;
  created_at: string;
  processed_at?: string;
  processed_by?: string;
}

export interface RefundPolicy {
  max_days_for_refund: number;
  min_amount: number;
  max_amount: number;
  auto_approve_under: number;
  requires_admin_approval: boolean;
  allowed_reasons: string[];
}

export interface RefundMetrics {
  total_refunds: number;
  total_amount: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  avg_processing_time: number;
  refund_rate: number;
  top_reasons: Array<{reason: string; count: number}>;
}

class AdminRefundService {
  private static instance: AdminRefundService;

  private refundPolicy: RefundPolicy = {
    max_days_for_refund: 30,
    min_amount: 0.50,
    max_amount: 10000,
    auto_approve_under: 10,
    requires_admin_approval: true,
    allowed_reasons: [
      'technical_issue',
      'accidental_purchase',
      'not_as_described',
      'unauthorized_charge',
      'duplicate_charge',
      'service_unavailable',
      'customer_request',
      'goodwill'
    ]
  };

  private constructor() {}

  public static getInstance(): AdminRefundService {
    if (!AdminRefundService.instance) {
      AdminRefundService.instance = new AdminRefundService();
    }
    return AdminRefundService.instance;
  }

  /**
   * Process refund request with 2FA verification
   */
  public async processRefund(
    refundId: string,
    adminId: string,
    action: 'approve' | 'reject',
    notes?: string,
    twoFactorCode?: string
  ): Promise<{success: boolean; message: string; refund?: RefundRequest}> {
    try {
      // Verify 2FA for refund operations
      const verification = await admin2FAService.verify2FA(
        adminId,
        twoFactorCode || '',
        'refund'
      );

      if (!verification.valid) {
        return {
          success: false,
          message: verification.locked_until
            ? `Account locked until ${verification.locked_until}`
            : `Invalid 2FA code. ${verification.remaining_attempts} attempts remaining.`
        };
      }
      // Get refund request
      const { data: refund, error } = await supabase
        .from('refund_requests')
        .select('*')
        .eq('id', refundId)
        .single();

      if (error || !refund) {
        return { success: false, message: 'Refund request not found' };
      }

      if (refund.status !== 'pending') {
        return { success: false, message: 'Refund already processed' };
      }

      if (action === 'approve') {
        return await this.approveRefund(refund, adminId, notes);
      } else {
        return await this.rejectRefund(refund, adminId, notes);
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      return { success: false, message: 'Failed to process refund' };
    }
  }

  /**
   * Approve refund request
   */
  private async approveRefund(
    refund: RefundRequest,
    adminId: string,
    notes?: string
  ): Promise<{success: boolean; message: string; refund?: RefundRequest}> {
    try {
      // Call Stripe refund edge function
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/process-refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payment_intent_id: refund.stripe_payment_intent,
          amount: refund.amount * 100, // Convert to cents
          reason: refund.reason,
          metadata: {
            refund_id: refund.id,
            admin_id: adminId,
            user_id: refund.user_id
          }
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Stripe refund failed');
      }

      // Update refund request status
      const { data: updatedRefund, error: updateError } = await supabase
        .from('refund_requests')
        .update({
          status: 'processed',
          stripe_refund_id: result.refund_id,
          processed_at: new Date().toISOString(),
          processed_by: adminId,
          admin_notes: notes
        })
        .eq('id', refund.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update user's transaction
      await supabase
        .from('transactions')
        .update({
          status: 'refunded',
          refunded_at: new Date().toISOString(),
          stripe_refund_id: result.refund_id
        })
        .eq('id', refund.transaction_id);

      // Update user's coins if applicable
      if (refund.reason === 'goodwill' || refund.reason === 'technical_issue') {
        await this.compensateUser(refund.user_id, refund.amount);
      }

      // Log admin action
      await this.logAdminAction(adminId, 'refund_approved', {
        refund_id: refund.id,
        amount: refund.amount,
        reason: refund.reason,
        notes
      });

      // Send notification to user
      await this.notifyUser(refund.user_id, 'refund_approved', {
        amount: refund.amount,
        reason: refund.reason
      });

      return {
        success: true,
        message: 'Refund approved and processed successfully',
        refund: updatedRefund
      };

    } catch (error) {
      console.error('Error approving refund:', error);

      // Update status to failed
      await supabase
        .from('refund_requests')
        .update({
          status: 'failed',
          admin_notes: `Failed to process: ${error.message}`
        })
        .eq('id', refund.id);

      return {
        success: false,
        message: `Failed to process refund: ${error.message}`
      };
    }
  }

  /**
   * Reject refund request
   */
  private async rejectRefund(
    refund: RefundRequest,
    adminId: string,
    notes?: string
  ): Promise<{success: boolean; message: string; refund?: RefundRequest}> {
    try {
      const { data: updatedRefund, error } = await supabase
        .from('refund_requests')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: adminId,
          admin_notes: notes || 'Refund request does not meet policy requirements'
        })
        .eq('id', refund.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Log admin action
      await this.logAdminAction(adminId, 'refund_rejected', {
        refund_id: refund.id,
        amount: refund.amount,
        reason: refund.reason,
        notes
      });

      // Send notification to user
      await this.notifyUser(refund.user_id, 'refund_rejected', {
        amount: refund.amount,
        reason: notes || 'Does not meet refund policy'
      });

      return {
        success: true,
        message: 'Refund request rejected',
        refund: updatedRefund
      };

    } catch (error) {
      console.error('Error rejecting refund:', error);
      return {
        success: false,
        message: 'Failed to reject refund'
      };
    }
  }

  /**
   * Bulk process refunds with 2FA
   */
  public async bulkProcessRefunds(
    refundIds: string[],
    adminId: string,
    action: 'approve' | 'reject',
    notes?: string,
    twoFactorCode?: string
  ): Promise<{processed: number; failed: number; results: any[]}> {
    // Verify 2FA once for bulk operations
    const verification = await admin2FAService.verify2FA(
      adminId,
      twoFactorCode || '',
      'refund'
    );

    if (!verification.valid) {
      return {
        processed: 0,
        failed: refundIds.length,
        results: [{
          success: false,
          message: '2FA verification required for bulk refund operations'
        }]
      };
    }
    const results = [];
    let processed = 0;
    let failed = 0;

    for (const refundId of refundIds) {
      const result = await this.processRefund(refundId, adminId, action, notes);

      if (result.success) {
        processed++;
      } else {
        failed++;
      }

      results.push({
        refund_id: refundId,
        success: result.success,
        message: result.message
      });

      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { processed, failed, results };
  }

  /**
   * Auto-approve small refunds
   */
  public async autoApproveSmallRefunds(): Promise<number> {
    try {
      const { data: pendingRefunds } = await supabase
        .from('refund_requests')
        .select('*')
        .eq('status', 'pending')
        .lt('amount', this.refundPolicy.auto_approve_under);

      if (!pendingRefunds || pendingRefunds.length === 0) {
        return 0;
      }

      let approved = 0;
      const systemAdminId = 'system';

      for (const refund of pendingRefunds) {
        const result = await this.approveRefund(
          refund,
          systemAdminId,
          'Auto-approved: Amount under threshold'
        );

        if (result.success) {
          approved++;
        }
      }

      return approved;

    } catch (error) {
      console.error('Error auto-approving refunds:', error);
      return 0;
    }
  }

  /**
   * Get refund metrics
   */
  public async getRefundMetrics(days: number = 30): Promise<RefundMetrics> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: refunds } = await supabase
        .from('refund_requests')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (!refunds) {
        return this.getEmptyMetrics();
      }

      const metrics: RefundMetrics = {
        total_refunds: refunds.length,
        total_amount: refunds.reduce((sum, r) => sum + r.amount, 0),
        pending_count: refunds.filter(r => r.status === 'pending').length,
        approved_count: refunds.filter(r => r.status === 'processed').length,
        rejected_count: refunds.filter(r => r.status === 'rejected').length,
        avg_processing_time: this.calculateAvgProcessingTime(refunds),
        refund_rate: await this.calculateRefundRate(days),
        top_reasons: this.getTopReasons(refunds)
      };

      return metrics;

    } catch (error) {
      console.error('Error getting refund metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Check refund eligibility
   */
  public async checkEligibility(
    transactionId: string
  ): Promise<{eligible: boolean; reason?: string}> {
    try {
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (!transaction) {
        return { eligible: false, reason: 'Transaction not found' };
      }

      // Check if already refunded
      if (transaction.status === 'refunded') {
        return { eligible: false, reason: 'Already refunded' };
      }

      // Check time limit
      const transactionDate = new Date(transaction.created_at);
      const daysSinceTransaction = Math.floor(
        (Date.now() - transactionDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceTransaction > this.refundPolicy.max_days_for_refund) {
        return {
          eligible: false,
          reason: `Refund period expired (${this.refundPolicy.max_days_for_refund} days)`
        };
      }

      // Check amount limits
      if (transaction.amount < this.refundPolicy.min_amount) {
        return {
          eligible: false,
          reason: `Amount below minimum ($${this.refundPolicy.min_amount})`
        };
      }

      if (transaction.amount > this.refundPolicy.max_amount) {
        return {
          eligible: false,
          reason: `Amount exceeds maximum ($${this.refundPolicy.max_amount})`
        };
      }

      return { eligible: true };

    } catch (error) {
      console.error('Error checking eligibility:', error);
      return { eligible: false, reason: 'Error checking eligibility' };
    }
  }

  /**
   * Create refund request
   */
  public async createRefundRequest(
    userId: string,
    transactionId: string,
    amount: number,
    reason: string,
    details?: string
  ): Promise<{success: boolean; message: string; request?: RefundRequest}> {
    try {
      // Check eligibility first
      const eligibility = await this.checkEligibility(transactionId);

      if (!eligibility.eligible) {
        return {
          success: false,
          message: eligibility.reason || 'Not eligible for refund'
        };
      }

      // Check for duplicate request
      const { data: existing } = await supabase
        .from('refund_requests')
        .select('*')
        .eq('transaction_id', transactionId)
        .eq('status', 'pending')
        .single();

      if (existing) {
        return {
          success: false,
          message: 'Refund request already pending for this transaction'
        };
      }

      // Create refund request
      const { data: refundRequest, error } = await supabase
        .from('refund_requests')
        .insert({
          user_id: userId,
          transaction_id: transactionId,
          amount,
          currency: 'USD',
          reason,
          details,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Auto-approve if under threshold
      if (amount < this.refundPolicy.auto_approve_under) {
        const result = await this.approveRefund(
          refundRequest,
          'system',
          'Auto-approved: Amount under threshold'
        );

        if (result.success) {
          return {
            success: true,
            message: 'Refund automatically approved and processed',
            request: result.refund
          };
        }
      }

      // Notify admins of pending refund
      await this.notifyAdmins('refund_requested', {
        user_id: userId,
        amount,
        reason
      });

      return {
        success: true,
        message: 'Refund request submitted for review',
        request: refundRequest
      };

    } catch (error) {
      console.error('Error creating refund request:', error);
      return {
        success: false,
        message: 'Failed to create refund request'
      };
    }
  }

  /**
   * Get refund history
   */
  public async getRefundHistory(
    filters?: {
      user_id?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<RefundRequest[]> {
    try {
      let query = supabase
        .from('refund_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.start_date) {
        query = query.gte('created_at', filters.start_date);
      }

      if (filters?.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('Error getting refund history:', error);
      return [];
    }
  }

  /**
   * Export refund data
   */
  public async exportRefundData(
    format: 'csv' | 'json' = 'json'
  ): Promise<string | any[]> {
    try {
      const { data } = await supabase
        .from('refund_requests')
        .select(`
          *,
          user:profiles(username, email),
          transaction:transactions(stripe_session_id, product_type)
        `)
        .order('created_at', { ascending: false });

      if (!data) return format === 'csv' ? '' : [];

      if (format === 'csv') {
        return this.convertToCSV(data);
      }

      return data;

    } catch (error) {
      console.error('Error exporting refund data:', error);
      return format === 'csv' ? '' : [];
    }
  }

  // Helper methods

  private async compensateUser(userId: string, amount: number): Promise<void> {
    // Give user bonus coins as compensation
    const bonusCoins = Math.floor(amount * 100 * 1.1); // 10% bonus

    // Get current coins
    const { data: profile } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', userId)
      .single();

    // Update with new total
    await supabase
      .from('profiles')
      .update({
        coins: (profile?.coins || 0) + bonusCoins
      })
      .eq('id', userId);

    await this.notifyUser(userId, 'compensation', {
      coins: bonusCoins,
      reason: 'Refund compensation'
    });
  }

  private async logAdminAction(adminId: string, action: string, details: any): Promise<void> {
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: adminId,
        action,
        details,
        created_at: new Date().toISOString()
      });
  }

  private async notifyUser(userId: string, type: string, data: any): Promise<void> {
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        data,
        read: false,
        created_at: new Date().toISOString()
      });
  }

  private async notifyAdmins(type: string, data: any): Promise<void> {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', true);

    if (admins) {
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        type,
        data,
        read: false,
        created_at: new Date().toISOString()
      }));

      await supabase
        .from('notifications')
        .insert(notifications);
    }
  }

  private calculateAvgProcessingTime(refunds: any[]): number {
    const processed = refunds.filter(r => r.processed_at);

    if (processed.length === 0) return 0;

    const totalTime = processed.reduce((sum, r) => {
      const created = new Date(r.created_at).getTime();
      const processedAt = new Date(r.processed_at).getTime();
      return sum + (processedAt - created);
    }, 0);

    return Math.floor(totalTime / processed.length / (1000 * 60)); // in minutes
  }

  private async calculateRefundRate(days: number): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'completed');

    const { data: refunds } = await supabase
      .from('refund_requests')
      .select('id')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'processed');

    const totalTransactions = transactions?.length || 0;
    const totalRefunds = refunds?.length || 0;

    if (totalTransactions === 0) return 0;

    return (totalRefunds / totalTransactions) * 100;
  }

  private getTopReasons(refunds: any[]): Array<{reason: string; count: number}> {
    const reasonCounts = refunds.reduce((acc, r) => {
      acc[r.reason] = (acc[r.reason] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getEmptyMetrics(): RefundMetrics {
    return {
      total_refunds: 0,
      total_amount: 0,
      pending_count: 0,
      approved_count: 0,
      rejected_count: 0,
      avg_processing_time: 0,
      refund_rate: 0,
      top_reasons: []
    };
  }

  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';

    const flattenObject = (obj: any, prefix = ''): any => {
      return Object.keys(obj).reduce((acc, key) => {
        const value = obj[key];
        const newKey = prefix ? `${prefix}_${key}` : key;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(acc, flattenObject(value, newKey));
        } else {
          acc[newKey] = value;
        }

        return acc;
      }, {});
    };

    const flattened = data.map(row => flattenObject(row));
    const headers = Object.keys(flattened[0]).join(',');
    const rows = flattened.map(row =>
      Object.values(row).map(value =>
        typeof value === 'string' ? `"${value}"` : value
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  }
}

export const adminRefundService = AdminRefundService.getInstance();
export default adminRefundService;