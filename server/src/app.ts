import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { LOCAL_UPLOAD_DIR } from './lib/storage/storage.service.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { buildApiRouter } from './routes.js';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // Images in /uploads are loaded cross-origin by the web client in development.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Locally stored uploads (only used when Cloudinary is not configured).
  app.use('/uploads', express.static(LOCAL_UPLOAD_DIR, { maxAge: '7d' }));

  app.use('/api', apiLimiter, buildApiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
