import { InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { type EthosUserTarget, type PendingInvitation, X_SERVICE } from '@ethos/domain';
import { type ScoreLevel, scoreRanges } from '@ethos/score';
import { Button, Flex, Tag, theme, Tooltip, Typography } from 'antd';
import { useEffect } from 'react';
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
} from 'components/icons';
import { ReviewStatsRow, XPStatsRow, VouchStatsRow } from 'components/profile-stats';
import { TooltipIconWrapper } from 'components/tooltip/tooltip-icon-wrapper';
import { tokenCssVars } from 'config/theme';
import { useThemeMode } from 'contexts/theme-manager.context';
import { useCopyElementAsImage } from 'hooks/use-copy-element-as-image';
import { useActor } from 'hooks/user/activities';
import { useRouteTo } from 'hooks/user/hooks';
import {
  useExtendedAttestations,
  usePrimaryAddress,
  useProfile,
  useScore,
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

  const { data: profile, refetch: refetchProfile } = useProfile(target);
  const actor = useActor(target);
  const { data: attestationsResults, refetch: refetchAttestations } =
    useExtendedAttestations(target);
  const attestations = attestationsResults?.filter((item) => !item?.attestation.archived);
  let { data: score, isPending: scoreLoading, refetch: refetchScore } = useScore(target);
  const displayAddress = usePrimaryAddress(target).data;
  const targetRouteTo = useRouteTo(
    twitterProfile ? { service: X_SERVICE, username: twitterProfile.username } : target,
  ).data;

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

  const { elementRef, copyToClipboard } = useCopyElementAsImage({
    successMessage: 'Profile card copied to clipboard!',
    errorMessage: 'Failed to copy profile card.',
  });

  // This is a workaround to make sure the score is updated when the score is updated (not sure how to deal with this)
  useEffect(() => {
    function scoreUpdated() {
      refetchScore();
    }

    eventBus.on('SCORE_UPDATED', scoreUpdated);

    return () => {
      eventBus.off('SCORE_UPDATED', scoreUpdated);
    };
  }, [refetchScore]);

  useEffect(() => {
    function attestationUpdated() {
      refetchProfile();
      refetchAttestations();
    }

    eventBus.on('ATTESTATIONS_UPDATED', attestationUpdated);

    return () => {
      eventBus.off('ATTESTATIONS_UPDATED', attestationUpdated);
    };
  }, [refetchAttestations, refetchProfile]);

  const [scoreCategory, scorePercentage] = useScoreCategory(score ?? scoreRanges.neutral.min); // Default score category should be "NEUTRAL"
  const scoreGraphUrl = useScoreGraph(target, score ?? scoreRanges.neutral.min);

  const backgroundImage = `/assets/images/score/background${mode === 'dark' ? '-dark' : ''}.svg`;

  if (scoreCategoryOverride && scoreCategory) {
    scoreCategory.status = scoreCategoryOverride as ScoreLevel; // code smell but "TBD" is not a valid score level
  }

  return (
    <Flex
      ref={elementRef}
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
            size={125}
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
                attestations={attestations ?? []}
                displayAddress={displayAddress}
              />
              {!hideDownloadIcon && (
                <Tooltip title="Copy profile card">
                  <Button
                    onClick={copyToClipboard}
                    icon={<Download css={iconClassName} />}
                    type="text"
                  />
                </Tooltip>
              )}
            </Flex>
          </Flex>
          {/* END: NAME LINE */}
          {/* START: DETAILS LINES */}
          <Flex vertical gap={10}>
            <ReviewStatsRow target={target} />
            <VouchStatsRow target={target} profile={profile} />
            <XPStatsRow profile={profile} xpPageUrl={targetRouteTo.xpHistory} />
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
          padding: 0 ${token.paddingXL}px ${token.paddingXL - 10}px;
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
              margin-top: 21px;
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
                      ? tokenCssVars.colorSuccess
                      : tokenCssVars.colorError};
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
                line-height: 46px;
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
            <Button
              size="small"
              ghost
              icon={<InfoCircleOutlined />}
              href={targetRouteTo.score}
              iconPosition="end"
              css={css`
                color: ${scoreCategory.color};
                border-color: ${scoreCategory.color};
                &:hover {
                  color: ${scoreCategory.color};
                  border-color: ${scoreCategory.color};
                  opacity: 0.8;
                }
              `}
            >
              Score breakdown
            </Button>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
}
