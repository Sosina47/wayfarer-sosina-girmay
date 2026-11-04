import express, { Express } from 'express';
import { healthRouter } from './routes/health.js';

export function createApp(): Express {
  const app = express();

  // JSON body parser
  app.use(express.json());

  // Mount API routes
  app.use('/api', healthRouter);

  return app;
}

export const app = createApp();

