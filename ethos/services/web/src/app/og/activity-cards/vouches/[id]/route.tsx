import { duration } from '@ethos/helpers';
import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';
import { VouchCard } from '../../_components/vouch-card.component';
import { getFonts } from 'app/og/utils/fonts.util';
import { commonHeaders } from 'app/og/utils/headers.util';
import { serverAnalytics } from 'services/analytics/server-amplitude';
import { echoApi } from 'services/echo';

type Params = {
  id: string;
};

const fonts = getFonts();

export async function GET(req: NextRequest, props: { params: Promise<Params> }) {
  try {
    const params = await props.params;
    const vouch = await echoApi.activities.get('vouch', Number(params.id));

    serverAnalytics.openGraphImageRendered(
      'vouch',
      params.id,
      req.headers.get('user-agent') ?? '<Unknown>',
    );

    return new ImageResponse(<VouchCard vouch={vouch} />, {
      debug: false,
      fonts,
      headers: commonHeaders(duration(1, 'hour').toMilliseconds()),
    });
  } catch (error) {
    console.error('Error fetching vouch data', error);

    return new Response(null, { status: 404 });
  }
}
