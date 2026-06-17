import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

// Paths we don't want to log on every poll. Empty for now; kept here so we
// have a single spot to silence health checks etc. when they're added.
const SILENCED: ReadonlyArray<string> = [];

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (SILENCED.includes(req.path)) {
    next();
    return;
  }

  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const ctx = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms,
      userId: req.currentUserId,
    };

    if (res.statusCode >= 500) {
      logger.error(ctx, 'HTTP request failed');
    } else if (res.statusCode >= 400) {
      logger.warn(ctx, 'HTTP request rejected');
    } else {
      logger.info(ctx, 'HTTP request');
    }
  });

  next();
}
