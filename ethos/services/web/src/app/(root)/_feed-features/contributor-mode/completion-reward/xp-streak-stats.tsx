import { css } from '@emotion/react';
import { Avatar, Flex, Typography } from 'antd';
import { CheckIcon, FireDepartmentIcon } from 'components/icons';
import { tokenCssVars } from 'config';

const streaks = [
  {
    streak: 1.5,
    description: 'Today',
    size: 19,
  },
  {
    streak: 2.5,
    description: '3 Days',
    size: 24,
  },
  {
    streak: 3.5,
    description: '5 Days',
    size: 33,
  },
  {
    streak: 5,
    description: '7 Days',
    size: 39,
  },
];

export function XpStreakStats({ currentStreak }: { currentStreak: number }) {
  return (
    <Flex
      vertical
      gap={12}
      align="center"
      css={{
        background: tokenCssVars.colorPrimary,
        padding: 20,
        marginTop: 'auto',
        width: '100%',
        color: tokenCssVars.colorBgLayout,
        '& *': {
          color: 'inherit',
        },
      }}
    >
      <Flex vertical align="center" gap={1}>
        <FireDepartmentIcon css={{ fontSize: 39 }} />
        <Typography.Text
          css={css`
            font-size: 25px;
            line-height: 35px;
            letter-spacing: 0.5px;
          `}
        >
          Your Current Streak is {currentStreak}x
        </Typography.Text>
        <Typography.Text
          css={{
            lineHeight: '20px',
          }}
        >
          Increase your streak and multiply your points
        </Typography.Text>
      </Flex>
      <Flex align="center">
        {streaks.map((streak, index) => {
          const isStreakCompleted = streak.streak <= currentStreak;

          return (
            <Flex
              key={streak.description}
              vertical
              align="center"
              gap={12}
              justify="space-between"
              css={{
                height: '100%',
              }}
            >
              <Flex
                css={{
                  marginTop: 'auto',
                  marginBottom: 'auto',
                }}
              >
                {index !== 0 && <StreakDivider />}
                <Avatar
                  size={streak.size}
                  css={css`
                    margin-left: ${index === 0 ? 32 : 0}px;
                    margin-right: ${index === streaks.length - 1 ? 32 : 0}px;
                    background: ${tokenCssVars.colorBgContainer};
                    color: ${isStreakCompleted
                      ? tokenCssVars.colorSuccess
                      : tokenCssVars.colorPrimary};
                  `}
                  icon={isStreakCompleted ? <CheckIcon /> : undefined}
                >
                  {streak.streak}x
                </Avatar>
                {index !== streaks.length - 1 && <StreakDivider />}
              </Flex>
              <Typography.Text
                css={{
                  lineHeight: 1,
                }}
              >
                {streak.description}
              </Typography.Text>
            </Flex>
          );
        })}
      </Flex>
    </Flex>
  );
}

function StreakDivider() {
  return (
    <div
      css={{
        height: '2px',
        width: 32,
        background: tokenCssVars.colorTextDisabled,
        marginTop: 'auto',
        marginBottom: 'auto',
      }}
    />
  );
}
