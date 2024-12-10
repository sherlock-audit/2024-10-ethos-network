import { css } from '@emotion/react';
import { type EthosUserTarget, fromUserKey } from '@ethos/domain';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Flex, theme, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { ReviewModal } from '../../../../../(root)/profile/_components/review-modal/review-modal.component';
import { dynamicConfigs } from '../../../../../../constant/feature-flags';
import { OnboardingStep } from '../onboarding-step.component';
import { ContributionSteps } from './contribution-steps/contribution-steps.component';
import { UserAvatar } from 'components/avatar/avatar.component';
import { ReviewFilled } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { ONBOARDING_SKIP_SESSION_KEY } from 'constant/constants';
import { invalidate } from 'constant/queries/cache.invalidation';
import { cacheKeys } from 'constant/queries/queries.constant';
import { useCurrentUser } from 'contexts/current-user.context';
import { usePeopleToReview } from 'hooks/api/related-profiles.hooks';
import { useSessionStorage } from 'hooks/use-storage';

type Props = {
  actionHover?: (impact: number) => void;
  stepCompleted: () => void;
};

export function StartContributingStep({ stepCompleted }: Props) {
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const { connectedAddress } = useCurrentUser();
  const [hasProfilesToReview, setHasProfilesToReview] = useState(true);
  const [isVouchReviewModalOpen, setIsVouchReviewModalOpen] = useState(false);
  const [currentReviewTarget, setCurrentReviewTarget] = useState<EthosUserTarget | null>(null);

  const [, setSkipOnboardingValue] = useSessionStorage<boolean>(ONBOARDING_SKIP_SESSION_KEY);
  const { data: profilesToReview, isPending: isLoadingProfiles } = usePeopleToReview(
    3,
    dynamicConfigs.onboardingProfilesToReview,
  );

  useEffect(() => {
    if (!isLoadingProfiles && !profilesToReview?.length) {
      setHasProfilesToReview(false);
    }
  }, [isLoadingProfiles, profilesToReview, setHasProfilesToReview]);

  async function onSkip() {
    if (connectedAddress) {
      await invalidate(queryClient, [cacheKeys.profile.byAddress(connectedAddress)]);
      await invalidate(queryClient, [
        cacheKeys.invitation.bySubject({ address: connectedAddress }),
      ]);
      setSkipOnboardingValue(true);
      stepCompleted?.();
    }
  }

  function closeVouchReviewModal(successful: boolean) {
    if (successful) {
      stepCompleted();
    }
    setIsVouchReviewModalOpen(false);
  }

  return (
    <OnboardingStep
      icon={
        <div
          css={css`
            position: relative;
            width: 150px;
            height: 150px;
          `}
        >
          <div
            css={css`
              width: 180px;
              height: 180px;
              background-color: #8993bd;
              border-radius: 50%;
            `}
          />
        </div>
      }
      title={
        <>
          Start
          <br />
          Contributing
        </>
      }
      description={
        <Flex
          justify="center"
          align="center"
          vertical
          css={css`
            padding: 0;
            @media (min-width: ${token.screenMD}px) {
              width: 500px;
              margin-inline: 0;
              padding: 20px;
            }
          `}
        >
          <Typography.Paragraph
            css={css`
              font-size: ${token.fontSizeLG}px;
              margin-bottom: 0;
            `}
          >
            In the future, you will earn contributor XP by helping others understand who can be
            trusted through Ethos’ mechanisms:
          </Typography.Paragraph>
        </Flex>
      }
    >
      <Flex
        gap={token.marginXXL}
        justify="center"
        css={css`
          @media (max-width: ${token.screenMD}px) {
            width: 100%;
            padding: 0 20px;
            flex-direction: column;
            gap: 12px !important;
          }
          /* Compensating transition between 990 and 1150 pixels causing column overlap */
          @media (min-width: 990px) and (max-width: 1150px) {
            gap: 10px !important;
          }
        `}
      >
        <ContributionSteps />
        {hasProfilesToReview && (
          <div
            css={css`
              background: ${tokenCssVars.colorBgLayout};
              border-radius: 7px;
              text-align: left;
              padding: 10px 20px;

              @media (min-width: ${token.screenMD}px) {
                width: 250px;
                padding: 18px 10px 30px 20px;
              }

              @media (min-width: 990px) and (max-width: 1150px) {
                width: 230px;
              }
            `}
          >
            <Typography.Text strong>
              <Flex gap={6} align="center">
                <ReviewFilled /> Earn contributor XP
              </Flex>
            </Typography.Text>

            <Flex
              gap={30}
              vertical
              css={css`
                margin-top: 18px;

                @media (max-width: ${token.screenMD}px) {
                  flex-direction: row;
                  justify-content: space-evenly;
                }
              `}
            >
              {profilesToReview?.map((actor) => (
                <Flex
                  gap={12}
                  key={actor.userkey}
                  css={css`
                    @media (max-width: ${token.screenMD}px) {
                      flex-direction: column;
                      flex: 1 1 0px;
                      width: 25%;
                      align-items: center;
                    }
                  `}
                >
                  <div>
                    <UserAvatar actor={actor} size="large" />
                  </div>
                  <Flex
                    vertical
                    gap={8}
                    justify="center"
                    css={css`
                      width: 100%;
                      overflow: hidden;
                      @media (max-width: ${token.screenMD}px) {
                        align-items: center;
                        text-align: center;
                      }
                    `}
                  >
                    <Typography.Title
                      ellipsis
                      level={5}
                      css={css`
                        width: 100%;
                        display: block;
                      `}
                    >
                      {actor.name}
                    </Typography.Title>
                    <div>
                      <Button
                        color="primary"
                        size="small"
                        variant="outlined"
                        css={css`
                          background: transparent;
                        `}
                        onClick={() => {
                          setCurrentReviewTarget(fromUserKey(actor.userkey));
                          setIsVouchReviewModalOpen(true);
                        }}
                      >
                        Review
                      </Button>
                    </div>
                  </Flex>
                </Flex>
              ))}
            </Flex>
          </div>
        )}
      </Flex>
      <div>
        <Button
          type="text"
          css={css`
            color: ${tokenCssVars.colorPrimary};
          `}
          onClick={onSkip}
        >
          Skip & finish
        </Button>
      </div>
      {currentReviewTarget && (
        <ReviewModal
          target={currentReviewTarget}
          isOpen={isVouchReviewModalOpen}
          close={closeVouchReviewModal}
        />
      )}
    </OnboardingStep>
  );
}
