/**
 * Application logging utility
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();

function shouldLog(level: LogLevel): boolean {
  const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
  const currentLevelIndex = levels.indexOf(LOG_LEVEL as LogLevel);
  const messageLevelIndex = levels.indexOf(level);
  return messageLevelIndex <= currentLevelIndex;
}

export function logError(message: string, error?: any): void {
  if (shouldLog(LogLevel.ERROR)) {
    console.error(`[ERROR] ${message}`, error || '');
  }
}

export function logWarn(message: string, data?: any): void {
  if (shouldLog(LogLevel.WARN)) {
    console.warn(`[WARN] ${message}`, data || '');
  }
}

export function logInfo(message: string, data?: any): void {
  if (shouldLog(LogLevel.INFO)) {
    console.log(`[INFO] ${message}`, data || '');
  }
}

export function logDebug(message: string, data?: any): void {
  if (shouldLog(LogLevel.DEBUG)) {
    console.debug(`[DEBUG] ${message}`, data || '');
  }
}

