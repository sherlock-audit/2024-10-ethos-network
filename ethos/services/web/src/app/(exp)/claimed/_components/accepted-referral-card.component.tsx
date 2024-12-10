import { css } from '@emotion/react';
import { Card, Flex, theme, Typography } from 'antd';
import { ProfileAvatar } from 'app/(exp)/_components/profile-avatar.component';
import { ArrowUpScoreIcon, EthosStar } from 'components/icons';
import { tokenCssVars } from 'config/theme';

type AcceptedReferralCardProps = {
  avatarName: string;
  name: string;
  expValueImpact: number;
};

export function AcceptedReferralCard({
  avatarName,
  name,
  expValueImpact,
}: AcceptedReferralCardProps) {
  const { token } = theme.useToken();

  return (
    <Card
      css={css({
        width: '100%',
        maxWidth: '400px',
        backgroundColor: tokenCssVars.colorBgLayout,
      })}
    >
      <Flex gap={token.marginSM} justify="space-between" align="center">
        <Flex gap={token.marginSM} align="center">
          <ProfileAvatar size="default" avatarName={avatarName} score={1020} />
          <Typography.Text>{name}</Typography.Text>
        </Flex>
        <Flex gap={token.marginXXS}>
          <Typography.Text type="secondary">
            <Flex align="center" gap={token.marginXS}>
              <ArrowUpScoreIcon css={css({ color: tokenCssVars.colorSuccess, fontSize: '120%' })} />
              {expValueImpact}
              <span
                css={css({
                  fontSize: '86%',
                  color: tokenCssVars.orange7,
                })}
              >
                <EthosStar />
              </span>
            </Flex>
          </Typography.Text>
        </Flex>
      </Flex>
    </Card>
  );
}
