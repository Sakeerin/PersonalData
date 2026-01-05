import { Request, Response, NextFunction } from 'express';
import * as auditLogger from '../audit/logger';
import { AuditEventType, ResourceType } from '../audit/events';

/**
 * Audit middleware for automatic logging
 */
export function auditMiddleware(options: {
  eventType: AuditEventType;
  resourceType?: ResourceType;
  getResourceId?: (req: Request) => string | undefined;
  getMetadata?: (req: Request, res: Response) => any;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Capture response for logging
    const originalSend = res.send;
    res.send = function (body: any) {
      // Log after response
      setTimeout(async () => {
        try {
          const userId = req.userId || null;
          const resourceId = options.getResourceId?.(req) || req.params.id;
          const metadata = options.getMetadata?.(req, res) || {};
          
          // Add result to metadata
          metadata.result = res.statusCode < 400 ? 'success' : 'failure';
          if (res.statusCode >= 400) {
            metadata.error_code = `HTTP_${res.statusCode}`;
          }

          if (options.resourceType && resourceId) {
            await auditLogger.logDataOperation(
              options.eventType,
              userId || '',
              options.resourceType,
              resourceId,
              metadata,
              req.ip,
              req.headers['user-agent']
            );
          } else {
            await auditLogger.logEvent({
              user_id: userId,
              event_type: options.eventType,
              action: options.eventType.split('.')[1],
              metadata,
              ip_address: req.ip,
              user_agent: req.headers['user-agent'],
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error('Audit logging error:', error);
          // Don't fail the request if audit logging fails
        }
      }, 0);

      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Log authentication events
 */
export async function logAuth(req: Request, eventType: AuditEventType, metadata?: any): Promise<void> {
  try {
    await auditLogger.logAuthEvent(
      eventType,
      req.userId || null,
      metadata || {},
      req.ip,
      req.headers['user-agent']
    );
  } catch (error) {
    console.error('Auth audit logging error:', error);
  }
}

/**
 * Log data operation
 */
export async function logDataOperation(
  req: Request,
  eventType: AuditEventType,
  resourceType: ResourceType,
  resourceId: string,
  metadata?: any
): Promise<void> {
  try {
    await auditLogger.logDataOperation(
      eventType,
      req.userId || '',
      resourceType,
      resourceId,
      metadata || {},
      req.ip,
      req.headers['user-agent']
    );
  } catch (error) {
    console.error('Data operation audit logging error:', error);
  }
}

/**
 * Log sharing event
 */
export async function logSharing(
  req: Request,
  eventType: AuditEventType,
  resourceType: ResourceType,
  resourceId: string,
  metadata?: any
): Promise<void> {
  try {
    await auditLogger.logSharingEvent(
      eventType,
      req.userId || '',
      resourceType,
      resourceId,
      metadata || {},
      req.ip,
      req.headers['user-agent']
    );
  } catch (error) {
    console.error('Sharing audit logging error:', error);
  }
}

/**
 * Log security event
 */
export async function logSecurity(
  req: Request,
  eventType: AuditEventType,
  metadata?: any
): Promise<void> {
  try {
    await auditLogger.logSecurityEvent(
      eventType,
      req.userId || null,
      metadata || {},
      req.ip,
      req.headers['user-agent']
    );
  } catch (error) {
    console.error('Security audit logging error:', error);
  }
}

