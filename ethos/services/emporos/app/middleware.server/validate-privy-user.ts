import { MarketUserData } from '~/data.server/market-user.ts';
import { verifyPrivyAuthToken } from '~/services.server/privy-client.ts';
import { getPrivyTokensFromRequest } from '~/session.server.ts';

/**
 * Validates a Privy user from the request and returns the corresponding market user.
 *
 * @throws {Response} 401 - When the Privy auth token is invalid
 * @returns {Promise<MarketUser>} The validated market user
 *
 * @remarks
 * Routes using this function should implement an error boundary to handle these errors
 * and prevent them from bubbling up to the root error boundary.
 */
export async function validatePrivyUser(request: Request) {
  const { privyIdToken } = await getPrivyTokensFromRequest(request);

  const verifiedClaims = await verifyPrivyAuthToken(privyIdToken);

  if (!verifiedClaims) {
    throw new Response('Please login to continue', {
      status: 401,
    });
  }

  const user = await MarketUserData.getById(verifiedClaims.userId);

  if (!user) {
    throw new Response('Something unexpected happened', {
      status: 500,
    });
  }

  return user;
}
