import { type ActionFunctionArgs } from '@remix-run/node';
import { z } from 'zod';
import { MarketUserData } from '~/data.server/market-user.ts';
import { privy, verifyPrivyTokens } from '~/services.server/privy-client.ts';
import { getPrivyTokensFromRequest } from '~/session.server.ts';

const TwitterProfileDataSchema = z.object({
  id: z.string(),
  username: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  profilePictureUrl: z.string().nullable().optional(),
});

export type TwitterProfileData = z.infer<typeof TwitterProfileDataSchema>;

export async function action({ request }: ActionFunctionArgs) {
  const { privyToken, privyIdToken } = await getPrivyTokensFromRequest(request);

  if (!privyToken || !privyIdToken) {
    return Response.json({ error: 'Missing Privy authentication' }, { status: 400 });
  }

  if (!(await verifyPrivyTokens({ privyToken, privyIdToken }))) {
    return Response.json({ error: 'Invalid Privy authentication' }, { status: 400 });
  }

  const parsedPayload = TwitterProfileDataSchema.safeParse(await request.json());

  if (!parsedPayload.success) {
    return Response.json(
      { error: 'Invalid user data', message: parsedPayload.error.message },
      { status: 400 },
    );
  }
  const twitterUser = parsedPayload.data;
  const user = await privy.getUser({ idToken: privyIdToken });
  const wallets = user.linkedAccounts.filter((a) => a.type === 'wallet');
  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');

  if (!embeddedWallet || !twitterUser) {
    return Response.json({ error: 'Invalid linked accounts' }, { status: 400 });
  }

  await MarketUserData.upsert({
    id: user.id,
    embeddedWallet: embeddedWallet.address,
    twitterUserId: twitterUser.id,
    twitterUsername: twitterUser.username,
    twitterName: twitterUser.name,
    avatarUrl: twitterUser.profilePictureUrl,
  });

  return new Response(null, { status: 200 });
}
