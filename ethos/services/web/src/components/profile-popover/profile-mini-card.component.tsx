import { css } from '@emotion/react';
import { X_SERVICE, type EthosUserTarget } from '@ethos/domain';
import { formatEth } from '@ethos/helpers';
import { Flex, Tag, Typography, theme } from 'antd';
import Link from 'next/link';
import { useRef } from 'react';
import { UserAvatar } from 'components/avatar/avatar.component';
import { Logo, VouchFilled } from 'components/icons';
import { ReviewStatsRow, XPStatsRow, VouchStatsRow } from 'components/profile-stats';
import { tokenCssVars } from 'config/theme';
import { useCurrentUser } from 'contexts/current-user.context';
import { useThemeMode } from 'contexts/theme-manager.context';
import { useVouchesBySubjectAndAuthor } from 'hooks/api/echo.hooks';
import { useRouteTo } from 'hooks/user/hooks';
import { useProfile } from 'hooks/user/lookup';
import { type Actor } from 'types/activity';
import { useScoreGraph } from 'utils/score-graph/use-score-graph';
import { useScoreCategory } from 'utils/scoreCategory';

const CARD_WIDTH = 208;

const { Text, Title } = Typography;
const { useToken } = theme;

type Props = {
  target: EthosUserTarget;
  actor: Actor;
  openLinkInNewTab?: boolean;
};

export function ProfileMiniCard({ target, actor, openLinkInNewTab }: Props) {
  const { token } = useToken();
  const mode = useThemeMode();

  const { name, score } = actor;
  const profile = useProfile(target).data;
  const targetRouteTo = useRouteTo(
    actor.username ? { service: X_SERVICE, username: actor.username } : target,
  ).data;
  const { connectedProfile } = useCurrentUser();
  const connectedProfileVouch = useVouchesBySubjectAndAuthor(profile?.id, connectedProfile?.id);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const [scoreCategory] = useScoreCategory(score);
  const scoreGraphUrl = useScoreGraph(target);
  const backgroundImage = `/assets/images/score/background-mini${mode === 'dark' ? '-dark' : ''}.svg`;

  return (
    <Flex
      ref={cardRef}
      gap={8}
      css={css`
        width: ${CARD_WIDTH}px;
        height: 100%;
        box-shadow: ${tokenCssVars.boxShadowTertiary};
        background-color: ${tokenCssVars.colorBgContainer};
        background-image: url(${backgroundImage});
        background-position: top 1px left -4px;
        background-repeat: no-repeat;
        background-blend-mode: overlay;
      `}
      vertical
    >
      <Flex
        align="flex-start"
        justify="space-between"
        css={css`
          padding-inline: ${token.paddingContentHorizontal}px;
          padding-top: ${token.paddingContentVertical}px;
        `}
      >
        <Link href={targetRouteTo.profile} target={openLinkInNewTab ? '_blank' : '_self'}>
          <UserAvatar
            size="large"
            actor={actor}
            showHoverCard={false}
            showScore={false}
            openLinkInNewTab={openLinkInNewTab}
            renderAsLink={false}
          />
        </Link>
        {connectedProfileVouch.data?.values?.length ? (
          <Tag
            css={css`
              display: flex;
              align-items: center;
              gap: ${token.marginXXS}px;
              background-color: ${tokenCssVars.colorBgContainer};
              padding-inline: ${token.controlPaddingHorizontalSM}px;
              padding-block: 1px;
            `}
          >
            <VouchFilled
              css={css`
                color: ${tokenCssVars.colorInfo};
                font-size: 12px;
              `}
            />
            <Typography.Text
              css={css`
                color: ${tokenCssVars.colorInfo};
                font-size: 12px;
                line-height: 20px;
              `}
            >
              {formatEth(connectedProfileVouch.data?.values[0].balance)}
            </Typography.Text>
          </Tag>
        ) : null}
      </Flex>

      <Flex
        css={css`
          padding-inline: ${token.paddingContentHorizontal}px;
        `}
        gap={6}
        justify="space-between"
        align="flex-start"
        wrap
        vertical
      >
        <Link href={targetRouteTo.profile} target={openLinkInNewTab ? '_blank' : '_self'}>
          <Text
            strong
            css={css`
              color: ${scoreCategory.color};
              max-width: calc(${CARD_WIDTH}px - ${token.paddingContentHorizontal * 2}px);
              font-size: 14px;
            `}
            ellipsis={{
              tooltip: true,
            }}
          >
            {name}&nbsp;
          </Text>
        </Link>
        <Flex vertical gap={8}>
          <ReviewStatsRow target={target} />
          <VouchStatsRow target={target} profile={profile} />
          <XPStatsRow profile={profile} xpPageUrl={targetRouteTo.xpHistory} />
        </Flex>
      </Flex>
      <Flex
        css={css`
          background-image: url(${scoreGraphUrl});
          background-position: bottom center;
          background-size: 100% 100%;
          background-repeat: no-repeat;
          padding: ${token.paddingContentVertical}px ${token.paddingContentHorizontal}px;
        `}
        wrap
        justify="space-between"
        align="flex-end"
      >
        <Flex vertical gap={4}>
          <Flex gap={10} align="center">
            <Title
              level={2}
              css={css`
                font-size: 52px;
                line-height: 26px;
                color: ${scoreCategory.color};
              `}
            >
              {score}
            </Title>
            <Logo
              css={css`
                font-size: 35px;
                color: ${scoreCategory.color};
              `}
            />
          </Flex>
          <Title
            css={css`
              color: ${scoreCategory.color};
              text-transform: capitalize;
              line-height: 32px;
              font-size: 24px;
            `}
            level={2}
          >
            {scoreCategory.status}
          </Title>
        </Flex>
      </Flex>
    </Flex>
  );
}
