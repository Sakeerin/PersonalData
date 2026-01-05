/**
 * User database model
 */

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  mfa_secret: string | null;
  mfa_enabled: boolean;
  recovery_codes_hash: string[] | null; // JSON array of hashed codes
  kek_salt: Buffer;
  key_version: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  password_hash: string;
  kek_salt: Buffer;
}

export interface UpdateUserData {
  email?: string;
  password_hash?: string;
  mfa_secret?: string | null;
  mfa_enabled?: boolean;
  recovery_codes_hash?: string[] | null;
  kek_salt?: Buffer;
  key_version?: number;
}


