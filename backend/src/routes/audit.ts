import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { apiLimiter, sensitiveOperationLimiter } from '../middleware/rateLimit';
import * as auditLogger from '../audit/logger';
import { AuditEventType, ResourceType } from '../audit/events';

const router = Router();

/**
 * GET /api/v1/audit/logs
 * Query audit logs
 */
router.get('/logs', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    
    // Users can only query their own audit logs
    const eventType = req.query.event_type as string;
    const resourceType = req.query.resource_type as string;
    const resourceId = req.query.resource_id as string;
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
    const ipAddress = req.query.ip_address as string;
    const action = req.query.action as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await auditLogger.queryAuditLogs({
      userId, // Enforce user-specific queries
      eventType: eventType as AuditEventType,
      resourceType: resourceType as ResourceType,
      resourceId,
      startDate,
      endDate,
      ipAddress,
      action,
      page,
      limit
    });

    res.json({
      logs: result.logs.map(log => ({
        id: log.id,
        event_type: log.event_type,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        action: log.action,
        metadata: log.metadata,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        timestamp: log.timestamp
        // Note: hash_chain not included in user queries (internal only)
      })),
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error('Query audit logs error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to query audit logs' }
    });
  }
});

/**
 * GET /api/v1/audit/export
 * Export audit logs (DSR)
 */
router.get('/export', authenticate, sensitiveOperationLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const format = (req.query.format as 'json' | 'csv') || 'json';

    const exportData = await auditLogger.exportAuditLogs(userId, format);

    const contentType = format === 'json' ? 'application/json' : 'text/csv';
    const filename = `audit_logs_${userId}_${Date.now()}.${format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);
  } catch (error: any) {
    console.error('Export audit logs error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to export audit logs' }
    });
  }
});

/**
 * GET /api/v1/audit/verify (Admin/internal only - for integrity checking)
 * Verify audit log integrity
 */
router.get('/verify', authenticate, async (req: Request, res: Response) => {
  try {
    // In production, add admin role check here
    const result = await auditLogger.verifyAuditLogIntegrity();

    res.json({
      valid: result.valid,
      invalid_count: result.invalidCount,
      message: result.valid
        ? 'Audit log integrity verified'
        : `Found ${result.invalidCount} invalid entries`
    });
  } catch (error: any) {
    console.error('Verify audit logs error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to verify audit logs' }
    });
  }
});

export default router;

