'use client';

import { css } from '@emotion/react';
import { type ProfileId } from '@ethos/blockchain-manager';
import {
  type EthosUserTarget,
  toUserKey,
  unvouchActivity,
  type UnvouchActivityInfo,
  vouchActivity,
  type VouchActivityInfo,
} from '@ethos/domain';
import { formatEth, notEmpty } from '@ethos/helpers';
import { Flex, Tag, theme, Typography } from 'antd';
import Title from 'antd/es/typography/Title';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useMemo } from 'react';
import { ViewTxn } from '../../../activity/_components/view.txn.component';
import { UnvouchFilled, VouchFilled } from 'components/icons';
import { PersonWithAvatar } from 'components/person-with-avatar/person-with-avatar.component';
import { InfiniteTable } from 'components/table/InfiniteTable';
import { tokenCssVars } from 'config';
import { DEFAULT_PAGE_SIZE } from 'constant/constants';
import { useInfiniteRecentActivities } from 'hooks/user/activities';
import { getActivityUrl } from 'utils/routing';
import { getVouchTxnUrl } from 'utils/vouch';

type Props = {
  target: EthosUserTarget;
};

type VouchActivity = VouchActivityInfo | UnvouchActivityInfo;

export function VouchHistory({ target }: Props) {
  const { token } = theme.useToken();

  const { data, isLoading, isFetching, fetchNextPage } = useInfiniteRecentActivities({
    pagination: {
      limit: DEFAULT_PAGE_SIZE,
      offset: 0,
    },
    target: toUserKey(target),
    direction: 'author',
    filter: [vouchActivity, unvouchActivity],
  });
  const values = data?.values;

  const dataSource = useMemo(
    () =>
      (values ?? [])
        .map((vouch) => {
          if (vouch.type !== vouchActivity && vouch.type !== unvouchActivity) {
            return null;
          }

          if (vouch.type === vouchActivity && vouch.data.archived) {
            return {
              ...vouch,
              data: { ...vouch.data, archived: false },
            };
          }

          return vouch;
        })
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .filter(notEmpty) ?? [],
    [values],
  );

  const columns = [
    {
      title: 'Date',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (_: string, vouch: VouchActivity) => {
        const checkpoint = vouch.data.archived ? 'unvouchedAt' : 'vouchedAt';

        const formattedDate = dayjs(vouch.data.activityCheckpoints[checkpoint] * 1000).format(
          'MMM-DD-YYYY HH:mm',
        );

        const txnHash = getVouchTxnUrl(vouch.data.archived, vouch.events);

        return (
          <Flex gap={4} align="center">
            {formattedDate}
            {txnHash && <ViewTxn txnHash={txnHash} />}
          </Flex>
        );
      },
      onHeaderCell: () => ({
        style: {
          paddingLeft: `${token.padding}px`,
          height: '54px',
        },
      }),
      onCell: () => ({
        style: {
          paddingLeft: `${token.padding}px`,
        },
      }),
    },
    {
      title: 'Activity',
      dataIndex: 'action',
      key: 'action',
      width: 200,
      render: (_: any, vouch: VouchActivity) => (
        <Flex gap={4} align="center">
          {vouch.data.archived !== undefined ? (
            vouch.data.archived ? (
              <>
                <UnvouchFilled
                  css={css`
                    color: ${tokenCssVars.colorPrimary};
                  `}
                />
                <Typography.Text
                  css={{
                    fontSize: '14px',
                  }}
                >
                  Unvouch
                </Typography.Text>
                {vouch.data.unhealthy ? (
                  <Typography.Text
                    type="danger"
                    css={{
                      fontSize: '14px',
                    }}
                  >
                    (Unhealthy)
                  </Typography.Text>
                ) : (
                  <Typography.Text
                    type="success"
                    css={{
                      fontSize: '14px',
                    }}
                  >
                    (Healthy)
                  </Typography.Text>
                )}
              </>
            ) : (
              <>
                <VouchFilled
                  css={css`
                    color: ${tokenCssVars.colorPrimary};
                  `}
                />
                <Typography.Text
                  css={{
                    fontSize: '14px',
                  }}
                >
                  Vouch
                </Typography.Text>
              </>
            )
          ) : (
            'N/A'
          )}
        </Flex>
      ),
    },
    {
      title: 'Title',
      dataIndex: ['data', 'comment'],
      key: 'comment',
      width: 300,
      render: (comment: string, vouch: VouchActivity) => (
        <Link href={getActivityUrl(vouch)}>
          <Title
            level={5}
            css={{
              color: tokenCssVars.colorPrimary,
            }}
            ellipsis={{
              tooltip: true,
              expandable: true,
              onExpand: (e) => {
                e.preventDefault();
              },
              symbol: (
                <span
                  css={{
                    fontFamily: 'var(--font-inter), sans-serif !important',
                    fontSize: token.fontSize,
                  }}
                >
                  more
                </span>
              ),
            }}
          >
            {comment ? `"${comment}"` : 'No comment was included.'}
          </Title>
        </Link>
      ),
    },
    {
      title: 'Vouched for',
      dataIndex: ['data', 'subjectProfileId'],
      key: 'subjectProfileId',
      render: (profileId: ProfileId) => {
        return <PersonWithAvatar target={{ profileId }} avatarSize="small" nameSize="large" />;
      },
    },
    {
      title: 'Amount',
      key: 'balance',
      render: (_: any, vouch: VouchActivity) => {
        return (
          <Tag
            color={tokenCssVars.colorBgElevated}
            css={{
              color: tokenCssVars.colorText,
              fontWeight: 600,
              textDecoration: vouch.data.archived ? 'line-through' : 'none',
            }}
          >
            {formatEth(vouch.data.archived ? vouch.data.withdrawn : vouch.data.staked)}
          </Tag>
        );
      },
    },
  ];

  const isFetchingNewData = !isLoading && isFetching;

  return (
    <InfiniteTable
      columns={columns}
      fetchNextPage={fetchNextPage}
      rowKey={(row) => row.data.id}
      isLoading={isLoading}
      isFetchingNewData={isFetchingNewData}
      dataSource={dataSource}
    />
  );
}
