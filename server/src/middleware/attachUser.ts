import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { UnauthorizedError } from '../lib/errors.js';

/**
 * Optional acting-user middleware.
 * If X-User-Id is provided, validates that it is a positive integer and exists in the DB.
 * If absent, leaves req.user undefined and continues.
 */
export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const rawUserId = req.header('x-user-id');

  if (rawUserId === undefined || rawUserId === null || rawUserId.trim() === '') {
    req.user = undefined;
    return next();
  }

  const trimmed = rawUserId.trim();

  // Must be positive integer string
  if (!/^\d+$/.test(trimmed) || parseInt(trimmed, 10) <= 0) {
    return next(
      new UnauthorizedError('INVALID_USER', 'Acting user specified in X-User-Id is invalid.')
    );
  }

  const userId = parseInt(trimmed, 10);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true }
    });

    if (!user) {
      return next(
        new UnauthorizedError('INVALID_USER', 'Acting user specified in X-User-Id does not exist.')
      );
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}
