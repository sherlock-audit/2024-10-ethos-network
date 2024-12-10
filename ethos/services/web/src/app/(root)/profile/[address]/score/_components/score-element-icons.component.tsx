import { XOutlined } from '@ant-design/icons';

import { ScoreElementNames } from '@ethos/score';
import { type ReactNode } from 'react';
import { ArrowUp, Ethereum, InviteFilled, ReviewFilled, VouchFilled } from 'components/icons';

const scoreElementIcons: Record<ScoreElementNames, ReactNode> = {
  [ScoreElementNames.TWITTER_ACCOUNT_AGE]: <XOutlined />,
  [ScoreElementNames.ETHEREUM_ADDRESS_AGE]: <Ethereum />,
  [ScoreElementNames.REVIEW_IMPACT]: <ReviewFilled />,
  [ScoreElementNames.ETHOS_INVITATION_SOURCE_CREDIBILITY]: <InviteFilled />,
  [ScoreElementNames.VOUCHED_ETHEREUM_IMPACT]: <VouchFilled />,
  [ScoreElementNames.MUTUAL_VOUCHER_BONUS]: <VouchFilled />,
  [ScoreElementNames.VOTE_IMPACT]: <ArrowUp />,
  [ScoreElementNames.NUMBER_OF_VOUCHERS_IMPACT]: <VouchFilled />,
};

const scoreElementValues = Object.values(ScoreElementNames).map((value) => value.toString());

function isScoreElementName(name: string): name is ScoreElementNames {
  return scoreElementValues.includes(name);
}

export function ScoreElementIcon({ name }: { name: string }): ReactNode {
  if (isScoreElementName(name)) {
    return scoreElementIcons[name];
  }

  return null;
}
