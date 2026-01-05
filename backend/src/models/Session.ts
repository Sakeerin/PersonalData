/**
 * Session database model
 */

export interface SessionRow {
  id: string;
  user_id: string;
  device_id: string;
  refresh_token_hash: string;
  access_token_jti: string;
  expires_at: Date;
  created_at: Date;
}

export interface CreateSessionData {
  user_id: string;
  device_id: string;
  refresh_token_hash: string;
  access_token_jti: string;
  expires_at: Date;
}

export interface UpdateSessionData {
  refresh_token_hash?: string;
  access_token_jti?: string;
  expires_at?: Date;
}


