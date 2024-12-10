import { CloseOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { type ContributionModel } from '@ethos/domain';
import { Button, Flex, Progress, theme, Typography } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { XpStatusFooter } from '../components/xp-status-footer';
import { useContributionSteps } from '../contexts/contribution-steps.context';
import { cardAnimation, cardTitleAnimation, containerAnimation } from '../helpers/animation';
import { contributorModeFixedContainer } from '../styles';
import { useContributorModeSteps } from './useContributorModeSteps';
import { tokenCssVars } from 'config/theme';
import { useHideIntercom } from 'hooks/useHideIntercom';
import { useLockBodyScroll } from 'hooks/useLockBodyScroll';

export function ContributorModeSteps({
  onComplete,
  onClose,
  contributionData,
}: {
  onComplete: () => void;
  onClose: () => void;
  contributionData: Array<{
    contributions: ContributionModel[];
    id: number;
  }>;
}) {
  const {
    stepDetails: { bundleIndex, chainedItemIndex },
    setStepDetails,
  } = useContributionSteps();

  const { token } = theme.useToken();
  useHideIntercom();

  const steps = useContributorModeSteps({ contributionData, onComplete, setStepDetails });
  const activeContribution = contributionData[bundleIndex]?.contributions?.[chainedItemIndex];
  useLockBodyScroll(activeContribution && activeContribution?.action.type !== 'REVIEW');

  return (
    <Flex
      vertical
      gap={25}
      align="center"
      css={contributorModeFixedContainer}
      component={motion.div}
      {...containerAnimation}
    >
      <Flex
        align="center"
        justify="space-between"
        css={{ width: '100%', paddingRight: token.padding, paddingLeft: token.padding }}
      >
        <Progress
          showInfo={false}
          percent={(bundleIndex / contributionData.length) * 100}
          trailColor={tokenCssVars.colorBgElevated}
          css={{ paddingRight: token.padding, paddingLeft: token.padding }}
        />
        <Button icon={<CloseOutlined />} onClick={onClose} />
      </Flex>
      <AnimatePresence initial={false} mode="wait">
        <motion.div {...cardTitleAnimation} key={steps[bundleIndex]?.key}>
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
            {steps[bundleIndex]?.pageTitle}
          </Typography.Title>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence initial={false} mode="wait">
        <motion.div {...cardAnimation} key={steps[bundleIndex]?.key}>
          {steps[bundleIndex]?.content}
        </motion.div>
      </AnimatePresence>
      {contributionData?.[bundleIndex] ? (
        <XpStatusFooter
          contribution={contributionData[bundleIndex].contributions?.[chainedItemIndex]}
          isInitial={bundleIndex === 0 && chainedItemIndex === 0}
          totalSteps={contributionData.length}
          bundleId={contributionData[bundleIndex].id}
        />
      ) : null}
    </Flex>
  );
}
