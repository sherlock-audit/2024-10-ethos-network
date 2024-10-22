import { CloseOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { reviewActivity } from '@ethos/domain';
import { Button, Flex, Steps, theme, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntercom } from 'react-use-intercom';
import { XpStatusFooter } from './components/xp-status-footer';
import { DoYouTrustThisPersonCard } from './do-you-trust-this-person/feedback-card';
import { IsThisReviewAccurateCard } from './is-this-review-accurate/is-this-review-accurate.card';
import { IsThisScoreRightCard } from './is-this-score-right/is-this-score-right-card';
import { contributorModeFixedContainer } from './styles';
import { WhoDoYouTrustCard } from './who-you-trust-more/who-do-you-trust-card';
import { tokenCssVars } from 'config';
import { useContributorMode } from 'contexts/contributor-mode.context';
import { useCurrentUser } from 'contexts/current-user.context';
import { usePeopleToReview } from 'hooks/api/related-profiles.hooks';
import { useActivity } from 'hooks/user/activities';

const STEPS = 5;
const REVIEW_ACTIVITY_ID = 2;

export function ContributorModeSteps({ onComplete }: { onComplete: () => void }) {
  const [current, setCurrent] = useState(0);
  const { token } = theme.useToken();
  const { update } = useIntercom();
  const { connectedProfile } = useCurrentUser();
  const { setIsContributorModeOpen } = useContributorMode();

  const { data: review } = useActivity(reviewActivity, REVIEW_ACTIVITY_ID, connectedProfile?.id);

  useEffect(() => {
    update({ hideDefaultLauncher: true });

    return () => {
      update({ hideDefaultLauncher: false });
    };
  }, [update]);

  const { data: actorsToReview } = usePeopleToReview(STEPS);

  const onClose = useCallback(() => {
    setIsContributorModeOpen(false);
  }, [setIsContributorModeOpen]);

  const onNext = useCallback(() => {
    setCurrent((p) => {
      if (p === STEPS - 1) {
        onComplete();

        return p;
      }

      return p + 1;
    });
  }, [setCurrent, onComplete]);

  const steps = useMemo(
    () => [
      {
        key: 'trust',
        title: '',
        pageTitle: 'Do you trust this person?',
        content: actorsToReview?.[0] ? (
          <DoYouTrustThisPersonCard actor={actorsToReview?.[0]} onNext={onNext} />
        ) : null,
      },
      {
        key: 'trust2',
        title: '',
        pageTitle: 'Do you trust this person?',
        content: actorsToReview?.[1] ? (
          <DoYouTrustThisPersonCard actor={actorsToReview?.[1]} onNext={onNext} />
        ) : null,
      },
      {
        key: 'score',
        title: '',
        pageTitle: 'Is this person’s score right?',
        content: actorsToReview?.[2] ? (
          <IsThisScoreRightCard actor={actorsToReview?.[2]} onNext={onNext} />
        ) : null,
      },
      {
        key: 'review',
        title: '',
        pageTitle: 'Is this review accurate?',
        content: review ? <IsThisReviewAccurateCard reviewInfo={review} onNext={onNext} /> : null,
      },
      {
        key: 'battle',
        title: '',
        pageTitle: 'Who do you trust more?',
        content:
          actorsToReview?.[3] && actorsToReview?.[4] ? (
            <WhoDoYouTrustCard
              actor1={actorsToReview?.[3]}
              actor2={actorsToReview?.[4]}
              onNext={onNext}
            />
          ) : null,
      },
    ],
    [actorsToReview, onNext, review],
  );

  return (
    <Flex vertical gap={25} align="center" css={contributorModeFixedContainer}>
      <Flex
        align="center"
        justify="space-between"
        css={{ width: '100%', paddingRight: token.padding }}
      >
        <Steps
          items={steps}
          size="small"
          direction="horizontal"
          labelPlacement="vertical"
          responsive={false}
          progressDot
          current={current}
          css={css`
            .ant-steps-item {
              flex: 1;
              text-align: center;
              padding-top: 0;
              margin-right: 0 !important;
            }
            .ant-steps-item-tail {
              background-color: ${tokenCssVars.colorText};
              padding: 0 !important;
              margin: 0 !important;
              left: calc(50% + 12px) !important;
              right: calc(-50% + 12px) !important;
              width: calc(100% - 24px) !important;
            }
            .ant-steps-item-tail::after {
              margin-inline: 0px !important;
              width: 100% !important;
              height: 2px !important;
            }

            .ant-steps-icon-dot {
              transform: scale(0.8) !important;
              background-color: ${tokenCssVars.colorText};
            }
            .ant-steps-item-finish .ant-steps-icon-dot,
            .ant-steps-item-finish .ant-steps-item-tail::after {
              background-color: ${tokenCssVars.colorSuccess};
            }
            .ant-steps-item-active .ant-steps-icon-dot {
              background-color: ${tokenCssVars.colorPrimary};
            }
            .ant-steps-icon-dot::after {
              width: 12px !important;
              height: 12px !important;
            }

            .ant-steps-item-icon {
              margin: 0 auto;
              z-index: 1;
              position: relative;
            }
            .ant-steps-item-content {
              display: none;
            }
            .ant-steps-item-title {
              padding-right: 0 !important;
              margin-top: 0 !important; // Ensure no top margin on the title
            }
            @media (max-width: ${token.screenSM}px) {
              .ant-steps-item-icon {
                margin: 0 auto;
              }
              .ant-steps-item-content {
                width: auto !important;
              }
              .ant-steps-item-title {
                h5.ant-typography {
                  font-size: 12px !important;
                  line-height: 1.2 !important;
                }
              }
            }
          `}
        />
        <Button icon={<CloseOutlined />} onClick={onClose} />
      </Flex>
      <Typography.Title
        css={css`
          font-size: 48px;
          line-height: 1;
          text-align: center;
          @media (max-height: 800px) {
            font-size: 28px;
          }
        `}
      >
        {steps[current]?.pageTitle}
      </Typography.Title>
      {steps[current].content}
      <XpStatusFooter earnedXpAmount={10} />
    </Flex>
  );
}
