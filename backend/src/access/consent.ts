import { v4 as uuidv4 } from 'uuid';
import { query } from '../utils/db';

export interface ConsentRow {
  id: string;
  user_id: string;
  subject_id: string; // Delegate user ID or app ID
  resource_ids: string[];
  purpose: string | null;
  granted_at: Date;
  expires_at: Date | null;
  withdrawn_at: Date | null;
}

export interface CreateConsentData {
  user_id: string;
  subject_id: string;
  resource_ids: string[];
  purpose?: string;
  expires_at?: Date;
}

/**
 * Create a consent record
 */
export async function createConsent(data: CreateConsentData): Promise<string> {
  const consentId = uuidv4();

  await query(
    `INSERT INTO consents (id, user_id, subject_id, resource_ids, purpose, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      consentId,
      data.user_id,
      data.subject_id,
      data.resource_ids,
      data.purpose || null,
      data.expires_at || null
    ]
  );

  return consentId;
}

/**
 * Get consent by ID
 */
export async function getConsent(consentId: string, userId: string): Promise<ConsentRow | null> {
  const result = await query(
    'SELECT * FROM consents WHERE id = $1 AND user_id = $2',
    [consentId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    subject_id: row.subject_id,
    resource_ids: row.resource_ids || [],
    purpose: row.purpose,
    granted_at: row.granted_at,
    expires_at: row.expires_at,
    withdrawn_at: row.withdrawn_at
  };
}

/**
 * Check if consent is valid
 */
export function isConsentValid(consent: ConsentRow): boolean {
  // Check if withdrawn
  if (consent.withdrawn_at) {
    return false;
  }

  // Check if expired
  if (consent.expires_at && new Date(consent.expires_at) < new Date()) {
    return false;
  }

  return true;
}

/**
 * Check if user has consented to resource access
 */
export async function checkConsent(
  userId: string,
  subjectId: string,
  resourceId: string
): Promise<{ consented: boolean; consent?: ConsentRow }> {
  const result = await query(
    `SELECT * FROM consents 
     WHERE user_id = $1 
     AND subject_id = $2 
     AND $3 = ANY(resource_ids)
     AND withdrawn_at IS NULL
     AND (expires_at IS NULL OR expires_at > NOW())`,
    [userId, subjectId, resourceId]
  );

  if (result.rows.length === 0) {
    return { consented: false };
  }

  const row = result.rows[0];
  const consent: ConsentRow = {
    id: row.id,
    user_id: row.user_id,
    subject_id: row.subject_id,
    resource_ids: row.resource_ids || [],
    purpose: row.purpose,
    granted_at: row.granted_at,
    expires_at: row.expires_at,
    withdrawn_at: row.withdrawn_at
  };

  return { consented: true, consent };
}

/**
 * List consents for a user
 */
export async function listConsents(userId: string): Promise<ConsentRow[]> {
  const result = await query(
    'SELECT * FROM consents WHERE user_id = $1 ORDER BY granted_at DESC',
    [userId]
  );

  return result.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    subject_id: row.subject_id,
    resource_ids: row.resource_ids || [],
    purpose: row.purpose,
    granted_at: row.granted_at,
    expires_at: row.expires_at,
    withdrawn_at: row.withdrawn_at
  }));
}

/**
 * Withdraw consent
 */
export async function withdrawConsent(consentId: string, userId: string): Promise<boolean> {
  const result = await query(
    `UPDATE consents 
     SET withdrawn_at = NOW()
     WHERE id = $1 AND user_id = $2 AND withdrawn_at IS NULL`,
    [consentId, userId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Get consent history for a resource
 */
export async function getConsentHistory(
  userId: string,
  resourceId: string
): Promise<ConsentRow[]> {
  const result = await query(
    `SELECT * FROM consents 
     WHERE user_id = $1 
     AND $2 = ANY(resource_ids)
     ORDER BY granted_at DESC`,
    [userId, resourceId]
  );

  return result.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    subject_id: row.subject_id,
    resource_ids: row.resource_ids || [],
    purpose: row.purpose,
    granted_at: row.granted_at,
    expires_at: row.expires_at,
    withdrawn_at: row.withdrawn_at
  }));
}

