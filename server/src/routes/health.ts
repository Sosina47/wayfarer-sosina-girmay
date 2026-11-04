import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    // Active PostgreSQL database connectivity check
    await prisma.$queryRawUnsafe('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'up' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database check failed';
    res.status(503).json({
      status: 'error',
      database: 'down',
      message
    });
  }
});

