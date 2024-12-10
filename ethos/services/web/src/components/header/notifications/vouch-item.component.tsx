import { css } from '@emotion/react';
import { type VouchFunds, type Vouch } from '@ethos/blockchain-manager';
import { type ActivityType, type ActivityActor } from '@ethos/domain';
import { formatEth } from '@ethos/helpers';
import { Flex, List, Typography } from 'antd';
import { truncate } from 'lodash-es';
import Link from 'next/link';
import Markdown from 'react-markdown';
import { RelativeDateTime } from 'components/RelativeDateTime';
import { UserAvatar } from 'components/avatar/avatar.component';
import { PersonName } from 'components/person-name/person-name.component';
import { useActor } from 'hooks/user/activities';
import { getActivityUrl } from 'utils/routing';

const { Text } = Typography;

export function VouchItem({
  action,
  vouch,
  onItemClick,
}: {
  action: ActivityType;
  vouch: Vouch & VouchFunds;
  onItemClick?: () => void;
}) {
  const author = useActor({ profileId: vouch.authorProfileId });

  return (
    <Link
      href={getActivityUrl({
        type: 'vouch',
        data: vouch,
      })}
      onClick={onItemClick}
    >
      <List.Item
        extra={
          <RelativeDateTime
            timestamp={
              action === 'vouch'
                ? vouch.activityCheckpoints.vouchedAt
                : vouch.activityCheckpoints.unvouchedAt
            }
          />
        }
      >
        <List.Item.Meta
          avatar={<UserAvatar actor={author} />}
          title={<VouchTitle action={action} author={author} staked={vouch.staked} />}
          description={
            <Markdown
              css={css`
                p {
                  margin: 0;
                }
              `}
            >
              {truncate(vouch.comment, { length: 40 })}
            </Markdown>
          }
        />
      </List.Item>
    </Link>
  );
}

function VouchTitle({
  action,
  author,
  staked,
}: {
  action: ActivityType;
  author: ActivityActor;
  staked: bigint;
}) {
  return (
    <Flex gap={5}>
      <PersonName target={author} />
      <Text>
        {action + 'ed'} {formatEth(staked)}
      </Text>
    </Flex>
  );
}
