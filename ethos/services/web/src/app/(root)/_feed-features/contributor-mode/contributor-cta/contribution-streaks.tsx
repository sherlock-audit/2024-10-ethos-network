import { STREAKS_XP_MULTIPLIER_MAP } from '@ethos/domain';
import { Flex, Typography } from 'antd';
import { FireIcon } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { useThemeMode } from 'contexts/theme-manager.context';

export function ContributionStreaks({ currentStreakDay }: { currentStreakDay: number }) {
  const mode = useThemeMode();

  return (
    <Flex align="center" justify="space-between" gap={10} css={{ width: '100%', maxWidth: 200 }}>
      {STREAKS_XP_MULTIPLIER_MAP.map(({ day, multiplier }) => {
        const isCompleted = currentStreakDay >= day;

        return (
          <Flex key={day} vertical align="center" gap={4}>
            <div css={{ position: 'relative' }}>
              <FireIcon
                css={{
                  color: isCompleted ? tokenCssVars.orange7 : tokenCssVars.colorFillSecondary,
                  fontSize: 34,
                }}
              />
              {!isCompleted && (
                <Typography.Text
                  css={{
                    position: 'absolute',
                    top: '60%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: 12,
                    fontWeight: 600,
                    lineHeight: 1,
                    color: mode === 'light' ? tokenCssVars.orange8 : tokenCssVars.orange6,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {multiplier}x
                </Typography.Text>
              )}
            </div>
            <Typography.Text
              css={{ color: tokenCssVars.colorTextTertiary, textTransform: 'uppercase' }}
            >
              {day}D
            </Typography.Text>
          </Flex>
        );
      })}
    </Flex>
  );
}
