import { NetError, setEchoConfig } from '@ethos/echo-client';
import { cookies } from 'next/headers';
import { getEchoBaseUrl } from 'config/misc';
import { echoApi } from 'services/echo';

// Use internal echo URL via ECHO_INTERNAL_BASE_URL env variable if defined.
// This will make the request faster as it will not go through the public URL.
// Then fallback to the public URL. Te fallback will be used in local
// development only.
const baseUrl = process.env.ECHO_INTERNAL_BASE_URL ?? getEchoBaseUrl();

setEchoConfig({
  baseUrl,
  ethosService: 'web',
});

/**
 * This endpoint is basically a proxy to the echo service to create a privy login.
 * Both Privy cookies have `SameSite` set to `Strict` so we can't include them
 * on another domain while sending request to echo. SO this endpoint reads those
 * cookies and passes them to echo service to create a privy login.
 */
export async function POST() {
  const cookieStore = await cookies();
  const privyToken = cookieStore.get('privy-token')?.value ?? '';
  const privyIdToken = cookieStore.get('privy-id-token')?.value ?? '';

  try {
    await echoApi.privyLogins.create(privyToken, privyIdToken);

    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof NetError) {
      return Response.json(err.body, { status: err.status });
    }

    return Response.json(
      {
        ok: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'Something went wrong! Please try again later.',
        },
      },
      { status: 500 },
    );
  }
}
