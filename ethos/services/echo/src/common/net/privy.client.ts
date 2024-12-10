import { type AuthTokenClaims, PrivyClient } from '@privy-io/server-auth';
import { config } from '../config.js';

export const privy = new PrivyClient(config.PRIVY_APP_ID, config.PRIVY_APP_SECRET);

export async function verifyPrivyAuthToken(privyToken: string): Promise<AuthTokenClaims | false> {
  try {
    // Pass public key to verify the token so the library doesn't need to send a
    // request to Privy to get that key.
    return await privy.verifyAuthToken(privyToken, config.PRIVY_APP_PUBLIC_KEY);
  } catch {
    return false;
  }
}
