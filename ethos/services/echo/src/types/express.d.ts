import { type Logger } from '@ethos/logger';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Request {
      logger: Logger;
      id: string;
      context: {
        privyUser?: {
          id: string;
        };
      };
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Response {
      responseTime?: number;
    }
  }
}
