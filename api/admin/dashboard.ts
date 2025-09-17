/**
 * Admin Dashboard API Endpoint
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { adminService } from '../../src/services/AdminService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Check admin authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Verify admin access
    const isAdmin = await adminService.checkAdminAccess();
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        const { from, to } = req.query;
        const dateRange = {
          from: new Date(from as string || Date.now() - 7 * 24 * 60 * 60 * 1000),
          to: new Date(to as string || Date.now())
        };
        
        const data = await adminService.getDashboardData(dateRange);
        return res.status(200).json(data);

      case 'POST':
        const { action } = req.body;
        
        switch (action) {
          case 'refund':
            const { transactionId, reason } = req.body;
            await adminService.processRefund(transactionId, reason);
            return res.status(200).json({ success: true });
            
          case 'ban':
            const { userId, banReason, duration } = req.body;
            await adminService.banUser(userId, banReason, duration);
            return res.status(200).json({ success: true });
            
          case 'email':
            const { userId: emailUserId, subject, message } = req.body;
            await adminService.sendEmail(emailUserId, subject, message);
            return res.status(200).json({ success: true });
            
          case 'export':
            const exportRange = {
              from: new Date(req.body.from || Date.now() - 30 * 24 * 60 * 60 * 1000),
              to: new Date(req.body.to || Date.now())
            };
            const csvBlob = await adminService.exportData(exportRange);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="dominauts-export.csv"');
            return res.status(200).send(csvBlob);
            
          default:
            return res.status(400).json({ error: 'Invalid action' });
        }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}