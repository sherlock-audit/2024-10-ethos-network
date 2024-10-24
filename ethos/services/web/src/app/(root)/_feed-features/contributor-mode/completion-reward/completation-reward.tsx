import { CloseOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { Button, Flex, Typography } from 'antd';
import { contributorModeFixedContainer } from '../styles';
import { XpProfileCard } from './xp-profile-card';
import { XpStreakStats } from './xp-streak-stats';
import { XpUpBadge } from './xp-up-badge';
import { EventsIcon } from 'components/icons';
import { tokenCssVars } from 'config';

export function CompletionReward({ onClose }: { onClose: () => void }) {
  return (
    <Flex vertical gap={25} align="center" css={contributorModeFixedContainer}>
      <Button
        icon={<CloseOutlined />}
        onClick={onClose}
        css={css`
          margin-left: auto;
          margin-right: 10px;
        `}
      />
      <Flex vertical align="center" gap={10}>
        <EventsIcon css={{ fontSize: 50, color: tokenCssVars.colorPrimary }} />
        <Typography.Title level={1} css={{ color: tokenCssVars.colorPrimary }}>
          Thank you!
        </Typography.Title>
        <Typography.Text
          css={{
            textAlign: 'center',
            maxWidth: 214,
            fontSize: 16,
            lineHeight: '24px',
          }}
        >
          Come back tomorrow for more rewards.
        </Typography.Text>
      </Flex>
      <Flex vertical align="center">
        <XpProfileCard xpTotal={1130} />
        <XpUpBadge xpUp={130} />
      </Flex>
      <XpStreakStats currentStreak={2.5} />
    </Flex>
  );
}
