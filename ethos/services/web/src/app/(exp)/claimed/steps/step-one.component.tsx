import { TrophyFilled } from '@ant-design/icons';
import { css } from '@emotion/react';
import { Logo, LogoFullSvg } from '@ethos/common-ui';
import { Flex, theme, Typography } from 'antd';
import { ValueCard } from '../_components/value-card.component';
import { ProfileAvatar } from 'app/(exp)/_components/profile-avatar.component';
import { ContributorWingLeftSvg } from 'app/(root)/_feed-features/contributor-mode/illustration/contributor-wing-left.svg';
import { EthosStar } from 'components/icons';
import { tokenCssVars } from 'config/theme';

const bgWingStyle = css`
  font-size: 48px;
  color: ${tokenCssVars.colorText};
  position: absolute;
  pointer-events: none;
  top: 25px;
  opacity: 0.08;
`;

export function StepOne() {
  const { token } = theme.useToken();

  return (
    <Flex
      vertical
      gap={token.marginXXL}
      align="center"
      css={css({
        height: tokenCssVars.fullHeight,
        position: 'relative',
        padding: '50px 0',
        backgroundColor: tokenCssVars.colorBgLayout,
        color: token.colorWhite,
        overflow: 'hidden',
      })}
    >
      <span
        css={css({
          color: tokenCssVars.colorTextBase,
        })}
      >
        <LogoFullSvg />
      </span>
      <div
        css={css({
          position: 'relative',
          width: '400px',
          maxWidth: '100%',
        })}
      >
        <ContributorWingLeftSvg
          css={css`
            ${bgWingStyle}
            left: calc(50% - 150px);
            @media (min-width: ${token.screenMD}px) {
              left: max(3%, 10px);
            }
          `}
        />
        <ContributorWingLeftSvg
          css={css`
            ${bgWingStyle}
            right: calc(50% - 150px);
            transform: scaleX(-1); // flip horizontally
            @media (min-width: ${token.screenMD}px) {
              right: max(3%, 10px);
            }
          `}
        />

        <Flex
          vertical
          gap={token.marginXXS}
          justify="center"
          align="center"
          css={css({
            zIndex: 1,
          })}
        >
          <Flex
            justify="center"
            align="center"
            css={css({
              position: 'relative',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              padding: token.paddingMD,
              backgroundColor: tokenCssVars.colorBgContainer,
            })}
          >
            <TrophyFilled
              css={css({
                fontSize: '25px',
                color: tokenCssVars.colorPrimary,
              })}
            />
          </Flex>
          <Typography.Title
            level={2}
            css={css({
              textAlign: 'center',
            })}
          >
            Congrats!
          </Typography.Title>
          <Typography.Text
            css={css({
              textAlign: 'center',
            })}
          >
            Tucker Carlson
          </Typography.Text>
          <div
            css={css({
              transform: 'translateY(50%)',
            })}
          >
            <ProfileAvatar avatarName="avatar1" />
          </div>
        </Flex>
      </div>

      <Flex
        vertical
        align="center"
        gap={token.marginXS}
        css={css({
          width: '100%',
          padding: `0px ${token.marginXL}px`,
        })}
      >
        <ValueCard
          title="Claimed contributor XP"
          tooltipText="Claimed contributor XP"
          value={1222}
          valueColor={tokenCssVars.orange8}
          icon={<EthosStar />}
        />

        <ValueCard
          title="Your starting credibility score"
          tooltipText="Your starting credibility score"
          value={1800}
          valueColor={tokenCssVars.colorPrimary}
          icon={<Logo />}
        />
      </Flex>
    </Flex>
  );
}
