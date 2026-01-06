/**
 * Database seed script
 * Initializes default templates
 */

import dotenv from 'dotenv';
import { initDB } from '../utils/db';
import { initializeDefaultTemplates } from '../vault/templates';

dotenv.config();

async function seed() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  initDB(DATABASE_URL);

  try {
    console.log('Initializing default templates...');
    await initializeDefaultTemplates();
    console.log('✓ Default templates initialized');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }

  process.exit(0);
}

if (require.main === module) {
  seed();
}

