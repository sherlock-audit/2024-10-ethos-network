import { InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { type EthosUserTarget, type PendingInvitation, X_SERVICE } from '@ethos/domain';
import { pluralize } from '@ethos/helpers';
import { type ScoreLevel, scoreRanges } from '@ethos/score';
import { Button, Flex, Tag, theme, Tooltip, Typography } from 'antd';
import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { useScreenshot } from 'use-react-screenshot';
import { ProfileCardAttestations } from './profile-card.attestations';
import { CircularStepProgress } from './progress.component';
import { AnimatedScore } from 'components/animated-number';
import { UserAvatar } from 'components/avatar/avatar.component';
import {
  ArrowDownScoreIcon,
  ArrowUpScoreIcon,
  CheckCircleTwoTone,
  Download,
  Logo,
  ReviewFilled,
  VouchFilled,
} from 'components/icons';
import { TooltipIconWrapper } from 'components/tooltip/tooltip-icon-wrapper';
import { tokenCssVars } from 'config';
import { useThemeMode } from 'contexts/theme-manager.context';
import { useEthToUSD } from 'hooks/api/eth-to-usd-rate.hook';
import { useActor } from 'hooks/user/activities';
import { useRouteTo } from 'hooks/user/hooks';
import {
  useExtendedAttestations,
  usePrimaryAddress,
  useProfile,
  useReviewStats,
  useScore,
  useVouchStats,
} from 'hooks/user/lookup';
import { type echoApi } from 'services/echo';
import { eventBus } from 'utils/event-bus';
import { useScoreGraph } from 'utils/score-graph/use-score-graph';
import { useScoreCategory } from 'utils/scoreCategory';

const { Text, Paragraph, Title } = Typography;
const { useToken } = theme;

type Props = {
  target: EthosUserTarget;
  twitterProfile?: NonNullable<Awaited<ReturnType<typeof echoApi.twitter.user.get>>>;
  scoreOverride?: PendingInvitation['impact'];
  scoreCategoryOverride?: string;
  isScoreAnimationEnabled?: boolean;
  hideProfileWarningIcon?: boolean;
  hideScoreExplanation?: boolean;
  hideDownloadIcon?: boolean;
  showScoreOverrideContainer?: boolean;
};

export function ProfileCard({
  target,
  twitterProfile,
  scoreOverride,
  scoreCategoryOverride,
  isScoreAnimationEnabled,
  hideProfileWarningIcon,
  hideScoreExplanation,
  showScoreOverrideContainer,
  hideDownloadIcon,
}: Props) {
  const { token } = useToken();
  const mode = useThemeMode();

  const iconClassName = css`
    color: ${tokenCssVars.colorTextTertiary};
  `;

  const profile = useProfile(target).data;
  const actor = useActor(target);
  const attestationsResults = useExtendedAttestations(target).data ?? [];
  const attestations = attestationsResults?.filter((item) => !item?.attestation.archived);
  let { data: score, isPending: scoreLoading, refetch: refetchScore } = useScore(target);
  const reviewStats = useReviewStats(target).data;
  const vouchStats = useVouchStats(target).data;
  const displayAddress = usePrimaryAddress(target).data;
  const targetRouteTo = useRouteTo(
    twitterProfile ? { service: X_SERVICE, username: twitterProfile.username } : target,
  ).data;
  const vouchedInUSD = useEthToUSD(vouchStats?.staked.received ?? 0);

  let tooltipTitle: string;

  if (scoreOverride) {
    score = scoreOverride.adjustedRecipientScore;
  }

  if (profile) {
    tooltipTitle = 'Verified Ethos Profile';
  } else if (twitterProfile) {
    tooltipTitle = 'This X/Twitter account has not been connected to an Ethos profile yet.';
  } else if ('address' in target) {
    tooltipTitle = 'This wallet has not been connected to an Ethos profile yet.';
  } else {
    // TODO we don't really distinguish tokens vs addresses yet
    tooltipTitle = 'This token has not been connected to an Ethos profile yet.';
  }

  const cardRef = useRef<HTMLDivElement | null>(null);
  const [image, takeScreenshot] = useScreenshot();

  function getImage() {
    cardRef.current && takeScreenshot(cardRef.current, { useCORS: true });

    if (window !== undefined && image) {
      const link = document.createElement('a');
      link.download = `${actor.name}-user-card.png`;
      link.href = image;
      link.click();
    }
  }

  // This is a workaround to make sure the score is updated when the score is updated (not sure how to deal with this)
  useEffect(() => {
    const handleScoreUpdate = () => {
      refetchScore();
    };

    eventBus.on('SCORE_UPDATED', handleScoreUpdate);

    return () => {
      eventBus.off('SCORE_UPDATED', handleScoreUpdate);
    };
  }, [refetchScore]);

  const vouchStatsRow = useMemo(() => {
    if (!profile) {
      return <Text type="secondary">Not an Ethos user</Text>;
    }

    if (vouchStats?.count?.received) {
      return (
        <Text type="secondary">
          <Tooltip title={`${vouchStats?.staked.received ?? 0}e vouched`}>
            <Text strong type="secondary">
              {vouchedInUSD ?? vouchStats?.staked.received}
            </Text>{' '}
          </Tooltip>
          vouched ({vouchStats?.count.received ?? 0}{' '}
          {pluralize(vouchStats?.count.received ?? 0, 'vouch', 'vouches')})
        </Text>
      );
    }

    return <Text type="secondary">No vouches</Text>;
  }, [profile, vouchStats?.count.received, vouchStats?.staked.received, vouchedInUSD]);

  const [scoreCategory, scorePercentage] = useScoreCategory(score ?? scoreRanges.neutral.min); // Default score category should be "NEUTRAL"
  const scoreGraphUrl = useScoreGraph(target, scoreOverride?.adjustedRecipientScore);

  const backgroundImage = `/assets/images/score/background${mode === 'dark' ? '-dark' : ''}.svg`;

  if (scoreCategoryOverride && scoreCategory) {
    scoreCategory.status = scoreCategoryOverride as ScoreLevel; // code smell but "TBD" is not a valid score level
  }

  return (
    <Flex
      ref={cardRef}
      css={css`
        background-color: ${tokenCssVars.colorBgContainer};
        background-image: url(${backgroundImage});
        background-position: top left;
        background-repeat: no-repeat;
        height: 100%;
        border-radius: ${token.borderRadiusLG}px;
        box-shadow: ${tokenCssVars.boxShadowTertiary};
        position: relative;
      `}
      vertical
    >
      <Flex
        css={css`
          width: 100%;
          padding: ${token.paddingXL}px ${token.paddingXL}px 0;
          box-sizing: border-box;
        `}
        gap={21}
        align="flex-start"
      >
        <div
          css={css`
            position: absolute;
            top: 0;
            left: 0;
            padding: 27px 27px 0;
          `}
        >
          <CircularStepProgress
            size={135}
            type="circle"
            percent={scorePercentage}
            strokeWidth={3}
            strokeColor={scoreCategory.color}
            trailColor={tokenCssVars.colorBgBase}
            showInfo={false}
            css={css`
              stroke-linecap: round;
            `}
          />
          <div
            css={css`
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              padding: inherit;
              width: max-content;
              height: max-content;
            `}
          >
            <UserAvatar
              showHoverCard={false}
              showScore={false}
              renderAsLink={false}
              size={100}
              actor={actor}
              css={css`
                background-color: ${tokenCssVars.colorTextQuaternary};
                color: ${tokenCssVars.colorTextDescription};
              `}
            />
          </div>
        </div>

        <Flex
          css={css`
            width: 100%;
            margin-left: 139px;
          `}
          gap={6}
          justify="space-between"
          align="flex-start"
          wrap
        >
          <Flex
            justify="space-between"
            css={css`
              width: 100%;
              @media (max-width: ${token.screenSM}px) {
                flex-direction: column;
              }
            `}
          >
            {/* START: NAME + VERIFICATION */}
            <Flex gap={4} align="center" wrap>
              <Text
                strong
                css={css`
                  font-size: ${token.fontSizeXL}px;
                  color: ${scoreCategory.color};
                `}
              >
                {actor.name}&nbsp;
                {attestations?.length ? (
                  <Tooltip title={tooltipTitle}>
                    <TooltipIconWrapper>
                      <CheckCircleTwoTone
                        css={css`
                          color: ${tokenCssVars.colorSuccess};
                        `}
                      />
                    </TooltipIconWrapper>
                  </Tooltip>
                ) : (
                  !profile &&
                  !hideProfileWarningIcon && (
                    <Tooltip title={tooltipTitle}>
                      <TooltipIconWrapper>
                        <WarningOutlined
                          css={css`
                            color: ${tokenCssVars.colorWarningTextActive};
                            font-size: 18px;
                          `}
                        />
                      </TooltipIconWrapper>
                    </Tooltip>
                  )
                )}
              </Text>
            </Flex>
            {/* END: NAME + VERIFICATION */}
            <Flex>
              <ProfileCardAttestations
                target={target}
                profile={profile}
                twitterProfile={twitterProfile}
                attestations={attestations}
                displayAddress={displayAddress}
              />
              {!hideDownloadIcon && (
                <Tooltip title="Download profile card">
                  <Button onClick={getImage} icon={<Download css={iconClassName} />} type="text" />
                </Tooltip>
              )}
            </Flex>
          </Flex>
          {/* END: NAME LINE */}
          {/* START: DETAILS LINES */}
          <Flex vertical gap={10}>
            <Flex gap={6} align="center">
              <Tooltip title="Reviews">
                <TooltipIconWrapper>
                  <ReviewFilled css={{ color: tokenCssVars.colorText }} />
                </TooltipIconWrapper>
              </Tooltip>
              {reviewStats?.received && reviewStats?.received > 0 ? (
                <Text type="secondary">
                  <Text strong type="secondary">
                    {(reviewStats?.positiveReviewPercentage ?? 0).toFixed(0)}%
                  </Text>{' '}
                  positive ({reviewStats?.received}{' '}
                  {pluralize(reviewStats?.received, 'review', 'reviews')})
                </Text>
              ) : (
                <Text type="secondary">No reviews</Text>
              )}
            </Flex>
            <Flex gap={6} align="center">
              <Tooltip title="Vouches">
                <TooltipIconWrapper>
                  <VouchFilled css={{ color: tokenCssVars.colorText }} />
                </TooltipIconWrapper>
              </Tooltip>
              {vouchStatsRow}
            </Flex>
          </Flex>

          {/* END: DETAILS LINES */}
        </Flex>
      </Flex>
      <Flex
        css={css`
          background-image: url(${scoreGraphUrl});
          background-position: bottom center;
          background-size: 100% calc(100% - ${token.paddingLG}px);
          background-repeat: no-repeat;
          height: 100%;
          padding: 0 ${token.paddingXL}px ${token.paddingXL}px;
          border-radius: ${token.borderRadiusLG}px;
        `}
        justify="space-between"
        align="flex-end"
      >
        <Paragraph
          type="secondary"
          css={css`
            max-width: 40%;
            margin-bottom: 0;
            @media (max-width: ${token.screenSM}px) {
              max-width: 25%;
            }
          `}
          ellipsis={{ rows: 5 }}
        >
          <span
            css={css`
              @media (max-width: ${token.screenXS}px) {
                display: none;
              }
            `}
          >
            {actor.description}
          </span>
        </Paragraph>
        <Flex
          vertical
          gap={11}
          align="flex-end"
          css={css`
            @media (max-width: ${token.screenSM}px) {
              margin-top: 52px;
            }
          `}
        >
          {showScoreOverrideContainer && (
            <div
              css={css`
                height: 30px;
                margin-top: 5px;
              `}
            >
              {scoreOverride && scoreOverride.value !== 0 && (
                <Tag
                  color={scoreOverride.impact === 'POSITIVE' ? 'success' : 'error'}
                  css={css`
                    color: ${scoreOverride.impact === 'POSITIVE'
                      ? tokenCssVars.colorSuccessActive
                      : tokenCssVars.colorErrorActive};
                    padding: 4px 6px;
                    font-size: 22px;
                    display: flex;
                    align-items: center;
                    font-weight: 600;
                    margin-inline-end: 0;

                    & span {
                      display: flex;
                      align-items: center;
                      gap: 3px;
                    }
                  `}
                  icon={
                    scoreOverride.impact === 'POSITIVE' ? (
                      <ArrowUpScoreIcon />
                    ) : (
                      <ArrowDownScoreIcon />
                    )
                  }
                >
                  <AnimatedScore
                    score={scoreOverride.value}
                    animationVariant={isScoreAnimationEnabled ? 'combined' : 'none'}
                    firstAnimationFromZero
                  />
                  <Logo
                    css={css`
                      margin-left: 4px;
                      font-size: 16px;
                    `}
                  />
                </Tag>
              )}
            </div>
          )}
          <Title
            css={css`
              color: ${scoreCategory.color};
              line-height: 32px;
              text-transform: capitalize;
            `}
            level={2}
          >
            {scoreCategory.status}
          </Title>
          <Flex gap={10}>
            <Title
              level={2}
              css={css`
                font-size: 76px;
                line-height: 66px;
                color: ${scoreCategory.color};
              `}
            >
              {score && !scoreLoading ? (
                <AnimatedScore
                  score={score}
                  animationVariant={isScoreAnimationEnabled ? 'combined' : 'none'}
                />
              ) : (
                '-'
              )}
            </Title>
            <Logo
              css={css`
                font-size: 53px;
                color: ${scoreCategory.color};
              `}
            />
          </Flex>
          {!hideScoreExplanation && (
            <Link
              css={css`
                color: ${scoreCategory.color};
                font-size: ${token.fontSizeSM}px;
              `}
              href={targetRouteTo.score}
            >
              <Tooltip title="This is a user's Ethos credibility score. Click here to get more info about how it's calculated">
                <TooltipIconWrapper>
                  What does this mean?&nbsp;
                  <InfoCircleOutlined />
                </TooltipIconWrapper>
              </Tooltip>
            </Link>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
}
