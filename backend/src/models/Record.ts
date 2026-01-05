/**
 * Record database model (structured data)
 */

export interface RecordRow {
  id: string;
  user_id: string;
  type: string;
  encrypted_data: Buffer;
  encrypted_metadata: any; // JSONB
  tags: string[];
  labels: string[];
  retention_policy: any | null; // JSONB
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CreateRecordData {
  user_id: string;
  type: string;
  encrypted_data: Buffer;
  encrypted_metadata: any;
  tags?: string[];
  labels?: string[];
  retention_policy?: any;
}

export interface UpdateRecordData {
  type?: string;
  encrypted_data?: Buffer;
  encrypted_metadata?: any;
  tags?: string[];
  labels?: string[];
  retention_policy?: any;
}


