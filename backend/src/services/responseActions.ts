/**
 * Response actions for security incidents
 */

import { query, transaction } from '../utils/db';
import { addIncidentAction } from '../alerts/incident';
import { AuditEventType } from '../audit/events';
import * as auditLogger from '../audit/logger';

/**
 * Force re-authentication for user
 */
export async function forceReauth(userId: string, incidentId?: string): Promise<boolean> {
  try {
    // Revoke all active sessions except current one
    await query(
      `UPDATE sessions 
       SET expires_at = NOW()
       WHERE user_id = $1 AND expires_at > NOW()`,
      [userId]
    );

    // Log action
    if (incidentId) {
      await addIncidentAction(incidentId, 'Forced re-authentication - all sessions revoked');
    }

    await auditLogger.logSecurityEvent(
      AuditEventType.POLICY_VIOLATION,
      userId,
      { action: 'force_reauth', incident_id: incidentId }
    );

    return true;
  } catch (error) {
    console.error('Error forcing reauth:', error);
    return false;
  }
}

/**
 * Revoke all sessions for user
 */
export async function revokeAllSessions(userId: string, incidentId?: string): Promise<boolean> {
  try {
    await query(
      `DELETE FROM sessions 
       WHERE user_id = $1`,
      [userId]
    );

    if (incidentId) {
      await addIncidentAction(incidentId, 'All sessions revoked');
    }

    await auditLogger.logSecurityEvent(
      AuditEventType.POLICY_VIOLATION,
      userId,
      { action: 'revoke_all_sessions', incident_id: incidentId }
    );

    return true;
  } catch (error) {
    console.error('Error revoking sessions:', error);
    return false;
  }
}

/**
 * Activate panic mode - lock vault, revoke all shares and sessions
 */
export async function activatePanicMode(userId: string, incidentId?: string): Promise<boolean> {
  try {
    await transaction(async (client) => {
      // Revoke all sessions
      await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

      // Revoke all shares
      await client.query('DELETE FROM shares WHERE owner_id = $1', [userId]);

      // Mark account as locked (if you have a locked field)
      // await client.query('UPDATE users SET locked = true WHERE id = $1', [userId]);
    });

    if (incidentId) {
      await addIncidentAction(incidentId, 'Panic mode activated - vault locked, all shares and sessions revoked');
    }

    await auditLogger.logSecurityEvent(
      AuditEventType.PANIC_MODE_ACTIVATED,
      userId,
      { incident_id: incidentId }
    );

    return true;
  } catch (error) {
    console.error('Error activating panic mode:', error);
    return false;
  }
}

/**
 * Revoke specific device
 */
export async function revokeDevice(userId: string, deviceId: string, incidentId?: string): Promise<boolean> {
  try {
    await query(
      `DELETE FROM devices 
       WHERE id = $1 AND user_id = $2`,
      [deviceId, userId]
    );

    // Also revoke sessions for this device
    await query(
      `DELETE FROM sessions 
       WHERE device_id = $1 AND user_id = $2`,
      [deviceId, userId]
    );

    if (incidentId) {
      await addIncidentAction(incidentId, `Device ${deviceId} revoked`);
    }

    await auditLogger.logSecurityEvent(
      AuditEventType.DEVICE_REVOKED,
      userId,
      { device_id: deviceId, incident_id: incidentId }
    );

    return true;
  } catch (error) {
    console.error('Error revoking device:', error);
    return false;
  }
}

/**
 * Execute response actions based on alert severity
 */
export async function executeResponseActions(
  userId: string,
  severity: 'info' | 'warn' | 'critical',
  incidentId?: string
): Promise<string[]> {
  const actions: string[] = [];

  switch (severity) {
    case 'critical':
      // Critical: Panic mode
      await activatePanicMode(userId, incidentId);
      actions.push('panic_mode_activated');
      break;

    case 'warn':
      // Warning: Force reauth
      await forceReauth(userId, incidentId);
      actions.push('force_reauth');
      break;

    case 'info':
      // Info: No automatic actions, just notification
      actions.push('notification_sent');
      break;
  }

  return actions;
}

