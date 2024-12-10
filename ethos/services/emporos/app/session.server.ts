import * as cookie from 'cookie';

export async function getPrivyTokensFromRequest(request: Request) {
  const cookies = cookie.parse(request.headers.get('cookie') ?? '');
  const privyToken = cookies['privy-token'] ?? '';
  const privyIdToken = cookies['privy-id-token'] ?? '';

  return { privyToken, privyIdToken };
}
