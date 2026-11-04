import express, { Express } from 'express';
import { healthRouter } from './routes/health.js';
import { placesRouter } from './routes/places.js';
import { usersRouter } from './routes/users.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  // JSON body parser
  app.use(express.json());

  // Mount API routes
  app.use('/api', healthRouter);
  app.use('/api', placesRouter);
  app.use('/api', usersRouter);

  // 404 handler for unknown API routes
  app.use('/api', notFoundHandler);

  // Centralized application error handling middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
