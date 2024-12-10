import { type AuthTokenClaims, PrivyClient } from '@privy-io/server-auth';
import { config } from '~/config/config.server.ts';

export const privy = new PrivyClient(config.EMPOROS_PRIVY_APP_ID, config.EMPOROS_PRIVY_APP_SECRET);

export async function verifyPrivyTokens({
  privyToken,
  privyIdToken,
}: {
  privyToken: string;
  privyIdToken: string;
}): Promise<boolean> {
  try {
    // Pass public key to verify the token so the library doesn't need to send a
    // request to Privy to get that key.
    const [authToken, idToken] = await Promise.all([
      privy.verifyAuthToken(privyToken, config.EMPOROS_PRIVY_APP_PUBLIC_KEY),
      privy.verifyAuthToken(privyIdToken, config.EMPOROS_PRIVY_APP_PUBLIC_KEY),
    ]);

    return Boolean(authToken && idToken && authToken.userId === idToken.userId);
  } catch (err) {
    return false;
  }
}

export async function verifyPrivyAuthToken(privyToken: string): Promise<AuthTokenClaims | false> {
  try {
    return await privy.verifyAuthToken(privyToken, config.EMPOROS_PRIVY_APP_PUBLIC_KEY);
  } catch (err) {
    return false;
  }
}
