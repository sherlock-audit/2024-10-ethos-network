import { DEFAULT_STARTING_SCORE, type ActivityActor } from '@ethos/domain';
import { pluralize } from '@ethos/helpers';
import { convertScoreToLevel } from '@ethos/score';
import { upperFirst } from 'lodash-es';
import { TestnetMark } from '../../../_components/testnet-mark.component';
import { Avatar } from 'app/og/_components/avatar.component';
import { Button } from 'app/og/_components/button.component';
import { Card, cardPaddingX } from 'app/og/_components/card.component';
import { TestnetWarning } from 'app/og/_components/testnet-warning.component';
import { getAvatar } from 'app/og/utils/avatar';
import { LogoSvg } from 'components/icons/logo.svg';
import { ReviewFilledSvg } from 'components/icons/review-filled.svg';
import { VouchFilledSvg } from 'components/icons/vouch-filled.svg';
import { getWebServerUrl, lightTheme } from 'config';
import { getColorFromScoreLevelSSR } from 'utils/score';

type ReviewStats = {
  received: number;
  positiveReviewPercentage: number;
};

type VouchStats = {
  received: number;
  vouchedInUsd: string;
};

type ProfileCardProps = {
  user: ActivityActor;
  actionMessage?: string;
  reviewStats: ReviewStats;
  vouchStats: VouchStats;
  scoreGraphUrl: string | null;
  topVouchers: Array<{
    avatar: string | null;
    vouchId: number;
    primaryAddress: string | null;
  }>;
};

const backgroundImage = new URL(
  '/assets/images/og/profile-background.svg',
  getWebServerUrl(),
).toString();

const scorePlaceholder = new URL(
  '/assets/images/og/progress-circle.svg',
  getWebServerUrl(),
).toString();

const containerWidth = 1200;
const innerCardPaddingX = 50;
const avatarSize = 78;
const progressCircleSize = 250;
const avatarOffset = -15;
const contentGap = 40;

export function ProfileCard({
  user: { name: _name, avatar, score, profileId, primaryAddress },
  reviewStats,
  vouchStats,
  actionMessage = 'View on Ethos',
  scoreGraphUrl,
  topVouchers,
}: ProfileCardProps) {
  // need to do this explicitly because of zero score in some cases
  if (!score) {
    score = DEFAULT_STARTING_SCORE;
  }
  const name = _name ?? 'Unknown';
  const scoreLevelRaw = convertScoreToLevel(score);
  const scoreLevel = upperFirst(scoreLevelRaw);

  const scoreColor = getColorFromScoreLevelSSR(scoreLevelRaw);

  return (
    <Card>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          position: 'relative',
          backgroundColor: lightTheme.token.colorBgLayout,
        }}
      >
        <img
          src={backgroundImage}
          alt="background"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            height: 570,
            zIndex: -1,
            opacity: 0.3,
          }}
        />
        <TestnetWarning
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            top: '220px',
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: innerCardPaddingX,
            paddingBottom: 0,
          }}
        >
          <div style={{ display: 'flex', gap: contentGap }}>
            <div
              style={{
                display: 'flex',
                position: 'relative',
                width: progressCircleSize,
                height: progressCircleSize,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                alt="avatar circle"
                src={scorePlaceholder}
                style={{
                  width: progressCircleSize,
                  height: progressCircleSize,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
              />
              <Avatar avatar={getAvatar(avatar, primaryAddress)} size="185px" />
            </div>
            <ProfileDetails
              hasProfile={profileId !== undefined}
              name={name}
              color={scoreColor}
              reviewStats={reviewStats}
              vouchStats={vouchStats}
              topVouchers={topVouchers}
            />
          </div>
          <TopVouchersAvatars topVouchers={topVouchers} />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            padding: `0 ${innerCardPaddingX}px 67px`,
            position: 'relative',
          }}
        >
          {scoreGraphUrl && (
            <img
              src={scoreGraphUrl}
              alt="score graph"
              style={{
                position: 'absolute',
                height: '100%',
                bottom: 0,
                left: 0,
                right: 0,
                width: containerWidth - cardPaddingX * 2,
              }}
            />
          )}
          <Button color={scoreColor} width="283px" height="87px">
            {actionMessage}
          </Button>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Queens',
              alignItems: 'flex-end',
              color: scoreColor,
            }}
          >
            <div style={{ display: 'flex', fontSize: '61px' }}>{scoreLevel}</div>
            <span
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                fontSize: '155px',
                lineHeight: 0.85,
                gap: '20px',
              }}
            >
              {score}{' '}
              <span style={{ fontSize: '102px' }}>
                <LogoSvg />
              </span>
            </span>
          </div>
        </div>
      </div>
      <TestnetMark />
    </Card>
  );
}

