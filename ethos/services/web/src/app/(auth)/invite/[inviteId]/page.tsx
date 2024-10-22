'use client';

import { css } from '@emotion/react';
import { DEFAULT_STARTING_SCORE, type PendingInvitation, ScoreImpact } from '@ethos/domain';
import { duration } from '@ethos/helpers';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Carousel, Col, Flex, Row, Steps, theme, Typography } from 'antd';
import { Content } from 'antd/es/layout/layout';
import { type CarouselRef } from 'antd/lib/carousel';
import { useParams, useRouter } from 'next/navigation';
import { Fragment, useEffect, useRef, useState } from 'react';
import { zeroAddress } from 'viem';
import { ProfileCard } from '../../../(root)/profile/_components/profile-card/profile-card.component';
import { ONBOARDING_SKIP_SESSION_KEY } from '../../../../constant/constants';
import { cacheKeysFor, invalidate } from '../../../../constant/queries/cache.invalidation';
import { AcceptInviteStep } from './components/onboarding-steps/accept-invite-step.component';
import { ConnectSocialStep } from './components/onboarding-steps/connect-social-step.component';
import { OnchainHistoryStep } from './components/onboarding-steps/onchain-history-step.component';
import { StartContributingStep } from './components/onboarding-steps/start-contributing-step.component';
import OnboardingWelcome from './components/onboarding-welcome/onboarding-welcome';
import { SkipOnboardingButton } from './components/skip-onboarding-button.component';
import { LogoInvertedSvg } from 'components/icons/logo.svg';
import { PersonName } from 'components/person-name/person-name.component';
import { tokenCssVars } from 'config';
import { useCurrentUser } from 'contexts/current-user.context';
import { useSkipOnboardingSteps } from 'hooks/use-skip-onboarding-steps';
import { useSessionStorage } from 'hooks/use-storage';
import { useDebouncedValue } from 'hooks/useDebounce';
import { useActor } from 'hooks/user/activities';
import { useScoreSimulation } from 'hooks/user/lookup';
import { eventBus } from 'utils/event-bus';
import { parseProfileInviteId } from 'utils/routing';

enum Slide {
  Welcome,
  History,
  Accept,
  Attest,
  Finish,
}

const DEBOUNCE_DELAY = duration(100, 'millisecond').toMilliseconds();

