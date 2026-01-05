/**
 * Incident management for alerts
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../utils/db';
import { AlertSeverity } from './rules';

export interface Incident {
  id: string;
  alert_id: string;
  action_taken: string[];
  resolved_at: Date | null;
  created_at: Date;
}

export interface CreateIncidentData {
  alert_id: string;
  action_taken: string[];
}

/**
 * Create an incident from an alert
 */
export async function createIncident(data: CreateIncidentData): Promise<string> {
  const incidentId = uuidv4();

  await query(
    `INSERT INTO incidents (id, alert_id, action_taken)
     VALUES ($1, $2, $3)`,
    [incidentId, data.alert_id, data.action_taken]
  );

  return incidentId;
}

/**
 * Get incident by ID
 */
export async function getIncident(incidentId: string): Promise<Incident | null> {
  const result = await query('SELECT * FROM incidents WHERE id = $1', [incidentId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    alert_id: row.alert_id,
    action_taken: row.action_taken || [],
    resolved_at: row.resolved_at,
    created_at: row.created_at
  };
}

/**
 * Get incident by alert ID
 */
export async function getIncidentByAlert(alertId: string): Promise<Incident | null> {
  const result = await query('SELECT * FROM incidents WHERE alert_id = $1', [alertId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    alert_id: row.alert_id,
    action_taken: row.action_taken || [],
    resolved_at: row.resolved_at,
    created_at: row.created_at
  };
}

/**
 * List incidents for a user
 */
export async function listIncidents(userId: string, limit: number = 50): Promise<Incident[]> {
  const result = await query(
    `SELECT i.* FROM incidents i
     JOIN alerts a ON i.alert_id = a.id
     WHERE a.user_id = $1
     ORDER BY i.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map(row => ({
    id: row.id,
    alert_id: row.alert_id,
    action_taken: row.action_taken || [],
    resolved_at: row.resolved_at,
    created_at: row.created_at
  }));
}

/**
 * Resolve an incident
 */
export async function resolveIncident(incidentId: string): Promise<boolean> {
  const result = await query(
    `UPDATE incidents 
     SET resolved_at = NOW()
     WHERE id = $1 AND resolved_at IS NULL`,
    [incidentId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Add action to incident
 */
export async function addIncidentAction(incidentId: string, action: string): Promise<boolean> {
  const result = await query(
    `UPDATE incidents 
     SET action_taken = array_append(action_taken, $1)
     WHERE id = $2`,
    [action, incidentId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

