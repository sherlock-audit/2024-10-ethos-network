import { type Express, type Request, type Response, type NextFunction } from 'express';
import { rootLogger } from '../common/logger';

const chaosMonkeyErrors = [400, 404, 502, 503, 500];

export function initChaosMiddleware(app: Express, ratePercentage: number): void {
  if (ratePercentage > 0) {
    app.use(chaos(ratePercentage));
  }
}
/**
 * Creates a chaos middleware that randomly throws errors based on a given percentage.
 * @param percentage The percentage chance of throwing an error (0-100).
 * @returns An Express middleware function.
 */
function chaos(percentage: number) {
  rootLogger.warn(`🐒🙊 Chaos middleware initialized with ${percentage}% chance of error`);

  return function (req: Request, res: Response, next: NextFunction) {
    const chance = Math.random() * 100;

    const useChaos = chance < percentage;

    if (useChaos) {
      req.logger.info(
        `🐒🙊 Chaos rate ${percentage}% hit with chance: ${chance.toFixed(2)}% for ${req.path}`,
      );
      const randomErrorStatus =
        chaosMonkeyErrors[Math.floor(Math.random() * chaosMonkeyErrors.length)];
      res.status(randomErrorStatus).send({
        code: randomErrorStatus,
        message: 'Chaos Monkey Error',
      });
    } else {
      next();
    }
  };
}
