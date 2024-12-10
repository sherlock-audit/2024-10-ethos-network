import { css } from '@emotion/react';
import { type InvitationAcceptedActivityInfo } from '@ethos/domain';
import { Flex, Tooltip, Typography, theme } from 'antd';
import Link from 'next/link';
import { ActivityIconTag } from './ActivityIconTag';
import { CardHeaderTitle } from './card-header-title.component';
import { CardHeader } from './card-header.component';
import { UserAvatar } from 'components/avatar/avatar.component';
import { InviteFilled } from 'components/icons';
import { TooltipIconWrapper } from 'components/tooltip/tooltip-icon-wrapper';
import { getWebServerUrl } from 'config/misc';
import { tokenCssVars } from 'config/theme';
import { routeTo } from 'utils/routing';

const { Paragraph, Title } = Typography;

type Props = {
  info: InvitationAcceptedActivityInfo;
};

export function InvitationAcceptedCard({ info }: Props) {
  const { token } = theme.useToken();
  const { data, author, subject, events } = info;

  const profileRoute = routeTo({ address: data.primaryAddress }).profile;

  return (
    <Flex
      css={css`
        background-color: ${tokenCssVars.colorBgContainer};
        border-radius: ${token.borderRadius}px;
      `}
      justify="stretch"
      vertical
    >
      <CardHeader
        title={<CardHeaderTitle author={subject} subject={author} type="invitation-accepted" />}
        timestamp={data.createdAt}
        txnHash={events.at(0)?.txHash}
        pathname={profileRoute}
      />
      <Flex
        css={css`
          padding: 11px 18px;
        `}
        gap={18}
        flex={1}
      >
        <UserAvatar actor={subject} size="large" />
        <Flex vertical flex={1}>
          <Flex justify="space-between" gap={18} align="flex-start">
            <Paragraph>
              <Title level={4}>Profile Created</Title>
              <Link href={profileRoute}>
                <Typography.Text
                  type="secondary"
                  css={css`
                    font-size: 12px;
                    line-height: 20px;
                  `}
                >
                  {getWebServerUrl() + profileRoute}
                </Typography.Text>
              </Link>
            </Paragraph>
            <ActivityIconTag>
              <Tooltip title="Invitation Accepted">
                <TooltipIconWrapper>
                  <InviteFilled css={{ color: tokenCssVars.cyan7 }} />
                </TooltipIconWrapper>
              </Tooltip>
            </ActivityIconTag>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}
