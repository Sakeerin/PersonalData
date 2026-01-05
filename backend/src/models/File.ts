/**
 * File database model (unstructured data)
 */

export interface FileRow {
  id: string;
  user_id: string;
  encrypted_file_path: string;
  encrypted_metadata: any; // JSONB
  mime_type: string;
  size: number;
  checksum: string;
  retention_policy: any | null; // JSONB
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CreateFileData {
  user_id: string;
  encrypted_file_path: string;
  encrypted_metadata: any;
  mime_type: string;
  size: number;
  checksum: string;
  retention_policy?: any;
}

export interface UpdateFileData {
  encrypted_metadata?: any;
  retention_policy?: any;
}


