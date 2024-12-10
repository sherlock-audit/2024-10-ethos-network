import { css } from '@emotion/react';
import { type ContributionStats, type ContributionModel } from '@ethos/domain';
import { Flex, theme, Typography } from 'antd';
import { UserAvatar } from 'components/avatar/avatar.component';
import { ArrowUpScoreIcon, EthosStar } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { useCurrentUser } from 'contexts/current-user.context';
import { useThemeMode } from 'contexts/theme-manager.context';
import { useContributionStats } from 'hooks/api/echo.hooks';
import { useIsIOS } from 'hooks/use-is-IOS';

function getXpMessage({
  bundleId,
  contribution,
  stats,
}: {
  bundleId: number;
  contribution: ContributionModel;
  stats?: ContributionStats | null;
}) {
  if (contribution.action.type === 'REVIEW') {
    return (
      <>
        Leave a review & earn <strong>{contribution.experience} XP.</strong>
      </>
    );
  }

  if (contribution.action.type === 'REVIEW_VOTE') {
    return (
      <>
        Vote on the review & earn <strong>{contribution.experience} XP.</strong>
      </>
    );
  }

  if (!stats?.previousBundleXpLookup[bundleId]) {
    return <>You skipped the last question.</>;
  }

  return (
    <>
      You gained <strong>{stats?.previousBundleXpLookup[bundleId]} more XP.</strong>
    </>
  );
}

export function XpStatusFooter({
  bundleId,
  contribution,
  isInitial,
  totalSteps,
}: {
  bundleId: number;
  contribution: ContributionModel;
  isInitial: boolean;
  totalSteps: number;
}) {
  const { connectedActor: actor, connectedProfile } = useCurrentUser();
  const { token } = theme.useToken();
  const mode = useThemeMode();
  const isIOS = useIsIOS();

  const { data: stats } = useContributionStats({
    profileId: connectedProfile?.id ?? -1,
    contributionId: contribution.id,
  });

  return (
    <Flex
      align="center"
      justify="space-between"
      gap={8}
      css={css`
        position: relative;
        padding: 17px 12px;
        padding-bottom: ${isIOS ? '35px' : '17px'};
        background: ${tokenCssVars.colorPrimary};
        margin-top: auto;
        width: 100%;

        @media (min-width: ${token.screenSM}px) {
          margin-bottom: ${token.margin}px;
          padding: 20px;
          border-radius: 12px;
          width: 430px;
          justify-content: space-between;
        }
      `}
    >
      <Flex align="center" gap={12}>
        <UserAvatar actor={actor} showScore={false} showHoverCard={false} renderAsLink={false} />
        <Typography.Text
          css={{
            color: tokenCssVars.colorBgContainer,
            lineHeight: '20px',
          }}
        >
          {isInitial ? (
            <>Complete {totalSteps} questions to earn XP.</>
          ) : (
            getXpMessage({
              bundleId,
              contribution,
              stats,
            })
          )}
        </Typography.Text>
      </Flex>
      {stats?.todayXp ? (
        <Flex
          align="center"
          justify="flex-end"
          gap={2}
          css={css`
            padding: 4px 8px;
            color: ${tokenCssVars.colorBgContainer};
            background: ${mode === 'light' ? tokenCssVars.colorPrimaryTextActive : '#2E6BA4'};
            border-radius: 8px;
          `}
        >
          <ArrowUpScoreIcon css={{ fontSize: 32 }} />
          <Typography.Title
            level={1}
            css={{
              color: tokenCssVars.colorBgContainer,
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            {stats?.todayXp ?? 0}
          </Typography.Title>
          <EthosStar
            css={css`
              margin-left: 3px;
              font-size: 26px;
            `}
          />
        </Flex>
      ) : null}
    </Flex>
  );
}
