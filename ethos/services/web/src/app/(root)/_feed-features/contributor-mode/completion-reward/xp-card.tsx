import { css } from '@emotion/react';
import { STREAKS_XP_MULTIPLIER_MAP } from '@ethos/domain';
import { formatXPScore } from '@ethos/helpers';
import { Card, Flex, Typography } from 'antd';
import { ContributionStreaks } from '../contributor-cta/contribution-streaks';
import { contributorModeCard, getCardWidthStyles } from '../styles';
import { XpUpBadge } from './xp-up-badge';
import { EthosStar } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { useThemeMode } from 'contexts/theme-manager.context';

const { cardWidth } = getCardWidthStyles({
  cardWidth: 350,
});

export function XpCard({
  xpTotal,
  xpToday,
  currentStreakDay,
}: {
  xpTotal: number;
  xpToday: number;
  currentStreakDay: number;
}) {
  const mode = useThemeMode();

  return (
    <Card
      bordered={false}
      css={css`
        ${contributorModeCard}
        width: ${cardWidth};
        padding: 24px;
      `}
    >
      <Flex vertical>
        <Flex vertical gap={30}>
          <Flex vertical gap={12} align="center">
            <Typography.Text
              type="secondary"
              css={{
                fontSize: 16,
              }}
            >
              Contributor XP total
            </Typography.Text>
            <Flex gap={10} align="center">
              <Typography.Title
                level={2}
                css={{
                  fontSize: 66,
                  lineHeight: 1,
                }}
              >
                {formatXPScore(xpTotal)}
              </Typography.Title>
              <EthosStar
                css={{
                  fontSize: 48,
                  color: mode === 'light' ? tokenCssVars.orange7 : tokenCssVars.orange6,
                }}
              />
            </Flex>
            <XpUpBadge xpUp={xpToday} />
          </Flex>
          <Flex gap={10} align="center" vertical>
            <Typography.Text type="secondary" css={{ fontSize: 16 }}>
              {currentStreakDay}-day streak{' '}
              {`(${
                STREAKS_XP_MULTIPLIER_MAP.filter(({ day }) => day <= currentStreakDay).slice(-1)[0]
                  ?.multiplier ?? 1
              }x)`}
            </Typography.Text>
            <ContributionStreaks currentStreakDay={currentStreakDay} />
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}
