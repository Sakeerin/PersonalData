/**
 * Alert rule engine and rule definitions
 */

import { query } from '../utils/db';
import { AuditEventType } from '../audit/events';

export type AlertSeverity = 'info' | 'warn' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  enabled: boolean;
  check: (context: AlertContext) => Promise<boolean>;
}

export interface AlertContext {
  userId: string;
  eventType?: string;
  metadata?: any;
  timestamp: Date;
}

export interface Alert {
  id: string;
  user_id: string;
  rule_id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  metadata: any;
  created_at: Date;
}

/**
 * Alert rule: New device login
 */
export const newDeviceLoginRule: AlertRule = {
  id: 'new_device_login',
  name: 'New Device Login',
  description: 'Login from a new or untrusted device',
  severity: 'warn',
  enabled: true,
  check: async (context: AlertContext) => {
    if (context.eventType !== AuditEventType.USER_LOGIN) {
      return false;
    }

    // Check if device is trusted
    const deviceId = context.metadata?.device_id;
    if (!deviceId) {
      return false;
    }

    const deviceResult = await query(
      'SELECT trusted FROM devices WHERE id = $1 AND user_id = $2',
      [deviceId, context.userId]
    );

    if (deviceResult.rows.length === 0) {
      // New device
      return true;
    }

    // Check if device is trusted
    const device = deviceResult.rows[0];
    return !device.trusted;
  }
};

/**
 * Alert rule: Unusual geographic location
 */
export const unusualGeoRule: AlertRule = {
  id: 'unusual_geo',
  name: 'Unusual Geographic Location',
  description: 'Login from an unusual geographic location',
  severity: 'warn',
  enabled: true,
  check: async (context: AlertContext) => {
    if (context.eventType !== AuditEventType.USER_LOGIN) {
      return false;
    }

    const country = context.metadata?.geo_location?.country;
    if (!country) {
      return false;
    }

    // Get recent logins for this user
    const recentLogins = await query(
      `SELECT metadata->>'geo_location'->>'country' as country
       FROM audit_logs
       WHERE user_id = $1
       AND event_type = $2
       AND timestamp > NOW() - INTERVAL '30 days'
       ORDER BY timestamp DESC
       LIMIT 10`,
      [context.userId, AuditEventType.USER_LOGIN]
    );

    const knownCountries = new Set(
      recentLogins.rows
        .map((r: any) => r.country)
        .filter((c: any) => c)
    );

    // If this is a new country and we have previous logins
    if (knownCountries.size > 0 && !knownCountries.has(country)) {
      return true;
    }

    return false;
  }
};

/**
 * Alert rule: Burst access/export
 */
export const burstAccessRule: AlertRule = {
  id: 'burst_access',
  name: 'Burst Access Pattern',
  description: 'Unusual burst of data access or exports',
  severity: 'critical',
  enabled: true,
  check: async (context: AlertContext) => {
    // Check for high volume of read/export operations in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const accessCount = await query(
      `SELECT COUNT(*) as count
       FROM audit_logs
       WHERE user_id = $1
       AND event_type IN ($2, $3, $4)
       AND timestamp > $5`,
      [
        context.userId,
        AuditEventType.RECORD_READ,
        AuditEventType.FILE_DOWNLOADED,
        AuditEventType.DATA_EXPORTED,
        fiveMinutesAgo.toISOString()
      ]
    );

    const count = parseInt(accessCount.rows[0].count, 10);
    // Alert if more than 50 operations in 5 minutes
    return count > 50;
  }
};

/**
 * Alert rule: Repeated decrypt failures
 */
export const decryptFailuresRule: AlertRule = {
  id: 'decrypt_failures',
  name: 'Repeated Decrypt Failures',
  description: 'Multiple failed decryption attempts',
  severity: 'critical',
  enabled: true,
  check: async (context: AlertContext) => {
    if (context.eventType !== AuditEventType.DECRYPT_FAILED) {
      return false;
    }

    // Check for multiple decrypt failures in last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const failureCount = await query(
      `SELECT COUNT(*) as count
       FROM audit_logs
       WHERE user_id = $1
       AND event_type = $2
       AND timestamp > $3`,
      [context.userId, AuditEventType.DECRYPT_FAILED, tenMinutesAgo.toISOString()]
    );

    const count = parseInt(failureCount.rows[0].count, 10);
    // Alert if more than 3 failures in 10 minutes
    return count >= 3;
  }
};

/**
 * Alert rule: Policy changes
 */
export const policyChangeRule: AlertRule = {
  id: 'policy_change',
  name: 'Critical Policy Change',
  description: 'Important security policy changed (MFA disabled, recovery changed)',
  severity: 'warn',
  enabled: true,
  check: async (context: AlertContext) => {
    if (context.eventType === AuditEventType.MFA_DISABLED) {
      return true;
    }

    // Check for recovery code changes
    if (context.metadata?.recovery_codes_changed) {
      return true;
    }

    return false;
  }
};

/**
 * Alert rule: Share link abuse
 */
export const shareLinkAbuseRule: AlertRule = {
  id: 'share_link_abuse',
  name: 'Share Link Abuse',
  description: 'Suspicious patterns in share link access',
  severity: 'warn',
  enabled: true,
  check: async (context: AlertContext) => {
    if (context.eventType !== AuditEventType.SHARE_ACCESSED) {
      return false;
    }

    const shareToken = context.metadata?.share_token;
    if (!shareToken) {
      return false;
    }

    // Check for multiple accesses from different IPs in short time
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const accessResult = await query(
      `SELECT COUNT(DISTINCT ip_address) as ip_count, COUNT(*) as access_count
       FROM audit_logs
       WHERE event_type = $1
       AND metadata->>'share_token' = $2
       AND timestamp > $3`,
      [AuditEventType.SHARE_ACCESSED, shareToken, oneHourAgo.toISOString()]
    );

    const ipCount = parseInt(accessResult.rows[0].ip_count, 10);
    const accessCount = parseInt(accessResult.rows[0].access_count, 10);

    // Alert if accessed from 5+ different IPs or 20+ times
    return ipCount >= 5 || accessCount >= 20;
  }
};

/**
 * Alert rule registry
 */
export const alertRules: Record<string, AlertRule> = {
  new_device_login: newDeviceLoginRule,
  unusual_geo: unusualGeoRule,
  burst_access: burstAccessRule,
  decrypt_failures: decryptFailuresRule,
  policy_change: policyChangeRule,
  share_link_abuse: shareLinkAbuseRule
};

/**
 * Get alert rule by ID
 */
export function getAlertRule(ruleId: string): AlertRule | undefined {
  return alertRules[ruleId];
}

/**
 * Get all enabled alert rules
 */
export function getEnabledAlertRules(): AlertRule[] {
  return Object.values(alertRules).filter(rule => rule.enabled);
}
