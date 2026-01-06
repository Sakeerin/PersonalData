/**
 * Consent database model
 */

export interface ConsentRow {
  id: string;
  user_id: string;
  subject_id: string;
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
  purpose?: string | null;
  expires_at?: Date | null;
}

export interface UpdateConsentData {
  withdrawn_at?: Date | null;
}

