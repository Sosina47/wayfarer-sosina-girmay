import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../lib/errors.js';

/**
 * Mandatory acting-user middleware.
 * Must be preceded by attachUser in the route handler chain.
 * Rejects requests without an authenticated acting user.
 */
export function requireUser(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(
      new UnauthorizedError('USER_REQUIRED', 'Acting user header X-User-Id is required.')
    );
  }

  next();
}
