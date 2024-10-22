import { css } from '@emotion/react';
import { type EthosUserTarget } from '@ethos/domain';
import { Button, Flex, theme, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { OnboardingStep } from '../onboarding-step.component';
import { CheckCircleTwoTone } from 'components/icons';
import { tokenCssVars } from 'config';
import { useScore } from 'hooks/user/lookup';

type Props = {
  target: EthosUserTarget;
  defaultScore: number;
  stepCompleted: () => void;
  historyEvaluated?: () => void;
};

export function OnchainHistoryStep({
  target,
  defaultScore,
  stepCompleted,
  historyEvaluated,
}: Props) {
  const { token } = theme.useToken();
  const [isEvaluationLoading, setIsEvaluationLoading] = useState(false);
  const [doesEvaluationChangeScore, setDoesEvaluationChangeScore] = useState(false);
  const [evaluationComplete, setEvaluationComplete] = useState(false);
  const { data: score, isPending: scoreLoading } = useScore(target);

  useEffect(() => {
    if (!scoreLoading && score !== undefined && score !== defaultScore) {
      setDoesEvaluationChangeScore(true);
    }
  }, [score, defaultScore, scoreLoading]);

  function doEvaluation() {
    setIsEvaluationLoading(true);

    setTimeout(() => {
      setEvaluationComplete(true);
      setIsEvaluationLoading(false);
      historyEvaluated?.();
    }, 1500);
  }

  return (
    <OnboardingStep
      title={
        <>
          Onchain
          <br />
          History
        </>
      }
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
              background-color: #cd8e60;
              border-radius: 50%;
            `}
          />
        </div>
      }
      description={
        <Flex
          justify="center"
          css={css`
            width: 374px;
          `}
        >
          <Typography.Paragraph
            css={css`
              font-size: ${token.fontSizeLG}px;
            `}
          >
            We will evaluate your onchain history & add any existing reviews to your Ethos score.
          </Typography.Paragraph>
        </Flex>
      }
    >
      {evaluationComplete ? (
        <>
          <div
            css={css`
              color: ${tokenCssVars.colorSuccess};
              font-size: ${token.fontSizeLG}px;
            `}
          >
            <CheckCircleTwoTone /> Evaluation completed.
            <Typography.Text type="secondary">
              <br />
              {doesEvaluationChangeScore
                ? 'Your score has been adjusted if you had sufficient history or reviews.'
                : 'Your wallet does not have sufficient history to add to your score.'}
            </Typography.Text>
          </div>
          <div>
            <Button
              type="primary"
              onClick={() => {
                stepCompleted?.();
              }}
            >
              Continue
            </Button>
          </div>
        </>
      ) : (
        <div>
          <Button type="primary" loading={isEvaluationLoading} onClick={doEvaluation}>
            Evaluate
          </Button>
        </div>
      )}
    </OnboardingStep>
  );
}
