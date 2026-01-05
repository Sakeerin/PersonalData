/**
 * Alert service - processes alerts and triggers responses
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../utils/db';
import { AlertSeverity, AlertStatus, AlertRule, Alert } from '../alerts/rules';
import { notificationManager, createNotificationFromAlert } from '../alerts/notifier';
import { createIncident, addIncidentAction } from '../alerts/incident';
import { AuditEventType } from '../audit/events';
import * as auditLogger from '../audit/logger';
import { getDB } from '../utils/db';

export interface AlertRow {
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
 * Create an alert
 */
export async function createAlert(
  userId: string,
  ruleId: string,
  message: string,
  severity: AlertSeverity,
  metadata: any = {}
): Promise<string> {
  const alertId = uuidv4();

  await query(
    `INSERT INTO alerts (id, user_id, rule_id, severity, status, message, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [alertId, userId, ruleId, severity, 'active', message, JSON.stringify(metadata)]
  );

  // Send notifications
  const alert = await getAlert(alertId);
  if (alert) {
    await sendAlertNotifications(alert);
  }

  // Create incident for critical alerts
  if (severity === 'critical') {
    const incidentId = await createIncident({
      alert_id: alertId,
      action_taken: ['Alert created']
    });
  }

  // Log alert creation
  await auditLogger.logSecurityEvent(
    AuditEventType.POLICY_VIOLATION,
    userId,
    { alert_id: alertId, rule_id: ruleId, severity },
    undefined,
    undefined
  );

  return alertId;
}

/**
 * Get alert by ID
 */
export async function getAlert(alertId: string): Promise<AlertRow | null> {
  const result = await query('SELECT * FROM alerts WHERE id = $1', [alertId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    rule_id: row.rule_id,
    severity: row.severity,
    status: row.status,
    message: row.message,
    metadata: row.metadata,
    created_at: row.created_at
  };
}

/**
 * List alerts for a user
 */
export async function listAlerts(
  userId: string,
  severity?: AlertSeverity,
  status?: AlertStatus,
  limit: number = 50
): Promise<AlertRow[]> {
  let queryText = 'SELECT * FROM alerts WHERE user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;

  if (severity) {
    queryText += ` AND severity = $${paramIndex++}`;
    params.push(severity);
  }

  if (status) {
    queryText += ` AND status = $${paramIndex++}`;
    params.push(status);
  }

  queryText += ' ORDER BY created_at DESC LIMIT $' + paramIndex;
  params.push(limit);

  const result = await query(queryText, params);

  return result.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    rule_id: row.rule_id,
    severity: row.severity,
    status: row.status,
    message: row.message,
    metadata: row.metadata,
    created_at: row.created_at
  }));
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
  const result = await query(
    `UPDATE alerts 
     SET status = 'acknowledged'
     WHERE id = $1 AND user_id = $2 AND status = 'active'`,
    [alertId, userId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Resolve an alert
 */
export async function resolveAlert(alertId: string, userId: string): Promise<boolean> {
  const result = await query(
    `UPDATE alerts 
     SET status = 'resolved'
     WHERE id = $1 AND user_id = $2`,
    [alertId, userId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Send notifications for an alert
 */
async function sendAlertNotifications(alert: AlertRow): Promise<void> {
  const notification = createNotificationFromAlert(alert, ['in_app', 'email']);

  // Always send in-app notification
  await notificationManager.send({ ...notification, channel: 'in_app' });

  // Send email for warn/critical
  if (alert.severity === 'warn' || alert.severity === 'critical') {
    await notificationManager.send({ ...notification, channel: 'email' });
  }

  // Send push for critical
  if (alert.severity === 'critical') {
    await notificationManager.send({ ...notification, channel: 'push' });
  }
}

/**
 * Check alert rules and create alerts if conditions are met
 */
export async function checkAlertRules(userId: string, context: any): Promise<string[]> {
  const { getEnabledAlertRules } = await import('../alerts/rules');
  const rules = getEnabledAlertRules();
  const createdAlerts: string[] = [];

  for (const rule of rules) {
    try {
      const shouldAlert = await rule.check(context);
      if (shouldAlert) {
        const alertId = await createAlert(
          userId,
          rule.id,
          rule.description,
          rule.severity,
          context.metadata || {}
        );
        createdAlerts.push(alertId);
      }
    } catch (error) {
      console.error(`Error checking alert rule ${rule.id}:`, error);
    }
  }

  return createdAlerts;
}

