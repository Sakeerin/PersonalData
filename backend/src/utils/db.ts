import { Pool, PoolClient } from 'pg';

/**
 * Database connection pool
 * Initialize this with your database connection string
 */
let pool: Pool | null = null;

/**
 * Initialize database pool
 * @param connectionString PostgreSQL connection string
 */
export function initDB(connectionString: string): void {
  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });
}

/**
 * Get database pool
 * @returns Database pool
 */
export function getDB(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return pool;
}

/**
 * Execute a database query
 * @param query SQL query
 * @param params Query parameters
 * @returns Query result
 */
export async function query(text: string, params?: any[]) {
  return getDB().query(text, params);
}

/**
 * Execute a transaction
 * @param callback Transaction callback
 * @returns Transaction result
 */
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDB().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}


