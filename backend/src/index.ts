import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initDB } from './utils/db';
import { initFileStorage } from './storage/fileStorage';
import authRoutes from './routes/auth';
import vaultRoutes from './routes/vault';
import sharingRoutes from './routes/sharing';
import auditRoutes from './routes/audit';
import alertsRoutes from './routes/alerts';
import { apiLimiter } from './middleware/rateLimit';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}
initDB(DATABASE_URL);

// Initialize file storage
const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH || './storage/files';
initFileStorage({ storagePath: FILE_STORAGE_PATH });

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100mb' })); // Large limit for encrypted file uploads
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/vault', vaultRoutes);
app.use('/api/v1/sharing', sharingRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/alerts', alertsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
