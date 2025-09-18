/**
 * Admin 2FA Service
 * Two-factor authentication for sensitive admin operations
 */

import { supabase } from './SupabaseService';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

export interface TwoFactorSetup {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

export interface TwoFactorVerification {
  valid: boolean;
  remaining_attempts?: number;
  locked_until?: string;
}

class Admin2FAService {
  private static instance: Admin2FAService;
  private readonly maxAttempts = 3;
  private readonly lockoutDuration = 15 * 60 * 1000; // 15 minutes
  private failedAttempts: Map<string, number> = new Map();
  private lockouts: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): Admin2FAService {
    if (!Admin2FAService.instance) {
      Admin2FAService.instance = new Admin2FAService();
    }
    return Admin2FAService.instance;
  }

  /**
   * Setup 2FA for admin
   */
  public async setup2FA(adminId: string): Promise<TwoFactorSetup> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `Dominauts Admin (${adminId})`,
        issuer: 'Dominauts',
        length: 32
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes(8);

      // Store encrypted secret in database
      const { error } = await supabase
        .from('admin_2fa')
        .upsert({
          admin_id: adminId,
          secret: this.encryptSecret(secret.base32),
          backup_codes: this.encryptBackupCodes(backupCodes),
          enabled: false,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      return {
        secret: secret.base32,
        qr_code: qrCodeUrl,
        backup_codes: backupCodes
      };
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      throw new Error('Failed to setup 2FA');
    }
  }

  /**
   * Enable 2FA after verification
   */
  public async enable2FA(adminId: string, verificationCode: string): Promise<boolean> {
    try {
      // Get stored secret
      const { data: adminData } = await supabase
        .from('admin_2fa')
        .select('secret')
        .eq('admin_id', adminId)
        .single();

      if (!adminData) {
        throw new Error('2FA not setup for this admin');
      }

      const secret = this.decryptSecret(adminData.secret);

      // Verify the code
      const isValid = this.verifyToken(secret, verificationCode);

      if (!isValid) {
        return false;
      }

      // Enable 2FA
      await supabase
        .from('admin_2fa')
        .update({
          enabled: true,
          verified_at: new Date().toISOString()
        })
        .eq('admin_id', adminId);

      // Update admin profile
      await supabase
        .from('profiles')
        .update({
          two_factor_enabled: true
        })
        .eq('id', adminId);

      return true;
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      return false;
    }
  }

  /**
   * Verify 2FA code for sensitive operations
   */
  public async verify2FA(
    adminId: string,
    code: string,
    operation: 'refund' | 'user_delete' | 'settings_change'
  ): Promise<TwoFactorVerification> {
    try {
      // Check if locked out
      if (this.isLockedOut(adminId)) {
        const lockedUntil = this.lockouts.get(adminId)!;
        return {
          valid: false,
          locked_until: new Date(lockedUntil).toISOString()
        };
      }

      // Get admin 2FA data
      const { data: adminData } = await supabase
        .from('admin_2fa')
        .select('secret, backup_codes, enabled')
        .eq('admin_id', adminId)
        .single();

      if (!adminData || !adminData.enabled) {
        // 2FA not enabled, check if required for operation
        if (this.isOperationCritical(operation)) {
          throw new Error('2FA required for this operation');
        }
        return { valid: true };
      }

      const secret = this.decryptSecret(adminData.secret);

      // Check if it's a backup code
      const backupCodes = this.decryptBackupCodes(adminData.backup_codes);
      if (backupCodes.includes(code)) {
        // Remove used backup code
        const updatedCodes = backupCodes.filter(c => c !== code);
        await supabase
          .from('admin_2fa')
          .update({
            backup_codes: this.encryptBackupCodes(updatedCodes)
          })
          .eq('admin_id', adminId);

        // Log successful verification
        await this.log2FAEvent(adminId, operation, true, 'backup_code');
        return { valid: true };
      }

      // Verify TOTP code
      const isValid = this.verifyToken(secret, code);

      if (!isValid) {
        // Track failed attempt
        this.trackFailedAttempt(adminId);
        const attempts = this.failedAttempts.get(adminId) || 0;

        // Log failed verification
        await this.log2FAEvent(adminId, operation, false, 'totp');

        if (attempts >= this.maxAttempts) {
          // Lock out the admin
          this.lockOut(adminId);
          await this.alertSecurityTeam(adminId, 'Multiple failed 2FA attempts');

          return {
            valid: false,
            remaining_attempts: 0,
            locked_until: new Date(Date.now() + this.lockoutDuration).toISOString()
          };
        }

        return {
          valid: false,
          remaining_attempts: this.maxAttempts - attempts
        };
      }

      // Clear failed attempts on success
      this.failedAttempts.delete(adminId);

      // Log successful verification
      await this.log2FAEvent(adminId, operation, true, 'totp');

      // For critical operations, require additional verification
      if (operation === 'refund' && this.requiresAdditionalVerification(adminId)) {
        await this.sendSecondaryVerification(adminId);
      }

      return { valid: true };
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      return { valid: false };
    }
  }

