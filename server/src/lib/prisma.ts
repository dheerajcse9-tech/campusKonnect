import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

export const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });

export type Db = typeof prisma;
