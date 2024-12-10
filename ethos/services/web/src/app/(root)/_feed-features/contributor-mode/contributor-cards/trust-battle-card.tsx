import { css, type SerializedStyles } from '@emotion/react';
import {
  type ActivityActor,
  fromUserKey,
  type ContributionTrustBattle,
  X_SERVICE,
} from '@ethos/domain';
import { Button, Card, Flex, Tooltip, Typography, Badge } from 'antd';
import Link from 'next/link';
import { ContributionCardSkeleton } from '../components/contribution-card-skeleton';
import {
  type OnContribute,
  useRecordContributionWithMsg,
} from '../hooks/useRecordContributionWithMsg';
import { contributorModeCard, getCardWidthStyles } from '../styles';
import { UserAvatar } from 'components/avatar/avatar.component';
import { KeyboardDoubleArrowDown, KeyboardDoubleArrowUp, OpenInNewIcon } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { useActor } from 'hooks/user/activities';
import { getServiceAccountUrl } from 'utils/routing';

const BUTTON_SIZE = 52;
const AVATAR_SIZE = 76;
const AVATAR_SIDE_OFFSET = (AVATAR_SIZE - BUTTON_SIZE) / 2;

const cardBodyPaddingX = 22;
const { cardWidth } = getCardWidthStyles({
  cardWidth: 340,
  cardBodyPadding: cardBodyPaddingX,
});

const VS_BOX_SIZE = 100;

