import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

// Single PrismaClient instance for the server application
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL
    }
  },
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

