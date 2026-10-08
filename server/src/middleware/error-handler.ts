import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

function body(code: string, message: string, details?: unknown): ErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(body('NOT_FOUND', `Route ${req.method} ${req.path} not found`));
};

/** Maps every thrown error onto the uniform `{ error: { code, message } }` response shape. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json(
      body(
        'VALIDATION_ERROR',
        'Invalid request',
        err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      ),
    );
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json(body(err.code, err.message, err.details));
    return;
  }

  if (err instanceof multer.MulterError) {
    res.status(400).json(body('UPLOAD_ERROR', err.message));
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json(body('NOT_FOUND', 'Resource not found'));
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json(body('CONFLICT', 'A record with these details already exists'));
      return;
    }
  }

  // Malformed JSON body from express.json()
  if (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    err.type === 'entity.parse.failed'
  ) {
    res.status(400).json(body('BAD_REQUEST', 'Malformed JSON body'));
    return;
  }

  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json(body('INTERNAL_ERROR', 'Something went wrong'));
};
