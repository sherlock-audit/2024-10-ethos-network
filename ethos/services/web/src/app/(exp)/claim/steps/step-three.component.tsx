import { css } from '@emotion/react';
import { Flex, theme, Typography } from 'antd';
import { FlexArrow } from '../../_components/flex-arrow.component';
import { ProfileAvatar } from '../../_components/profile-avatar.component';
import { ReviewFilled } from 'components/icons';
import { tokenCssVars } from 'config/theme';

export function StepThree() {
  const { token } = theme.useToken();

  return (
    <Flex
      vertical
      justify="center"
      align="center"
      gap={token.marginMD}
      css={css({
        height: tokenCssVars.fullHeight,
        backgroundColor: tokenCssVars.colorText,
        padding: `${token.paddingXL}px ${token.paddingLG}px`,
      })}
    >
      <Typography.Title
        level={2}
        css={css({
          color: tokenCssVars.colorBgContainer,
          textAlign: 'center',
        })}
      >
        We believe
      </Typography.Title>
      <Typography.Text
        css={css({
          color: tokenCssVars.colorBgContainer,
          textAlign: 'center',
        })}
      >
        That we need peer <br />
        signals to determine credibility.
      </Typography.Text>
      <Flex align="center" justify="center" gap={1}>
        <ProfileAvatar size="large" avatarName="avatar1" score={1503} expImpactValue={12} />
        <FlexArrow width={40} size={1} />
        <Flex
          justify="center"
          align="center"
          css={css({
            position: 'relative',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            padding: token.paddingMD,
            backgroundColor: tokenCssVars.colorTextBase,
          })}
        >
          <ReviewFilled
            css={css({
              fontSize: '25px',
              color: tokenCssVars.colorSuccess,
            })}
          />
          <div
            css={css`
              width: max-content;
              position: absolute;
              transform: translate(50%);
              top: 120%;
              right: 50%;
            `}
          >
            <Typography.Text
              css={css`
                color: ${tokenCssVars.colorBgContainer};
              `}
            >
              positive review
            </Typography.Text>
          </div>
        </Flex>
        <FlexArrow width={40} size={1} />
        <ProfileAvatar size="large" avatarName="avatar2" score={1403} scoreImpactValue={32} />
      </Flex>
    </Flex>
  );
}
