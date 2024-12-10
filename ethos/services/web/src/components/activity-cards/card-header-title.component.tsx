import { XOutlined } from '@ant-design/icons';
import { css, type SerializedStyles } from '@emotion/react';
import { type Attestation, type Review } from '@ethos/blockchain-manager';
import {
  type ActivityType,
  type ActivityActor,
  reviewActivity,
  vouchActivity,
  invitationAcceptedActivity,
  unvouchActivity,
  attestationActivity,
  X_SERVICE,
} from '@ethos/domain';
import { Flex, Tooltip, Typography } from 'antd';
import { ReviewFilled } from '../icons/review-filled';
import { VouchFilled } from '../icons/vouch-filled';
import { PersonName } from '../person-name/person-name.component';
import { UserAvatar } from 'components/avatar/avatar.component';
import { ConnectSocialIcon, InviteFilled, RobotIcon, UnvouchFilled } from 'components/icons';
import { PreventInheritedLinkClicks } from 'components/prevent-inherited-link-clicks/prevent-inherited-link-clicks.component';
import { TooltipIconWrapper } from 'components/tooltip/tooltip-icon-wrapper';
import { tokenCssVars } from 'config/theme';
import { hideOnMobileCSS } from 'styles/responsive';

const { Text } = Typography;

export type ActivityTypeIconProps = {
  type: ActivityType;
  score?: Review['score'];
  service?: Attestation['service'];
};

type Props = ActivityTypeIconProps & {
  author: ActivityActor;
  avatar?: ActivityActor;
  subject?: ActivityActor;
  color?: string;
  service?: Attestation['service'];
  flexContainerStyles?: SerializedStyles;
  isAiAgent?: boolean;
};

const commonIconStyles = {
  fontSize: 18,
  verticalAlign: 'middle',
};

export function ActivityTypeIcon({
  type,
  color,
  service,
}: ActivityTypeIconProps & { color?: string }) {
  if (type === reviewActivity) {
    return (
      <Tooltip title="Review">
        <TooltipIconWrapper>
          <ReviewFilled css={{ ...commonIconStyles, color: color ?? tokenCssVars.colorText }} />
        </TooltipIconWrapper>
      </Tooltip>
    );
  } else if (type === vouchActivity) {
    return (
      <Tooltip title="Vouch">
        <TooltipIconWrapper>
          <VouchFilled css={{ ...commonIconStyles, color: tokenCssVars.colorPrimary }} />
        </TooltipIconWrapper>
      </Tooltip>
    );
  } else if (type === unvouchActivity) {
    return (
      <Tooltip title="Unvouch">
        <TooltipIconWrapper>
          <UnvouchFilled css={{ ...commonIconStyles, color: tokenCssVars.colorPrimary }} />
        </TooltipIconWrapper>
      </Tooltip>
    );
  } else if (type === invitationAcceptedActivity) {
    return (
      <Tooltip title="Invite">
        <TooltipIconWrapper>
          <InviteFilled css={{ ...commonIconStyles, color: tokenCssVars.cyan7 }} />
        </TooltipIconWrapper>
      </Tooltip>
    );
  } else if (type === attestationActivity) {
    if (service === X_SERVICE) {
      return (
        <Tooltip title="x.com connected">
          <XOutlined css={commonIconStyles} />
        </Tooltip>
      );
    }

    return (
      <Tooltip title="Social account connected">
        <TooltipIconWrapper>
          <ConnectSocialIcon css={{ ...commonIconStyles, color: tokenCssVars.colorWarning }} />
        </TooltipIconWrapper>
      </Tooltip>
    );
  }

  return null;
}

function getTitleMessage({
  type,
  score,
}: {
  type: ActivityTypeIconProps['type'];
  score?: Review['score'];
}): string {
  switch (type) {
    case vouchActivity: {
      return 'vouched for';
    }
    case unvouchActivity: {
      return 'unvouched';
    }
    case reviewActivity: {
      // ${score}ly works well for negative, neutral, and positive
      return score ? `${score}ly reviewed` : 'reviewed';
    }
    case attestationActivity: {
      return `connected`;
    }
    case invitationAcceptedActivity: {
      return 'accepted';
    }
    default: {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unhandled type: ${type}`);
    }
  }
}

const ROW_GAP = 4;

export function CardHeaderTitle({
  author,
  subject,
  type,
  color,
  score,
  service,
  flexContainerStyles,
  isAiAgent,
}: Props) {
  return (
    <Flex
      align="stretch"
      css={css`
        width: 100%;
        ${flexContainerStyles}
      `}
    >
      <div css={iconContainerStyles}>
        <ActivityTypeIcon type={type} color={color} />
      </div>
      <Flex wrap="wrap" gap={ROW_GAP} css={contentContainerStyles}>
        <Flex gap={ROW_GAP} align="center" css={lineStyles}>
          <PreventInheritedLinkClicks>
            <PersonName
              target={author}
              color="colorTextSecondary"
              ellipsis={true}
              maxWidth="150px"
            />
            {isAiAgent && (
              <Tooltip title="This was left by an AI Agent.">
                <TooltipIconWrapper>
                  <RobotIcon css={{ color: tokenCssVars.colorPrimary }} />
                </TooltipIconWrapper>
              </Tooltip>
            )}
          </PreventInheritedLinkClicks>
          <Text type="secondary">
            {getTitleMessage({
              type,
              score,
            })}
          </Text>
          {service && (
            <Typography.Text type="secondary">
              <strong>{service}</strong>
            </Typography.Text>
          )}
        </Flex>
        {subject && (
          <Flex gap={ROW_GAP} align="center" css={lineStyles}>
            <PreventInheritedLinkClicks>
              <div css={hideOnMobileCSS}>
                <UserAvatar actor={subject} size="small" />
              </div>
              <PersonName
                target={subject}
                color="colorTextSecondary"
                ellipsis={true}
                maxWidth="150px"
              />
            </PreventInheritedLinkClicks>
            {type === invitationAcceptedActivity && (
              <Text type="secondary">&rsquo;s invitation</Text>
            )}
          </Flex>
        )}
      </Flex>
    </Flex>
  );
}

const iconContainerStyles = css`
  display: flex;
  align-items: center;
  padding-right: 8px;
`;

const contentContainerStyles = css`
  flex: 1;
  min-width: 0;
`;

const lineStyles = css`
  flex: 0 0 auto;
  white-space: nowrap;
`;
