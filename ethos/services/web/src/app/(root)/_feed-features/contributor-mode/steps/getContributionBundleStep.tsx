import { type ContributionModel } from '@ethos/domain';
import { StepContent } from './step-content.component';
import { type GetNextPendingBundleIndex } from './useContributorModeSteps';

export type ContributionStep = {
  key: number;
  title: string;
  pageTitle: string;
  content: JSX.Element;
};

export function getContributionBundleStep({
  contributions,
  getNextPendingStepDetails,
}: {
  contributions: ContributionModel[];
  getNextPendingStepDetails: GetNextPendingBundleIndex;
}): ContributionStep {
  const [firstContribution] = contributions;
  const content = (
    <StepContent
      contributions={contributions}
      getNextPendingStepDetails={getNextPendingStepDetails}
    />
  );

  switch (firstContribution.action.type) {
    case 'REVIEW':
      return {
        key: firstContribution.id,
        title: '',
        pageTitle: 'Do you want to review them?',
        content,
      };

    case 'REVIEW_VOTE':
      return {
        key: firstContribution.id,
        title: '',
        pageTitle: 'Do you want to vote on this review?',
        content,
      };
    case 'TRUST_BATTLE':
      return {
        key: firstContribution.id,
        title: '',
        pageTitle: 'Who do you trust more?',
        content,
      };
    case 'TRUST_CHECK':
      return {
        key: firstContribution.id,
        title: '',
        pageTitle: 'Do you trust',
        content,
      };
    case 'REVIEW_CHECK':
      return {
        key: firstContribution.id,
        title: '',
        pageTitle: 'Is this review helpful?',
        content,
      };
    case 'SCORE_CHECK':
      return {
        key: firstContribution.id,
        title: '',
        pageTitle: 'Is their score right?',
        content,
      };

    default: {
      const _exhaustiveCheck: never = firstContribution.action;

      return _exhaustiveCheck;
    }
  }
}
