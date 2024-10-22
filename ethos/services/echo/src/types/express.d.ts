import { type Logger } from '@ethos/logger';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Request {
      logger: Logger;
      id: string;
      context: {
        // TODO: Nothing to put here yet. The first thing we can store here is
        // connected user's address from session when we have one.
      };
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Response {
      responseTime?: number;
    }
  }
}
