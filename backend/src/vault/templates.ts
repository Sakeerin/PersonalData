import { v4 as uuidv4 } from 'uuid';
import { query } from '../utils/db';
import { TemplateRow, CreateTemplateData, UpdateTemplateData } from '../models/Template';

/**
 * Create a template
 */
export async function createTemplate(data: CreateTemplateData): Promise<string> {
  const templateId = uuidv4();

  await query(
    `INSERT INTO templates (id, name, type, schema)
     VALUES ($1, $2, $3, $4)`,
    [templateId, data.name, data.type, JSON.stringify(data.schema)]
  );

  return templateId;
}

/**
 * Get a template by ID
 */
export async function getTemplate(templateId: string): Promise<TemplateRow | null> {
  const result = await query('SELECT * FROM templates WHERE id = $1', [templateId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    schema: row.schema,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

/**
 * Get template by type
 */
export async function getTemplateByType(type: string): Promise<TemplateRow | null> {
  const result = await query('SELECT * FROM templates WHERE type = $1 ORDER BY created_at DESC LIMIT 1', [type]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    schema: row.schema,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

/**
 * List all templates
 */
export async function listTemplates(): Promise<TemplateRow[]> {
  const result = await query('SELECT * FROM templates ORDER BY name ASC', []);

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    type: row.type,
    schema: row.schema,
    created_at: row.created_at,
    updated_at: row.updated_at
  }));
}

/**
 * Update a template
 */
export async function updateTemplate(
  templateId: string,
  data: UpdateTemplateData
): Promise<boolean> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }

  if (data.schema !== undefined) {
    updates.push(`schema = $${paramIndex++}`);
    values.push(JSON.stringify(data.schema));
  }

  if (updates.length === 0) {
    return false;
  }

  updates.push(`updated_at = NOW()`);
  values.push(templateId);

  const result = await query(
    `UPDATE templates 
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}`,
    values
  );

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Delete a template
 */
export async function deleteTemplate(templateId: string): Promise<boolean> {
  const result = await query('DELETE FROM templates WHERE id = $1', [templateId]);

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Initialize default templates
 */
export async function initializeDefaultTemplates(): Promise<void> {
  const defaultTemplates = [
    {
      name: 'Identity Card',
      type: 'identity',
      schema: {
        fields: [
          { name: 'full_name', type: 'string', required: true },
          { name: 'id_number', type: 'string', required: true },
          { name: 'date_of_birth', type: 'date', required: true },
          { name: 'address', type: 'string', required: false },
          { name: 'issue_date', type: 'date', required: false },
          { name: 'expiry_date', type: 'date', required: false }
        ]
      }
    },
    {
      name: 'Passport',
      type: 'passport',
      schema: {
        fields: [
          { name: 'full_name', type: 'string', required: true },
          { name: 'passport_number', type: 'string', required: true },
          { name: 'nationality', type: 'string', required: true },
          { name: 'date_of_birth', type: 'date', required: true },
          { name: 'issue_date', type: 'date', required: false },
          { name: 'expiry_date', type: 'date', required: false }
        ]
      }
    },
    {
      name: 'Bank Account',
      type: 'bank_account',
      schema: {
        fields: [
          { name: 'bank_name', type: 'string', required: true },
          { name: 'account_number', type: 'string', required: true },
          { name: 'account_type', type: 'string', required: false },
          { name: 'routing_number', type: 'string', required: false }
        ]
      }
    },
    {
      name: 'Insurance Policy',
      type: 'insurance',
      schema: {
        fields: [
          { name: 'provider', type: 'string', required: true },
          { name: 'policy_number', type: 'string', required: true },
          { name: 'policy_type', type: 'string', required: false },
          { name: 'coverage_amount', type: 'number', required: false },
          { name: 'start_date', type: 'date', required: false },
          { name: 'end_date', type: 'date', required: false }
        ]
      }
    }
  ];

  for (const template of defaultTemplates) {
    // Check if template already exists
    const existing = await getTemplateByType(template.type);
    if (!existing) {
      await createTemplate(template);
    }
  }
}