  /**
   * Disable 2FA (requires current 2FA code)
   */
  public async disable2FA(adminId: string, code: string): Promise<boolean> {
    const verification = await this.verify2FA(adminId, code, 'settings_change');

    if (!verification.valid) {
      return false;
    }

    try {
      // Disable 2FA
      await supabase
        .from('admin_2fa')
        .update({
          enabled: false,
          disabled_at: new Date().toISOString()
        })
        .eq('admin_id', adminId);

      // Update admin profile
      await supabase
        .from('profiles')
        .update({
          two_factor_enabled: false
        })
        .eq('id', adminId);

      return true;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      return false;
    }
  }

  /**
   * Generate recovery codes
   */
  public async generateRecoveryCodes(adminId: string): Promise<string[]> {
    const codes = this.generateBackupCodes(8);

    await supabase
      .from('admin_2fa')
      .update({
        backup_codes: this.encryptBackupCodes(codes),
        recovery_codes_generated_at: new Date().toISOString()
      })
      .eq('admin_id', adminId);

    return codes;
  }

  /**
   * Require 2FA for all admins (security policy)
   */
  public async enforceGlobal2FA(): Promise<void> {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('is_admin', true)
      .eq('two_factor_enabled', false);

    if (admins) {
      for (const admin of admins) {
        // Send notification to enable 2FA
        await supabase
          .from('notifications')
          .insert({
            user_id: admin.id,
            type: 'security_alert',
            title: '2FA Required',
            message: 'Two-factor authentication is now required for all admin accounts. Please enable it in your security settings.',
            priority: 'high',
            created_at: new Date().toISOString()
          });
      }
    }
  }

  // Private helper methods

  private verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps before/after for clock skew
    });
  }

  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(this.generateSecureCode());
    }
    return codes;
  }

  private generateSecureCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += '-'; // Format: XXXX-XXXX
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private encryptSecret(secret: string): string {
    // In production, use proper encryption
    return Buffer.from(secret).toString('base64');
  }

  private decryptSecret(encryptedSecret: string): string {
    // In production, use proper decryption
    return Buffer.from(encryptedSecret, 'base64').toString();
  }

  private encryptBackupCodes(codes: string[]): string {
    return Buffer.from(JSON.stringify(codes)).toString('base64');
  }

  private decryptBackupCodes(encryptedCodes: string): string[] {
    try {
      return JSON.parse(Buffer.from(encryptedCodes, 'base64').toString());
    } catch {
      return [];
    }
  }

  private trackFailedAttempt(adminId: string): void {
    const current = this.failedAttempts.get(adminId) || 0;
    this.failedAttempts.set(adminId, current + 1);
  }

  private isLockedOut(adminId: string): boolean {
    const lockoutTime = this.lockouts.get(adminId);
    if (!lockoutTime) return false;

    if (Date.now() > lockoutTime) {
      this.lockouts.delete(adminId);
      return false;
    }

    return true;
  }

  private lockOut(adminId: string): void {
    this.lockouts.set(adminId, Date.now() + this.lockoutDuration);
    this.failedAttempts.delete(adminId);
  }

  private isOperationCritical(operation: string): boolean {
    return ['refund', 'user_delete'].includes(operation);
  }

  private requiresAdditionalVerification(adminId: string): boolean {
    // Check if admin is accessing from unusual location or device
    // For now, return false - implement IP/device checking later
    return false;
  }

  private async sendSecondaryVerification(adminId: string): Promise<void> {
    // Send email/SMS for additional verification
    // Implementation depends on notification service
  }

  private async log2FAEvent(
    adminId: string,
    operation: string,
    success: boolean,
    method: string
  ): Promise<void> {
    await supabase
      .from('admin_2fa_log')
      .insert({
        admin_id: adminId,
        operation,
        success,
        method,
        ip_address: 'unknown', // Get from request context
        timestamp: new Date().toISOString()
      });
  }

  private async alertSecurityTeam(adminId: string, reason: string): Promise<void> {
    // Send alert to security team
    const { data: securityAdmins } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', true)
      .eq('security_role', true);

    if (securityAdmins) {
      const alerts = securityAdmins.map(admin => ({
        user_id: admin.id,
        type: 'security_alert',
        title: '2FA Security Alert',
        message: `Admin ${adminId}: ${reason}`,
        priority: 'critical',
        created_at: new Date().toISOString()
      }));

      await supabase
        .from('notifications')
        .insert(alerts);
    }
  }
}

export const admin2FAService = Admin2FAService.getInstance();
export default admin2FAService;