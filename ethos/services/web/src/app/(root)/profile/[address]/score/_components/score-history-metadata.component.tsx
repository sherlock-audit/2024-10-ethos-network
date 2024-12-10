import { formatDate } from '@ethos/helpers';
import { ScoreElementNames } from '@ethos/score';
import { useFeatureGate } from '@statsig/react-bindings';
import { Typography } from 'antd';
import { featureGates } from 'constant/feature-flags';

export function ScoreHistoryMetadata({
  metadata,
  elementName,
}: {
  metadata: Record<string, number> | null;
  elementName: string;
}) {
  const isScoreMetadataEnabled = useFeatureGate(featureGates.showScoreMetadata).value;

  if (!metadata || !isScoreMetadataEnabled) return null;

  const metadataItems: string[] = [];

  switch (elementName) {
    case ScoreElementNames.TWITTER_ACCOUNT_AGE:
      if (metadata.noTwitterAccount) {
        metadataItems.push('No Twitter account');
      }
      if (metadata.oldestAccount) {
        metadataItems.push(`Account created ${formatDate(metadata.oldestAccount)}`);
      }
      if (metadata.accountsChecked) {
        metadataItems.push(`${metadata.accountsChecked} accounts checked`);
      }
      break;

    case ScoreElementNames.ETHEREUM_ADDRESS_AGE:
      if (metadata.firstTransaction) {
        metadataItems.push(`First tx ${formatDate(metadata.firstTransaction)}`);
      }
      if (metadata.insufficientData) {
        metadataItems.push('No transaction history');
      }
      break;

    case ScoreElementNames.REVIEW_IMPACT:
      if (metadata.averageAuthorScore !== undefined) {
        metadataItems.push(`Avg author score: ${metadata.averageAuthorScore.toFixed(1)}`);
      }
      if (metadata.positiveReviewCount !== undefined) {
        metadataItems.push(`${metadata.positiveReviewCount} positive`);
      }
      if (metadata.negativeReviewCount !== undefined) {
        metadataItems.push(`${metadata.negativeReviewCount} negative`);
      }
      if (metadata.neutralReviewCount !== undefined) {
        metadataItems.push(`${metadata.neutralReviewCount} neutral`);
      }
      break;

    case ScoreElementNames.ETHOS_INVITATION_SOURCE_CREDIBILITY:
      if (metadata.inviterScore !== undefined) {
        metadataItems.push(`Inviter score: ${metadata.inviterScore.toFixed(1)}`);
      }
      if (metadata.bondingPeriodEndDate) {
        metadataItems.push(`Bonding ends ${formatDate(metadata.bondingPeriodEndDate)}`);
      }
      break;

    case ScoreElementNames.VOUCHED_ETHEREUM_IMPACT:
      if (metadata.vouches !== undefined) {
        metadataItems.push(`${metadata.vouches} vouches`);
      }
      if (metadata.stakedEthDays !== undefined) {
        metadataItems.push(`${metadata.stakedEthDays.toFixed(1)} ETH days`);
      }
      break;

    case ScoreElementNames.MUTUAL_VOUCHER_BONUS:
      if (metadata.mutualVouches !== undefined) {
        metadataItems.push(`${metadata.mutualVouches} mutual vouches`);
      }
      if (metadata.mutualStakedEthDays !== undefined) {
        metadataItems.push(`${metadata.mutualStakedEthDays.toFixed(1)} mutual ETH days`);
      }
      if (metadata.mutualVouchMultiplier !== undefined) {
        metadataItems.push(`${(metadata.mutualVouchMultiplier * 100).toFixed(0)}% multiplier`);
      }
      break;

    case ScoreElementNames.VOTE_IMPACT:
      if (metadata.positiveVoteActivities !== undefined) {
        metadataItems.push(`${metadata.positiveVoteActivities} positive votes`);
      }
      if (metadata.negativeVoteActivities !== undefined) {
        metadataItems.push(`${metadata.negativeVoteActivities} negative votes`);
      }
      if (metadata.neutralVoteActivities !== undefined) {
        metadataItems.push(`${metadata.neutralVoteActivities} neutral votes`);
      }
      break;
  }

  if (metadataItems.length === 0) return null;

  return <Typography.Text type="secondary">{metadataItems.join(', ')}</Typography.Text>;
}