function ProfileDetails({
  hasProfile,
  name,
  color,
  reviewStats,
  vouchStats,
  topVouchers,
}: {
  hasProfile: boolean;
  name: string;
  color: string;
  reviewStats: ReviewStats;
  vouchStats: VouchStats;
  topVouchers: ProfileCardProps['topVouchers'];
}) {
  const avatarGroupSize = Math.min(topVouchers.length, 4) * avatarSize;
  const avatarMargin = topVouchers.length ? Math.min(topVouchers.length - 1, 3) * avatarOffset : 0;

  const statsRowStyle = {
    display: 'flex',
    gap: '14px',
    fontSize: 22,
    color: lightTheme.token.colorTextSecondary,
    alignItems: 'center',
  };

  const statsDetailsStyle = {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  };

  const renderVouchStats = (hasProfile: boolean, vouchStats: VouchStats) => {
    if (!hasProfile) {
      return <span>Not an Ethos user</span>;
    }

    if (vouchStats.received > 0) {
      return (
        <div style={statsDetailsStyle}>
          <strong>{vouchStats.vouchedInUsd}</strong> vouched ({vouchStats.received}{' '}
          <span>{pluralize(vouchStats.received, 'vouch', 'vouches')})</span>
        </div>
      );
    }

    return <span>No vouches</span>;
  };

  const renderReviewStats = (reviewStats: ReviewStats) => {
    if (reviewStats.received > 0) {
      return (
        <div style={statsDetailsStyle}>
          <strong>{reviewStats.positiveReviewPercentage.toFixed(0)}%</strong>
          <span>
            positive ({reviewStats.received} {pluralize(reviewStats.received, 'review', 'reviews')})
          </span>
        </div>
      );
    }

    return <span>No reviews</span>;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        marginTop: '20px',
      }}
    >
      <div
        style={{
          fontSize: '38px',
          fontWeight: '600',
          color,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth:
            containerWidth -
            cardPaddingX * 2 -
            innerCardPaddingX * 2 -
            progressCircleSize -
            avatarGroupSize -
            avatarMargin -
            contentGap -
            10, // add extra space to avoid getting too close to avatar group
        }}
      >
        {name}
      </div>
      <div style={statsRowStyle}>
        <span style={{ color: lightTheme.token.colorText }}>
          <ReviewFilledSvg />
        </span>
        {renderReviewStats(reviewStats)}
      </div>
      <div style={statsRowStyle}>
        <span style={{ color: lightTheme.token.colorText }}>
          <VouchFilledSvg />
        </span>
        {renderVouchStats(hasProfile, vouchStats)}
      </div>
    </div>
  );
}

function TopVouchersAvatars({ topVouchers }: { topVouchers: ProfileCardProps['topVouchers'] }) {
  if (topVouchers.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', marginTop: '10px' }}>
      {topVouchers.slice(0, 3).map((voucher, index) => (
        <Avatar
          key={voucher.vouchId}
          avatar={getAvatar(voucher.avatar, voucher.primaryAddress)}
          size={avatarSize}
          style={{
            marginLeft: index > 0 ? avatarOffset : 0,
          }}
          avatarStyle={{
            border: `2px solid ${lightTheme.token.colorBgLayout}`,
          }}
        />
      ))}
      {topVouchers.length > 3 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: avatarSize,
            height: avatarSize,
            borderRadius: '50%',
            backgroundColor: '#A0A09B',
            fontSize: 29,
            color: '#1F21B6',
            marginLeft: avatarOffset,
            border: `2px solid ${lightTheme.token.colorBgLayout}`,
          }}
        >
          +{topVouchers.length - 3}
        </div>
      )}
    </div>
  );
}
