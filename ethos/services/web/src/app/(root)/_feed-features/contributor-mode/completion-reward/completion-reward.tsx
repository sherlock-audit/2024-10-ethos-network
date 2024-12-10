import { CloseOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { Button, Flex, theme, Typography } from 'antd';
import { motion } from 'framer-motion';
import { rewardAnimation } from '../helpers/animation';
import { ContributorWingLeftSvg } from '../illustration/contributor-wing-left.svg';
import { contributorModeFixedContainer } from '../styles';
import { XpCard } from './xp-card';
import { EventsIcon } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { useCurrentUser } from 'contexts/current-user.context';
import { useContributionStats } from 'hooks/api/echo.hooks';

export function CompletionReward({ onClose }: { onClose: () => void }) {
  const { connectedProfile } = useCurrentUser();
  // -1 is used as a unique key to trigger a fresh fetch of the stats
  const { data: stats } = useContributionStats({
    profileId: connectedProfile?.id ?? -1,
    contributionId: -1,
  });

  const { token } = theme.useToken();

  const bgWingStyle = css`
    font-size: 48px;
    color: ${tokenCssVars.colorText};
    position: absolute;
    pointer-events: none;
    top: 112px;
    opacity: 0.08;
  `;

  return (
    <Flex
      vertical
      gap={20}
      align="center"
      css={contributorModeFixedContainer}
      component={motion.div}
      {...rewardAnimation}
    >
      <Button
        icon={<CloseOutlined />}
        onClick={onClose}
        css={css`
          margin-left: auto;
          margin-right: 10px;
        `}
      />
      <div
        css={css`
          padding-top: 32px;
        `}
      />
      <ContributorWingLeftSvg
        css={css`
          ${bgWingStyle}
          left: calc(50% - 150px);
          @media (min-width: ${token.screenMD}px) {
            left: max(27%, 10px);
          }
        `}
      />
      <ContributorWingLeftSvg
        css={css`
          ${bgWingStyle}
          right: calc(50% - 150px);
          transform: scaleX(-1); // flip horizontally
          @media (min-width: ${token.screenMD}px) {
            right: max(27%, 10px);
          }
        `}
      />
      <Flex vertical align="center" gap={75}>
        <Flex vertical align="center" gap={10}>
          <EventsIcon
            css={css`
              font-size: 50px;
              color: ${tokenCssVars.colorPrimary};
              padding: 12px;
              background-color: ${tokenCssVars.colorFillSecondary};
              border-radius: 50%;
              align-items: center;
              justify-content: center;
            `}
          />
          <Flex vertical align="center" gap={4}>
            <Typography.Title level={3}>Complete.</Typography.Title>
            <Typography.Text
              type="secondary"
              css={css`
                text-align: center;
              `}
            >
              Thank you for
              <br /> your contributions.
            </Typography.Text>
          </Flex>
        </Flex>
        <Flex vertical align="center">
          <XpCard
            xpTotal={stats?.totalXp ?? 0}
            xpToday={stats?.todayXp ?? 0}
            currentStreakDay={stats?.streakDaysOptimistic ?? 0}
          />
        </Flex>
      </Flex>
    </Flex>
  );
}
