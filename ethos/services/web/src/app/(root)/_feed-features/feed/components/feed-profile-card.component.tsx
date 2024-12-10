import { css } from '@emotion/react';
import { type EthosUserTarget } from '@ethos/domain';
import { DEFAULT_STARTING_SCORE } from '@ethos/score';
import { Card, Flex, Typography } from 'antd';
import { zeroAddress } from 'viem';
import { UserAvatar } from 'components/avatar/avatar.component';
import { Logo } from 'components/icons';
import { PersonName } from 'components/person-name/person-name.component';
import { ReviewStatsRow, VouchStatsRow, XPStatsRow } from 'components/profile-stats';
import { useCurrentUser } from 'contexts/current-user.context';
import { useRouteTo } from 'hooks/user/hooks';
import { useScoreGraph } from 'utils/score-graph/use-score-graph';
import { useScoreCategory } from 'utils/scoreCategory';

export function FeedProfileCard() {
  const { connectedProfile, connectedActor } = useCurrentUser();

  const connectedUserTarget: EthosUserTarget | null = connectedProfile
    ? { profileId: connectedProfile.id }
    : null;

  const target = connectedUserTarget ?? { address: zeroAddress };
  const { data: targetRouteTo } = useRouteTo(target);
  const { score } = connectedActor;

  const [scoreCategory] = useScoreCategory(score || DEFAULT_STARTING_SCORE);
  const scoreGraphUrl = useScoreGraph(connectedUserTarget ?? { address: zeroAddress });

  return (
    <Card
      css={css`
        background-image: url(${scoreGraphUrl});
        background-position: bottom center;
        background-size: 101% 57%;
        background-repeat: no-repeat;
        background-position: bottom -1px center;
      `}
    >
      <Flex vertical gap={24}>
        <Flex gap={12}>
          <UserAvatar actor={connectedActor} showScore={false} showHoverCard={false} />
          <Flex vertical gap={8}>
            <PersonName
              target={connectedActor}
              weight="bold"
              color="colorPrimary"
              showProfilePopover={false}
            />
            <ReviewStatsRow target={target} gap={4} />
            <VouchStatsRow target={target} profile={connectedProfile} gap={4} />
            <XPStatsRow profile={connectedProfile} gap={4} xpPageUrl={targetRouteTo.xpHistory} />
          </Flex>
        </Flex>

        <Flex vertical gap={4} align="flex-end">
          <Flex gap={10} align="center">
            <Typography.Title
              level={2}
              css={css`
                font-size: 52px;
                line-height: 26px;
                color: ${scoreCategory.color};
                margin-bottom: 0;
              `}
            >
              {score}
            </Typography.Title>
            <Logo
              css={css`
                font-size: 35px;
                color: ${scoreCategory.color};
              `}
            />
          </Flex>
          <Typography.Title
            css={css`
              color: ${scoreCategory.color};
              text-transform: capitalize;
              line-height: 32px;
              font-size: 24px;
              margin-top: 0;
            `}
            level={2}
          >
            {scoreCategory.status}
          </Typography.Title>
        </Flex>
      </Flex>
    </Card>
  );
}