export function TrustBattleCard({
  action,
  contributionId,
  onContribute,
}: {
  action: ContributionTrustBattle;
  contributionId: number;
  onContribute: OnContribute;
}) {
  // use useActor instead of useActorBulk to cache the selected actor for next action
  const actor1 = useActor(fromUserKey(action.targetUserkeys[0]));
  const actor2 = useActor(fromUserKey(action.targetUserkeys[1]));
  const { recordAction } = useRecordContributionWithMsg({ onContribute });
  function onTrustBattle(index: number) {
    recordAction({
      contributionId,
      action: {
        type: 'TRUST_BATTLE',
        chosenIndex: index,
        chosenUserkey: index === -1 ? undefined : action.targetUserkeys[index],
      },
    });
  }

  if (!actor1 || !actor2) {
    return <ContributionCardSkeleton />;
  }

  return (
    <Flex vertical align="center" gap={16}>
      <Badge.Ribbon
        text={
          <Typography.Title
            level={4}
            ellipsis
            css={{
              color: tokenCssVars.colorBgContainer,
              maxWidth: 170,
            }}
          >
            {actor1.name}
          </Typography.Title>
        }
        color={tokenCssVars.colorLink}
      >
        <Badge.Ribbon
          text={
            <Typography.Title
              level={4}
              ellipsis
              css={{
                color: tokenCssVars.colorBgContainer,
                maxWidth: 170,
              }}
            >
              {actor2.name}
            </Typography.Title>
          }
          color={tokenCssVars.colorLink}
          /* This code is disgusting. It is used to make the ribbon corner work on the left side of the card. */
          css={css`
            transform: rotate(0deg);
            transform-origin: left bottom;
            left: -8px !important;
            right: unset !important;
            top: unset !important;
            bottom: 110px;
            border-radius: 4px 4px 4px 0;
            .ant-ribbon-corner {
              right: unset;
              left: 4px;
              transform: rotate(90deg);
              top: unset;
              bottom: -12px;
            }
          `}
        >
          <Card
            bordered={false}
            css={css`
              ${contributorModeCard}
              width: ${cardWidth};
              background: linear-gradient(
                160deg,
                ${tokenCssVars.colorBgElevated} 50%,
                ${tokenCssVars.colorBgContainer} 50%
              );
              position: relative;
              overflow: hidden;
            `}
            styles={{
              body: {
                padding: `22px ${cardBodyPaddingX}px`,
              },
            }}
          >
            <Flex
              justify="space-between"
              align="center"
              gap={32}
              css={css`
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
              `}
            >
              <TrustButton
                actor={actor1}
                onClick={() => {
                  onTrustBattle(0);
                }}
                buttonCSS={css`
                  background-color: ${tokenCssVars.colorBgContainer};
                `}
              />
              <Flex
                justify="center"
                align="center"
                css={css`
                  width: ${VS_BOX_SIZE}px;
                  height: ${VS_BOX_SIZE * 0.6}px;
                  background: ${tokenCssVars.colorLink};
                  border-radius: 8px;
                  z-index: 1;
                `}
              >
                <Typography.Title css={{ color: tokenCssVars.colorBgContainer }}>
                  VS
                </Typography.Title>
              </Flex>
              <TrustButton
                actor={actor2}
                onClick={() => {
                  onTrustBattle(1);
                }}
                isArrowDown
                buttonCSS={css`
                  margin-bottom: 8px;
                  margin-right: ${AVATAR_SIDE_OFFSET}px;
                  background-color: ${tokenCssVars.colorBgElevated};
                `}
              />
            </Flex>
            <Flex vertical>
              <Flex justify="space-between" align="flex-start">
                <div
                  css={css`
                    position: relative;
                    transform: translate(-25%, -25%);
                  `}
                >
                  <UserAvatar actor={actor1} size={190} showScore={false} />
                </div>
                <Flex
                  vertical
                  align="flex-end"
                  gap={8}
                  css={css`
                    position: absolute;
                    right: 12%;
                    transform: translateX(32px) translateY(10px);
                  `}
                >
                  <Typography.Paragraph
                    css={{
                      maxWidth: 160,
                      textAlign: 'right',
                      marginTop: 10,
                    }}
                    ellipsis={{ rows: 6, tooltip: true }}
                    type="secondary"
                  >
                    {actor1.description}{' '}
                    <Link
                      href={getServiceAccountUrl({
                        service: X_SERVICE,
                        account: actor1.username ?? '',
                      })}
                      target="_blank"
                    >
                      <OpenInNewIcon css={{ color: tokenCssVars.colorPrimary }} />
                    </Link>
                  </Typography.Paragraph>
                </Flex>
              </Flex>

              <Flex vertical align="flex-end" gap={8} css={{ marginLeft: 'auto' }}>
                <div
                  css={css`
                    position: relative;
                    transform: translate(25%, 25%);
                  `}
                >
                  <UserAvatar actor={actor2} size={190} showScore={false} />
                </div>
                <Flex
                  vertical
                  align="flex-start"
                  gap={8}
                  css={css`
                    position: absolute;
                    left: 12%;
                    transform: translateX(-32px) translateY(100px);
                  `}
                >
                  <Typography.Paragraph
                    css={{
                      maxWidth: 160,
                      textAlign: 'left',
                      marginTop: 10,
                    }}
                    ellipsis={{ rows: 6, tooltip: true }}
                    type="secondary"
                  >
                    {actor2.description}{' '}
                    <Link
                      href={getServiceAccountUrl({
                        service: X_SERVICE,
                        account: actor2.username ?? '',
                      })}
                      target="_blank"
                    >
                      <OpenInNewIcon css={{ color: tokenCssVars.colorPrimary }} />
                    </Link>
                  </Typography.Paragraph>
                </Flex>
              </Flex>
            </Flex>
          </Card>
        </Badge.Ribbon>
      </Badge.Ribbon>
      <Button
        onClick={() => {
          onTrustBattle(-1);
        }}
        type="link"
        css={css`
          color: ${tokenCssVars.colorPrimary};
          &:hover {
            color: ${tokenCssVars.colorPrimaryHover};
          }
        `}
      >
        Unsure
      </Button>
    </Flex>
  );
}

function TrustButton({
  actor,
  onClick,
  isArrowDown,
  buttonCSS,
}: {
  actor: ActivityActor;
  onClick: () => void;
  isArrowDown?: boolean;
  buttonCSS?: SerializedStyles;
}) {
  return (
    <Tooltip title={`I trust ${actor.name} more`}>
      <Button
        icon={
          isArrowDown ? (
            <KeyboardDoubleArrowDown css={{ fontSize: 28 }} />
          ) : (
            <KeyboardDoubleArrowUp css={{ fontSize: 28 }} />
          )
        }
        css={css`
          width: ${BUTTON_SIZE}px;
          height: ${BUTTON_SIZE}px;
          background: ${tokenCssVars.colorPrimaryBgHover};
          color: ${tokenCssVars.colorPrimary};
          border-radius: 50%;
          ${buttonCSS}
        `}
        onClick={onClick}
      />
    </Tooltip>
  );
}
