/**
 * Audit event types and definitions
 */

export enum AuditEventType {
  // Authentication events
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_REGISTER = 'user.register',
  MFA_ENABLED = 'mfa.enabled',
  MFA_DISABLED = 'mfa.disabled',
  MFA_VERIFIED = 'mfa.verified',
  PASSWORD_CHANGED = 'password.changed',
  RECOVERY_CODE_USED = 'recovery_code.used',

  // Device events
  DEVICE_REGISTERED = 'device.registered',
  DEVICE_REVOKED = 'device.revoked',
  DEVICE_TRUSTED = 'device.trusted',

  // Session events
  SESSION_CREATED = 'session.created',
  SESSION_REVOKED = 'session.revoked',
  SESSION_EXPIRED = 'session.expired',

  // Data operations
  RECORD_CREATED = 'record.created',
  RECORD_READ = 'record.read',
  RECORD_UPDATED = 'record.updated',
  RECORD_DELETED = 'record.deleted',
  FILE_UPLOADED = 'file.uploaded',
  FILE_DOWNLOADED = 'file.downloaded',
  FILE_DELETED = 'file.deleted',

  // Sharing events
  SHARE_CREATED = 'share.created',
  SHARE_ACCESSED = 'share.accessed',
  SHARE_REVOKED = 'share.revoked',
  SHARE_EXPIRED = 'share.expired',

  // Consent events
  CONSENT_GRANTED = 'consent.granted',
  CONSENT_WITHDRAWN = 'consent.withdrawn',
  CONSENT_EXPIRED = 'consent.expired',

  // Key management events
  KEY_ROTATED = 'key.rotated',
  KEY_DELETED = 'key.deleted',

  // Export events
  DATA_EXPORTED = 'data.exported',
  AUDIT_EXPORTED = 'audit.exported',

  // Security events
  DECRYPT_FAILED = 'decrypt.failed',
  POLICY_VIOLATION = 'policy.violation',
  UNAUTHORIZED_ACCESS = 'unauthorized.access',
  RATE_LIMIT_EXCEEDED = 'rate_limit.exceeded',

  // Admin events
  ACCOUNT_DELETED = 'account.deleted',
  PANIC_MODE_ACTIVATED = 'panic_mode.activated'
}

export type ResourceType = 'user' | 'record' | 'file' | 'share' | 'device' | 'session' | 'consent' | 'key';

export interface AuditEventMetadata {
  // Resource information (no plaintext PII)
  resource_type?: ResourceType;
  resource_id?: string;
  
  // Additional context (safe metadata only)
  device_id?: string;
  ip_address?: string;
  user_agent?: string;
  
  // Operation details
  action?: string;
  result?: 'success' | 'failure';
  error_code?: string;
  
  // Sharing/consent details
  share_type?: string;
  share_token?: string; // Hashed or partial only
  delegate_id?: string;
  
  // Security details
  anomaly_detected?: boolean;
  severity?: 'low' | 'medium' | 'high';
  
  // Custom metadata (minimal, no sensitive data)
  [key: string]: any;
}

export interface AuditEvent {
  id?: string;
  user_id: string | null;
  event_type: AuditEventType;
  resource_type?: ResourceType;
  resource_id?: string;
  action: string;
  metadata: AuditEventMetadata;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
}

/**
 * Create audit event metadata (ensures no plaintext PII)
 */
export function createAuditMetadata(metadata: Partial<AuditEventMetadata>): AuditEventMetadata {
  // Sanitize metadata - remove any potential PII
  const sanitized: AuditEventMetadata = {};

  // Only include safe fields
  if (metadata.resource_type) sanitized.resource_type = metadata.resource_type;
  if (metadata.resource_id) sanitized.resource_id = metadata.resource_id;
  if (metadata.device_id) sanitized.device_id = metadata.device_id;
  if (metadata.action) sanitized.action = metadata.action;
  if (metadata.result) sanitized.result = metadata.result;
  if (metadata.error_code) sanitized.error_code = metadata.error_code;
  if (metadata.share_type) sanitized.share_type = metadata.share_type;
  if (metadata.anomaly_detected !== undefined) sanitized.anomaly_detected = metadata.anomaly_detected;
  if (metadata.severity) sanitized.severity = metadata.severity;

  return sanitized;
}

