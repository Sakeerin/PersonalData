/**
 * Data template model
 */

export interface TemplateRow {
  id: string;
  name: string;
  type: string;
  schema: any; // JSONB - defines fields and structure
  created_at: Date;
  updated_at: Date;
}

export interface CreateTemplateData {
  name: string;
  type: string;
  schema: any;
}

export interface UpdateTemplateData {
  name?: string;
  schema?: any;
}


