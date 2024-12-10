import { css } from '@emotion/react';
import { Divider, Flex, theme, Typography } from 'antd';
import { AcceptedReferralCard } from '../_components/accepted-referral-card.component';
import { ActionButton } from 'app/(exp)/_components/action-button.component';
import { AwardIcon } from 'components/icons';
import { tokenCssVars } from 'config/theme';

export function StepTwo() {
  const { token } = theme.useToken();

  return (
    <Flex
      vertical
      align="center"
      justify="center"
      gap={token.marginLG}
      css={css({
        backgroundColor: tokenCssVars.colorBgContainer,
        height: tokenCssVars.fullHeight,
        padding: `${token.paddingLG}px`,
      })}
    >
      <Typography.Title
        level={3}
        css={css({
          textAlign: 'center',
        })}
      >
        Accepted referrals
      </Typography.Title>
      <Typography.Text
        css={css({
          textAlign: 'center',
        })}
      >
        0x5 Capital
      </Typography.Text>
      <AcceptedReferralCard avatarName="avatar1" expValueImpact={1232} name="Trevor" />
      <AcceptedReferralCard avatarName="avatar2" expValueImpact={1132} name="Ben" />
      <Divider
        css={css({
          backgroundColor: tokenCssVars.colorBgLayout,
        })}
      />
      <AwardIcon
        css={css`
          color: ${tokenCssVars.colorPrimary};
          font-size: 50px;
        `}
      />
      <Typography.Title
        level={3}
        css={css({
          textAlign: 'center',
        })}
      >
        Get more contributor XP
      </Typography.Title>
      <Typography.Text
        css={css({
          textAlign: 'center',
        })}
      >
        Earn 20% of the XP of those who accept your invite. They will also get a 20% boost.
      </Typography.Text>
      <Flex vertical>
        <ActionButton
          type="default"
          css={css({
            color: tokenCssVars.colorPrimary,
            backgroundColor: tokenCssVars.colorBgLayout,
          })}
        >
          Share referral link
        </ActionButton>
        <ActionButton type="text">Copy shareable url</ActionButton>
      </Flex>
    </Flex>
  );
}
