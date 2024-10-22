import { fromUserKey } from '@ethos/domain';
import { duration, formatCurrency } from '@ethos/helpers';
import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';
import { ProfileCard } from './_components/profile-card.component';
import { getFonts } from 'app/og/utils/fonts.util';
import { commonHeaders } from 'app/og/utils/headers.util';
import { getReviewStats, getVouchStats } from 'hooks/user/lookup';
import { serverAnalytics } from 'services/analytics/server-amplitude';
import { echoApi } from 'services/echo';
import { getScoreGraphSSR } from 'utils/score-graph/get-score-graph-SSR';

type Params = {
  userkey: string;
};

const fonts = getFonts();

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    let target = fromUserKey(params.userkey, true);

    if ('service' in target && 'username' in target) {
      const twitterProfile = await echoApi.twitter.user.get({ username: target.username });

      if (!twitterProfile) {
        throw new Error('Twitter profile not found');
      }

      target = {
        service: target.service,
        account: twitterProfile.id,
      };
    }

    const [user, reviewStats, vouchStats, ethToUsdRate] = await Promise.all([
      echoApi.activities.actor(target),
      getReviewStats(target),
      getVouchStats(target),
      echoApi.exchangeRates.getEthPriceInUSD(),
    ]);

    const topVouchers = user.profileId
      ? await echoApi.vouches.mostCredibleVouchers({
          subjectProfileId: user.profileId,
          limit: 5,
        })
      : [];

    const topVouchersAvatars = await echoApi.activities.actorsBulk(
      topVouchers.map((voucher) => ({ profileId: voucher.authorProfileId })),
    );

    const topVouchersWithAvatars = topVouchers.map((voucher, index) => ({
      ...voucher,
      avatar: topVouchersAvatars[index]?.avatar,
      primaryAddress: topVouchersAvatars[index]?.primaryAddress,
    }));

    const vouchedInUsd = formatCurrency(
      vouchStats?.staked.received ? Number(vouchStats.staked.received) * ethToUsdRate.price : 0,
      'USD',
    );

    serverAnalytics.openGraphImageRendered(
      'profile',
      params.userkey,
      req.headers.get('user-agent') ?? '<Unknown>',
    );

    const scoreGraph = await getScoreGraphSSR(target, user.score);

    return new ImageResponse(
      (
        <ProfileCard
          user={user}
          reviewStats={reviewStats ?? { received: 0, positiveReviewPercentage: 0 }}
          vouchStats={{ received: vouchStats?.count.received ?? 0, vouchedInUsd }}
          scoreGraphUrl={scoreGraph}
          topVouchers={topVouchersWithAvatars}
        />
      ),
      {
        debug: false,
        fonts,
        headers: commonHeaders(duration(1, 'hour').toMilliseconds()),
      },
    );
  } catch (error) {
    console.error('Error fetching profile card data', error);

    return new Response(null, { status: 404 });
  }
}
