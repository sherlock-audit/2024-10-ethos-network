import { duration } from '@ethos/helpers';
import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';
import { type Address } from 'viem';
import { InviteCard } from './components/invite-card.component';
import { getFonts } from 'app/og/utils/fonts.util';
import { commonHeaders } from 'app/og/utils/headers.util';
import { serverAnalytics } from 'services/analytics/server-amplitude';
import { echoApi } from 'services/echo';

type Params = {
  inviterProfileId: string;
  invitedAddress: Address;
};

const fonts = getFonts();

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const inviterProfile = await echoApi.activities.actor({
      profileId: parseInt(params.inviterProfileId),
    });

    serverAnalytics.openGraphImageRendered(
      'invite',
      `${params.inviterProfileId}-${params.invitedAddress}`,
      req.headers.get('user-agent') ?? '<Unknown>',
    );

    return new ImageResponse(
      <InviteCard inviterProfile={inviterProfile} invitedAddress={params.invitedAddress} />,
      {
        debug: false,
        fonts,
        headers: commonHeaders(duration(1, 'day').toMilliseconds()),
      },
    );
  } catch (error) {
    console.error('Error fetching invite data', error);

    return new Response(null, { status: 404 });
  }
}
