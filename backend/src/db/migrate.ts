import fs from 'fs';
import path from 'path';
import { getDB } from '../utils/db';

/**
 * Run database migrations
 */
export async function runMigrations(): Promise<void> {
  const db = getDB();
  const migrationsDir = path.join(__dirname, 'migrations');

  // Read migration files in order
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`Running migration: ${file}`);

    try {
      await db.query(sql);
      console.log(`✓ Migration ${file} completed`);
    } catch (error: any) {
      if (error.code === '42P07') {
        // Table already exists (PostgreSQL error code)
        console.log(`⚠ Migration ${file} skipped (objects already exist)`);
      } else {
        console.error(`✗ Migration ${file} failed:`, error.message);
        throw error;
      }
    }
  }

  console.log('All migrations completed');
}

/**
 * CLI entry point
 */
if (require.main === module) {
  const dotenv = require('dotenv');
  dotenv.config();

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const { initDB } = require('../utils/db');
  initDB(DATABASE_URL);

  runMigrations()
    .then(() => {
      console.log('Migrations completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

