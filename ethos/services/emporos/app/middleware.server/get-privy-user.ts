import { MarketUserData } from '~/data.server/market-user.ts';
import { verifyPrivyAuthToken } from '~/services.server/privy-client.ts';
import { getPrivyTokensFromRequest } from '~/session.server.ts';

/**
 * Gets the privy id token from the request and returns the corresponding market user if exists.
 *
 * @returns {Promise<MarketUser | null>} The privy user or null if the user is not found
 *
 */
export async function getPrivyUser(request: Request) {
  const { privyIdToken } = await getPrivyTokensFromRequest(request);

  const verifiedClaims = await verifyPrivyAuthToken(privyIdToken);

  if (!verifiedClaims) {
    return null;
  }

  const user = await MarketUserData.getById(verifiedClaims.userId);

  if (!user) {
    return null;
  }

  return user;
}
