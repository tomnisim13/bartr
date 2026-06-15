import { Request, Response, NextFunction } from 'express';
import { DEMO_USER_ID } from '../constants';
import { logger } from '../logger';

declare global {
  namespace Express {
    interface Request {
      currentUserId: string;
    }
  }
}

export function currentUser(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers['x-user-id'] as string | undefined;
  const isProduction = process.env.NODE_ENV === 'production';

  if (header && !isProduction) {
    req.currentUserId = header;
    // Debug-only: fires on every request when the frontend ships X-User-Id, so
    // we keep it off the default (info) channel to avoid log volume bombs.
    logger.debug({ userId: header }, 'Dev identity override via X-User-Id');
  } else {
    req.currentUserId = DEMO_USER_ID;
  }

  next();
}
