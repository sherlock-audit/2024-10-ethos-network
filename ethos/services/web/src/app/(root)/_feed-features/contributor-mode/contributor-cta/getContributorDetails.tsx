import { streakDaysToMultiplier, type ContributionStats } from '@ethos/domain';
import { Statistic } from 'antd';
import { InfoText } from './InfoText';
import { tokenCssVars } from 'config/theme';

const { Countdown } = Statistic;

export type ContributorCTAState = {
  status: 'new' | 'continue' | 'contribute' | 'completed';
  title: 'Contribute.' | 'Continue.' | 'day streak!';
  descriptionBefore?: React.ReactNode;
  description: string;
  descriptionAfter?: React.ReactNode;
  ribbonText: string;
  buttonText: React.ReactNode;
};

export function getContributorState({
  stats,
  onTimeout,
  mode,
}: {
  stats: ContributionStats;
  onTimeout: () => Promise<void>;
  mode: 'light' | 'dark';
}): ContributorCTAState {
  const { canGenerateDailyContributions, totalXp, pendingXp, pendingBundleCount } = stats;
  const isFirstTimeUser = totalXp === 0 && canGenerateDailyContributions;

  const streakMultiplier = streakDaysToMultiplier(stats.streakDaysOptimistic);

  if (isFirstTimeUser) {
    return {
      status: 'new',
      title: 'Contribute.',
      description: 'Write reviews on Ethos and earn contributor XP daily',
      ribbonText: 'New',
      buttonText: 'Start',
    };
  }
  if (stats.pendingCount > 0) {
    return {
      status: 'continue',
      title: 'Continue.',
      description: `Earn ${pendingXp} XP more`,
      descriptionAfter: (
        <InfoText>
          Time left to finish:
          <Countdown
            value={stats.resetTimestamp}
            valueStyle={{
              fontSize: 12,
              color: mode === 'light' ? tokenCssVars.orange8 : tokenCssVars.orange6,
              lineHeight: '20px',
              textAlign: 'center',
              fontWeight: 600,
            }}
            onFinish={onTimeout}
          />
        </InfoText>
      ),
      buttonText: 'Resume',
      ribbonText: `${pendingBundleCount} left`,
    };
  }

  return {
    status: canGenerateDailyContributions ? 'contribute' : 'completed',
    title: 'day streak!',
    descriptionBefore: <InfoText>{streakMultiplier}x XP multiplier.</InfoText>,
    description: canGenerateDailyContributions
      ? 'Your daily tasks are ready:'
      : 'Contribute again in:',
    ribbonText: canGenerateDailyContributions ? 'Contribute & earn' : `Completed`,
    buttonText: canGenerateDailyContributions ? (
      'Start'
    ) : (
      <Countdown value={stats.resetTimestamp} valueStyle={{ fontSize: 12 }} onFinish={onTimeout} />
    ),
  };
}
