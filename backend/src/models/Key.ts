/**
 * Database model for key management
 * These interfaces represent the database schema for keys
 */

export interface UserKeyRow {
  id: string;
  user_id: string;
  kek_salt: Buffer; // Salt for KEK derivation
  key_version: number;
  created_at: Date;
  updated_at: Date;
}

export interface DataKeyRow {
  id: string;
  record_id: string | null;
  file_id: string | null;
  dek_wrapped: Buffer; // Serialized encrypted DEK
  key_id: string; // Reference to user_keys.id
  created_at: Date;
}

export interface DeviceKeyRow {
  id: string;
  user_id: string;
  device_id: string;
  device_key_wrapped: Buffer; // Device key wrapped with KEK
  created_at: Date;
}


