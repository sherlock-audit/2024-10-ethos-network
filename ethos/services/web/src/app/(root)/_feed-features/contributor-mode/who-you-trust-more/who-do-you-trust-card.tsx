import { css, type SerializedStyles } from '@emotion/react';
import { Button, Card, Flex, Tooltip, Typography } from 'antd';
import { useState } from 'react';
import { DoYouTrustThisPersonCard } from '../do-you-trust-this-person/feedback-card';
import { contributorModeCard, getCardWidthStyles } from '../styles';
import { UserAvatar } from 'components/avatar/avatar.component';
import { ArrowDownScoreIcon, ArrowUpScoreIcon } from 'components/icons';
import { tokenCssVars } from 'config';
import { type ActivityActor } from 'services/echo';

const BUTTON_SIZE = 76;
const AVATAR_SIZE = 100;
const AVATAR_SIDE_OFFSET = (AVATAR_SIZE - BUTTON_SIZE) / 2;

const cardBodyPaddingX = 25;
const { cardWidth } = getCardWidthStyles({
  cardWidth: 340,
  cardBodyPadding: cardBodyPaddingX,
});

export function WhoDoYouTrustCard({
  actor1,
  actor2,
  onNext,
}: {
  actor1: ActivityActor;
  actor2: ActivityActor;
  onNext: () => void;
}) {
  const [selectedActor, setSelectedActor] = useState<ActivityActor | null>(null);

  if (selectedActor) {
    return (
      <DoYouTrustThisPersonCard
        actor={selectedActor}
        onNext={onNext}
        defaultReviewType="positive"
      />
    );
  }

  return (
    <Flex vertical align="center" gap={16}>
      <Card
        bordered={false}
        css={css`
          ${contributorModeCard}
          width: ${cardWidth};
          background: linear-gradient(
            to bottom right,
            ${tokenCssVars.colorBgElevated} 50%,
            ${tokenCssVars.colorBgContainer} 50%
          );
        `}
        styles={{
          body: {
            padding: `30px ${cardBodyPaddingX}px`,
          },
        }}
      >
        <Flex vertical>
          <Flex
            vertical
            align="flex-start"
            gap={10}
            css={{ marginRight: 'auto', marginBottom: -BUTTON_SIZE }}
          >
            <UserAvatar actor={actor1} size={AVATAR_SIZE} />
            <ActorTitle actor={actor1} maxWidth={180} />
            <TrustButton
              actor={actor1}
              onClick={() => {
                setSelectedActor(actor1);
              }}
              buttonCSS={css`
                margin-top: 8px;
                margin-left: ${AVATAR_SIDE_OFFSET}px;
              `}
            />
          </Flex>
          <Flex vertical align="flex-end" gap={10} css={{ marginLeft: 'auto' }}>
            <TrustButton
              actor={actor2}
              onClick={() => {
                setSelectedActor(actor2);
              }}
              isArrowDown
              buttonCSS={css`
                margin-bottom: 8px;
                margin-right: ${AVATAR_SIDE_OFFSET}px;
              `}
            />
            <UserAvatar actor={actor2} size={AVATAR_SIZE} />
            <ActorTitle actor={actor2} maxWidth={250} />
          </Flex>
        </Flex>
      </Card>
      <Button
        onClick={onNext}
        type="link"
        css={css`
          color: ${tokenCssVars.colorPrimary};
          &:hover {
            color: ${tokenCssVars.colorPrimaryHover};
          }
        `}
      >
        Skip & continue
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
            <ArrowDownScoreIcon css={{ fontSize: 28 }} />
          ) : (
            <ArrowUpScoreIcon css={{ fontSize: 28 }} />
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

function ActorTitle({ actor, maxWidth }: { actor: ActivityActor; maxWidth: number }) {
  return (
    <Typography.Title
      ellipsis={{
        tooltip: true,
      }}
      level={3}
      css={{
        maxWidth,
      }}
    >
      {actor.name}
    </Typography.Title>
  );
}
