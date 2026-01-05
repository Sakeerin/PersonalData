import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { query } from '../utils/db';
import { AuditEvent, AuditEventType, ResourceType, createAuditMetadata } from './events';

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  event_type: string;
  resource_type: string | null;
  resource_id: string | null;
  action: string;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: Date;
  hash_chain: string | null;
}

/**
 * Calculate hash chain for tamper detection (optional but recommended)
 */
function calculateHashChain(previousHash: string | null, event: AuditEvent): string {
  const eventData = JSON.stringify({
    id: event.id,
    user_id: event.user_id,
    event_type: event.event_type,
    resource_type: event.resource_type,
    resource_id: event.resource_id,
    action: event.action,
    timestamp: event.timestamp.toISOString()
  });

  if (previousHash) {
    return crypto.createHash('sha256').update(previousHash + eventData).digest('hex');
  }
  return crypto.createHash('sha256').update(eventData).digest('hex');
}

/**
 * Log an audit event (append-only)
 */
export async function logEvent(event: AuditEvent): Promise<string> {
  const eventId = event.id || uuidv4();

  // Get previous hash for chain
  const previousHashResult = await query(
    'SELECT hash_chain FROM audit_logs ORDER BY timestamp DESC, id DESC LIMIT 1',
    []
  );
  const previousHash = previousHashResult.rows[0]?.hash_chain || null;

  // Calculate hash chain
  const hashChain = calculateHashChain(previousHash, event);

  // Insert audit log (append-only)
  await query(
    `INSERT INTO audit_logs 
     (id, user_id, event_type, resource_type, resource_id, action, metadata, ip_address, user_agent, timestamp, hash_chain)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      eventId,
      event.user_id,
      event.event_type,
      event.resource_type || null,
      event.resource_id || null,
      event.action,
      JSON.stringify(event.metadata),
      event.ip_address || null,
      event.user_agent || null,
      event.timestamp || new Date(),
      hashChain
    ]
  );

  return eventId;
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  eventType: AuditEventType.USER_LOGIN | AuditEventType.USER_LOGOUT | AuditEventType.USER_REGISTER,
  userId: string | null,
  metadata: any,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  return await logEvent({
    user_id: userId,
    event_type: eventType,
    action: eventType.split('.')[1],
    metadata: createAuditMetadata(metadata),
    ip_address: ipAddress,
    user_agent: userAgent,
    timestamp: new Date()
  });
}

/**
 * Log data operation event
 */
export async function logDataOperation(
  eventType: AuditEventType,
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  metadata: any,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  return await logEvent({
    user_id: userId,
    event_type: eventType,
    resource_type: resourceType,
    resource_id: resourceId,
    action: eventType.split('.')[1],
    metadata: createAuditMetadata(metadata),
    ip_address: ipAddress,
    user_agent: userAgent,
    timestamp: new Date()
  });
}

/**
 * Log sharing event
 */
export async function logSharingEvent(
  eventType: AuditEventType,
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  metadata: any,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  return await logEvent({
    user_id: userId,
    event_type: eventType,
    resource_type: resourceType,
    resource_id: resourceId,
    action: eventType.split('.')[1],
    metadata: createAuditMetadata(metadata),
    ip_address: ipAddress,
    user_agent: userAgent,
    timestamp: new Date()
  });
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  eventType: AuditEventType,
  userId: string | null,
  metadata: any,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  return await logEvent({
    user_id: userId,
    event_type: eventType,
    action: eventType.split('.')[1],
    metadata: createAuditMetadata(metadata),
    ip_address: ipAddress,
    user_agent: userAgent,
    timestamp: new Date()
  });
}

/**
 * Query audit logs with filters
 */
export interface AuditLogQuery {
  userId?: string;
  eventType?: AuditEventType | string;
  resourceType?: ResourceType | string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  action?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogQueryResult {
  logs: AuditLogRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export async function queryAuditLogs(query: AuditLogQuery): Promise<AuditLogQueryResult> {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 50, 100);
  const offset = (page - 1) * limit;

  let whereConditions: string[] = [];
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (query.userId !== undefined) {
    if (query.userId === null) {
      whereConditions.push('user_id IS NULL');
    } else {
      whereConditions.push(`user_id = $${paramIndex++}`);
      queryParams.push(query.userId);
    }
  }

  if (query.eventType) {
    whereConditions.push(`event_type = $${paramIndex++}`);
    queryParams.push(query.eventType);
  }

  if (query.resourceType) {
    whereConditions.push(`resource_type = $${paramIndex++}`);
    queryParams.push(query.resourceType);
  }

  if (query.resourceId) {
    whereConditions.push(`resource_id = $${paramIndex++}`);
    queryParams.push(query.resourceId);
  }

  if (query.startDate) {
    whereConditions.push(`timestamp >= $${paramIndex++}`);
    queryParams.push(query.startDate);
  }

  if (query.endDate) {
    whereConditions.push(`timestamp <= $${paramIndex++}`);
    queryParams.push(query.endDate);
  }

  if (query.ipAddress) {
    whereConditions.push(`ip_address = $${paramIndex++}`);
    queryParams.push(query.ipAddress);
  }

  if (query.action) {
    whereConditions.push(`action = $${paramIndex++}`);
    queryParams.push(query.action);
  }

  const whereClause = whereConditions.length > 0 
    ? 'WHERE ' + whereConditions.join(' AND ')
    : '';

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].count, 10);
  const total_pages = Math.ceil(total / limit);

  // Get logs
  const logsResult = await query(
    `SELECT * FROM audit_logs 
     ${whereClause}
     ORDER BY timestamp DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...queryParams, limit, offset]
  );

  const logs = logsResult.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    event_type: row.event_type,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    action: row.action,
    metadata: row.metadata,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    timestamp: row.timestamp,
    hash_chain: row.hash_chain
  }));

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      total_pages
    }
  };
}

/**
 * Export audit logs (for DSR)
 */
export async function exportAuditLogs(
  userId: string,
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  const queryResult = await queryAuditLogs({
    userId,
    limit: 10000 // Large limit for export
  });

  if (format === 'json') {
    return JSON.stringify(queryResult.logs, null, 2);
  } else {
    // CSV format
    const headers = ['id', 'timestamp', 'event_type', 'action', 'resource_type', 'resource_id', 'ip_address'];
    const rows = queryResult.logs.map(log => [
      log.id,
      log.timestamp.toISOString(),
      log.event_type,
      log.action,
      log.resource_type || '',
      log.resource_id || '',
      log.ip_address || ''
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }
}

/**
 * Verify audit log integrity (check hash chain)
 */
export async function verifyAuditLogIntegrity(): Promise<{ valid: boolean; invalidCount: number }> {
  const result = await query(
    'SELECT * FROM audit_logs ORDER BY timestamp ASC, id ASC',
    []
  );

  let previousHash: string | null = null;
  let invalidCount = 0;

  for (const row of result.rows) {
    const eventData = JSON.stringify({
      id: row.id,
      user_id: row.user_id,
      event_type: row.event_type,
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      action: row.action,
      timestamp: row.timestamp.toISOString()
    });

    const expectedHash = previousHash
      ? crypto.createHash('sha256').update(previousHash + eventData).digest('hex')
      : crypto.createHash('sha256').update(eventData).digest('hex');

    if (row.hash_chain !== expectedHash) {
      invalidCount++;
    }

    previousHash = row.hash_chain;
  }

  return {
    valid: invalidCount === 0,
    invalidCount
  };
}

