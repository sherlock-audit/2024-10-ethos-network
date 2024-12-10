import { duration } from '@ethos/helpers';
import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';
import { ReviewCard } from '../../_components/review-card.component';
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
    const review = await echoApi.activities.get('review', Number(params.id));

    serverAnalytics.openGraphImageRendered(
      'review',
      params.id,
      req.headers.get('user-agent') ?? '<Unknown>',
    );

    return new ImageResponse(<ReviewCard review={review} />, {
      debug: false,
      fonts,
      headers: commonHeaders(duration(1, 'hour').toMilliseconds()),
    });
  } catch (error) {
    console.error('Error fetching review data', error);

    return new Response(null, { status: 404 });
  }
}
