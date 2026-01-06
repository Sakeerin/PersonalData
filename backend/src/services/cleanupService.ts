/**
 * Cleanup service for scheduled maintenance tasks
 */

import { cleanupExpiredShares } from '../access/sharing';
import { cleanupExpiredRecords, cleanupExpiredFiles } from '../dsr/retention';
import { query } from '../utils/db';
import { logInfo } from '../utils/logger';

/**
 * Run all cleanup tasks
 */
export async function runCleanupTasks(): Promise<void> {
  logInfo('Starting cleanup tasks...');

  try {
    // Cleanup expired shares
    const expiredShares = await cleanupExpiredShares();
    logInfo(`Cleaned up ${expiredShares} expired shares`);

    // Cleanup expired records
    const expiredRecords = await cleanupExpiredRecords();
    logInfo(`Cleaned up ${expiredRecords} expired records`);

    // Cleanup expired files
    const expiredFiles = await cleanupExpiredFiles();
    logInfo(`Cleaned up ${expiredFiles} expired files`);

    logInfo('Cleanup tasks completed');
  } catch (error) {
    logInfo('Error during cleanup:', error);
    throw error;
  }
}

/**
 * Schedule cleanup tasks (should be called by a cron job or scheduler)
 */
export function scheduleCleanupTasks(): void {
  // Run cleanup daily at 2 AM
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0);

  const msUntilTomorrow = tomorrow.getTime() - now.getTime();

  setTimeout(() => {
    runCleanupTasks().catch(error => {
      console.error('Cleanup task failed:', error);
    });

    // Schedule next run (24 hours)
    setInterval(() => {
      runCleanupTasks().catch(error => {
        console.error('Cleanup task failed:', error);
      });
    }, 24 * 60 * 60 * 1000);
  }, msUntilTomorrow);
}

