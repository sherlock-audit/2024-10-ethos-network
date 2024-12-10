import { css } from '@emotion/react';
import { attestationContractName } from '@ethos/contracts';
import { type AttestationActivityInfo } from '@ethos/domain';
import { Flex, Typography, theme } from 'antd';
import Link from 'next/link';
import { CardFooter } from './card-footer.component';
import { CardHeaderTitle } from './card-header-title.component';
import { CardHeader } from './card-header.component';
import { UserAvatar } from 'components/avatar/avatar.component';
import { tokenCssVars } from 'config/theme';
import { type BulkVotes } from 'types/activity';
import { getServiceAccountUrl } from 'utils/routing';

const { Title } = Typography;

type Props = {
  info: AttestationActivityInfo;
  userVotes?: BulkVotes;
};

export function AttestationCard({ info, userVotes }: Props) {
  const { data, author, votes, replySummary, events } = info;
  const { token } = theme.useToken();

  const { createdAt, service, username, evidence } = data;
  const url = getServiceAccountUrl({ service, account: username });

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
        title={<CardHeaderTitle author={author} type="attestation" service={service} />}
        timestamp={createdAt}
        txnHash={events.at(0)?.txHash}
        pathname={url}
      />
      <Flex
        css={css`
          padding: 11px 18px;
        `}
        gap={18}
        flex={1}
      >
        <UserAvatar size="large" actor={author} />
        <Flex vertical flex={1}>
          <Flex justify="space-between" gap={18} align="flex-start">
            <Title level={4}>Connected social account</Title>
          </Flex>
          <Link href={evidence} target="_blank">
            <Typography.Text
              type="secondary"
              css={css`
                font-size: 12px;
                line-height: 20px;
              `}
            >
              {evidence}
            </Typography.Text>
          </Link>
          <CardFooter
            targetId={info.data.id}
            targetContract={attestationContractName}
            votes={votes}
            replySummary={replySummary}
            pathname={url}
            currentVote={userVotes?.[attestationContractName]?.[info.data.id]?.userVote ?? null}
          />
        </Flex>
      </Flex>
    </Flex>
  );
}
