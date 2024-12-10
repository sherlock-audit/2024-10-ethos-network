import { type Request, type Response, type NextFunction } from 'express';
import { verifyPrivyAuthToken } from '../common/net/privy.client.js';
import { Route } from '../routes/route.base.js';
import { RouteError } from '../routes/route.error.js';

export class AuthMiddlewares extends Route {
  /**
   * Verify the privy session by checking the privy token and privy id token
   * from cookies.
   */
  async checkPrivySession(req: Request, res: Response, next: NextFunction): Promise<void> {
    const privyToken = req.headers.authorization;
    const privyIdToken = req.headers['x-privy-id-token'];

    if (
      !privyToken ||
      !privyIdToken ||
      typeof privyToken !== 'string' ||
      typeof privyIdToken !== 'string'
    ) {
      this.renderError(RouteError.Unauthorized('Missing privy token'), req, res);

      return;
    }

    const [privyTokenClaims, privyIdTokenClaims] = await Promise.all([
      verifyPrivyAuthToken(privyToken),
      verifyPrivyAuthToken(privyIdToken),
    ]);

    if (
      !privyTokenClaims ||
      !privyIdTokenClaims ||
      privyTokenClaims.userId !== privyIdTokenClaims.userId
    ) {
      req.logger.warn({ data: { privyTokenClaims, privyIdTokenClaims } }, 'Invalid privy token');

      this.renderError(RouteError.Unauthorized('Invalid privy token'), req, res);

      return;
    }

    req.context = {
      ...req.context,
      privyUser: {
        id: privyTokenClaims.userId,
      },
    };

    next();
  }
}