export default function Page() {
  const { token } = theme.useToken();
  const { inviteId } = useParams<{ inviteId: string }>();
  const { inviterProfileId, inviteeAddress } = parseProfileInviteId(inviteId);
  const { showSkipOnboarding } = useSkipOnboardingSteps();
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState<Slide>(Slide.Welcome);
  const [selectedTwitterProfileId, setSelectedTwitterProfileId] = useState<string | undefined>();
  const [hoveredInvitation, setHoveredInvitation] = useState<PendingInvitation | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<PendingInvitation | null>(null);
  const [onChainHistoryEvaluated, setOnChainHistoryEvaluated] = useState(false);
  const [scoreOverride, setScoreOverride] = useState<PendingInvitation['impact'] | undefined>(
    undefined,
  );

  const selectedProfile = useActor({ profileId: selectedInvitation?.id ?? -1 });
  const [, setSkipOnboardingValue] = useSessionStorage<boolean>(ONBOARDING_SKIP_SESSION_KEY);
  const queryClient = useQueryClient();

  // Added debounced hovered invitation to counteract the effect of hovering the space between two identical points invites
  const debouncedHoveredInvitation = useDebouncedValue(hoveredInvitation, DEBOUNCE_DELAY);

  const { connectedAddress } = useCurrentUser();
  const connectedTarget = { address: connectedAddress ?? zeroAddress };

  const carouselRef = useRef<CarouselRef>(null);
  const { data: twitterScoreSimulation } = useScoreSimulation(connectedTarget, {
    twitterProfileId: selectedTwitterProfileId,
  });

  useEffect(() => {
    if (currentSlide === Slide.History) {
      if (onChainHistoryEvaluated) {
        setScoreOverride(undefined);
      } else {
        setScoreOverride({
          value: 0,
          relativeValue: 0,
          impact: ScoreImpact.NEUTRAL,
          adjustedRecipientScore: DEFAULT_STARTING_SCORE,
        });
      }
    }

    // Only show score simulation on the accept slide
    if (currentSlide === Slide.Accept) {
      setScoreOverride(debouncedHoveredInvitation?.impact ?? selectedInvitation?.impact);
    }

    if (currentSlide === Slide.Attest && twitterScoreSimulation?.simulation) {
      setScoreOverride(twitterScoreSimulation?.simulation);
    }
  }, [
    selectedInvitation,
    debouncedHoveredInvitation,
    currentSlide,
    onChainHistoryEvaluated,
    twitterScoreSimulation,
  ]);

  function startOnboarding() {
    setCurrentSlide(Slide.History);
  }

  async function finishOnboarding() {
    await invalidate(queryClient, cacheKeysFor.ProfileChange(connectedTarget));
    await invalidate(queryClient, cacheKeysFor.InvitationChange(connectedTarget));
    setSkipOnboardingValue(true);

    router.push('/?first-time=true');
  }

  const steps = [
    {
      key: 'onchain-history',
      component: (
        <OnchainHistoryStep
          target={connectedTarget}
          defaultScore={DEFAULT_STARTING_SCORE}
          stepCompleted={() => carouselRef?.current?.next()}
          historyEvaluated={() => {
            setOnChainHistoryEvaluated(true);
          }}
        />
      ),
    },
    {
      key: 'accept-invite',
      component: (
        <AcceptInviteStep
          stepCompleted={() => carouselRef?.current?.next()}
          selectedInvitation={selectedInvitation}
          setSelectedInvitation={setSelectedInvitation}
          invitationHover={setHoveredInvitation}
          inviterProfileId={inviterProfileId}
        />
      ),
    },
    {
      key: 'connect-social',
      component: (
        <ConnectSocialStep
          stepCompleted={() => carouselRef?.current?.next()}
          selectedTwitterProfileId={(profileId) => {
            setScoreOverride(undefined);
            setSelectedTwitterProfileId(profileId);
          }}
        />
      ),
    },
    {
      key: 'start-contributing',
      component: (
        <StartContributingStep
          stepCompleted={() => {
            finishOnboarding();
          }}
        />
      ),
    },
  ];

  if (currentSlide === Slide.Welcome) {
    return (
      inviteeAddress && (
        <OnboardingWelcome startOnboarding={startOnboarding} inviteeAddress={inviteeAddress}>
          <SkipOnboardingButton />
        </OnboardingWelcome>
      )
    );
  }

  return (
    <Content>
      <div
        css={css`
          position: absolute;
          left: calc(50% - 33px);
          top: 100px;
          z-index: 1;
          font-size: 66px;

          color: ${tokenCssVars.colorText};
          @media (max-width: ${token.screenLG}px) {
            display: none;
          }
        `}
      >
        <LogoInvertedSvg fill={tokenCssVars.colorBgContainer} />
      </div>
      <VerticalOnboardingStepper currentSlide={currentSlide} />
      <Row
        css={css`
          height: 100vh;
        `}
      >
        <Col
          lg={12}
          xs={24}
          css={css`
            background: ${tokenCssVars.colorBgContainer};
            height: 100vh;
            display: flex;
            align-items: center;
            position: relative;
          `}
        >
          <SkipOnboardingButton isMobile />
          <Flex
            vertical
            justify="center"
            align="center"
            gap={33}
            css={css`
              width: 100%;
            `}
          >
            <Carousel
              ref={carouselRef}
              vertical
              beforeChange={(_, nextSlide) => {
                eventBus.emit('SCORE_UPDATED');
                // Triggering score after each step to be sure
                setScoreOverride(undefined);
                setCurrentSlide(nextSlide + 1);
              }}
            >
              {steps.map((step) => (
                <Fragment key={step.key}>{step.component}</Fragment>
              ))}
            </Carousel>
            {showSkipOnboarding && (
              <Flex
                justify="center"
                gap={10}
                css={css`
                  position: absolute;
                  bottom: 10px;
                  width: 100%;
                `}
              >
                <Button
                  type="link"
                  danger
                  onClick={() => {
                    carouselRef.current?.prev();
                  }}
                >
                  Go back
                </Button>
                <Button
                  type="primary"
                  danger
                  onClick={() => {
                    carouselRef.current?.next();
                  }}
                >
                  Skip step
                </Button>
              </Flex>
            )}
          </Flex>
        </Col>
        <Col
          span={12}
          css={css`
            background: ${tokenCssVars.colorBgLayout};
            height: 100vh;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            position: relative;

            display: none;
            @media (min-width: ${token.screenLG}px) {
              display: flex;
            }
          `}
        >
          <SkipOnboardingButton />
          <div
            css={css`
              position: relative;
            `}
          >
            <Typography.Text
              css={css`
                margin-bottom: ${token.marginXS}px;
                display: block;
                text-align: right;
                margin-right: 40px;
                margin-left: 40px;
              `}
            >
              <Flex gap={5} justify="space-between" align="baseline">
                <Typography.Title level={2}>Your Ethos Profile</Typography.Title>
                {selectedProfile && (
                  <div>
                    Invited by{' '}
                    <PersonName target={selectedProfile} color="colorPrimary" openInNewTab />
                  </div>
                )}
              </Flex>
            </Typography.Text>
            <div
              css={css`
                box-shadow:
                  0px 405.551px 113.592px 0px rgba(0, 0, 0, 0),
                  0px 260.041px 104.204px 0px rgba(0, 0, 0, 0.01),
                  0px 146.449px 87.306px 0px rgba(0, 0, 0, 0.05),
                  0px 64.776px 64.776px 0px rgba(0, 0, 0, 0.09),
                  0px 15.959px 35.673px 0px rgba(0, 0, 0, 0.1); // ugly AF
                border-radius: ${token.borderRadiusLG}px;
                margin: 0 40px;
              `}
            >
              <ProfileCard
                target={connectedTarget}
                scoreOverride={scoreOverride}
                scoreCategoryOverride={currentSlide === Slide.History ? 'TBD' : undefined}
                hideProfileWarningIcon
                hideScoreExplanation
                hideDownloadIcon
                showScoreOverrideContainer
              />
            </div>
          </div>
        </Col>
      </Row>
    </Content>
  );
}

function VerticalOnboardingStepper({ currentSlide }: { currentSlide: number }) {
  const { token } = theme.useToken();

  return (
    <div
      css={css`
        width: 20px;
        position: absolute;
        z-index: 2;
        left: calc(50% - 4px);
        top: calc(50% - 100px);

        @media (max-width: ${token.screenLG}px) {
          display: none;
        }
      `}
    >
      <Steps
        progressDot
        direction="vertical"
        current={currentSlide - 1}
        items={[{}, {}, {}, {}]}
        css={css`
          width: 20px;

          & .ant-steps-item-finish {
            .ant-steps-item-icon > .ant-steps-icon {
              .ant-steps-icon-dot {
                background: ${tokenCssVars.colorSuccess};
              }
            }

            & .ant-steps-item-tail {
              &:after {
                background-color: ${tokenCssVars.colorSuccess};
              }
            }
          }

          & .ant-steps-item-process {
            & .ant-steps-item-tail {
              &:after {
                background-color: ${tokenCssVars.colorPrimary};
              }
            }
          }
        `}
      />
    </div>
  );
}
