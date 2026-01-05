/**
 * Alert rule engine and rule definitions
 */

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
    // This will be implemented with database checks
    // For now, return false (no alert)
    return false;
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
    // Check if login is from new country/IP
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
    // Check for high volume of read/export operations in short time
    return false;
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
    // Check for multiple decrypt.failed events
    return false;
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
    // Check for MFA disabled, recovery code changes, etc.
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
    // Check for unusual share link access patterns
    return false;
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

