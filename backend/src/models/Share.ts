/**
 * Share database model
 */

export interface ShareRow {
  id: string;
  owner_id: string;
  resource_type: string;
  resource_id: string;
  share_type: string;
  token: string;
  expires_at: Date | null;
  purpose: string | null;
  created_at: Date;
}

export interface CreateShareData {
  owner_id: string;
  resource_type: string;
  resource_id: string;
  share_type: string;
  token: string;
  expires_at?: Date | null;
  purpose?: string | null;
}

export interface UpdateShareData {
  expires_at?: Date | null;
  purpose?: string | null;
}

