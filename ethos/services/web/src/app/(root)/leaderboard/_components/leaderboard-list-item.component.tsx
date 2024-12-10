import { css } from '@emotion/react';
import { type ActivityActor, fromUserKey } from '@ethos/domain';
import { Card, Flex, Typography } from 'antd';
import { UserAvatar } from 'components/avatar/avatar.component';
import { FormattedScore } from 'components/formatted-score/formatted-score';
import { PersonName } from 'components/person-name/person-name.component';
import { tokenCssVars } from 'config/theme';
import { useIsTargetCurrentUser } from 'contexts/current-user.context';

type Props = {
  profile: ActivityActor;
  position: number;
  value: number;
  valueType?: 'score' | 'xp-points';
  showAwards?: boolean;
};

export function LeaderboardListItem({
  profile,
  position,
  value,
  valueType = 'score',
  showAwards,
}: Props) {
  const isCurrentUser = useIsTargetCurrentUser(fromUserKey(profile.userkey));

  return (
    <Card
      css={css`
        margin-bottom: 20px;

        ${isCurrentUser
          ? css`
              background: ${tokenCssVars.colorBgElevated};
              box-shadow: ${tokenCssVars.boxShadowSecondary};
            `
          : null}
      `}
    >
      <Flex justify="space-between" gap={16} align="center">
        <Flex
          css={css`
            color: ${tokenCssVars.colorTextBase};
            min-width: 25px;
            padding: 0 6px;
            height: 25px;
            border-radius: 3px;
            background: ${tokenCssVars.colorBgLayout};
            font-size: 16px;
          `}
          align="center"
          justify="center"
        >
          {position}
        </Flex>
        <UserAvatar actor={profile} />
        <Typography.Text
          css={css`
            font-size: 14px;
          `}
          strong
          ellipsis
        >
          <Flex align="center" gap={4}>
            <PersonName target={profile} color="colorText" size="large" weight="bold" ellipsis />
          </Flex>
        </Typography.Text>
        <FormattedScore
          value={value}
          valueType={valueType}
          showAwards={showAwards}
          position={position}
        />
      </Flex>
    </Card>
  );
}
