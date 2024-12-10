'use client';

import { type ProfileId } from '@ethos/blockchain-manager';
import { vouchActivity } from '@ethos/domain';
import { formatEth } from '@ethos/helpers';
import { Badge, Button, Flex, Tag, theme, Typography, Tooltip } from 'antd';
import Link from 'next/link';
import { ViewTxn } from 'app/(root)/activity/_components/view.txn.component';
import { RelativeDateTime } from 'components/RelativeDateTime';
import { ManageSearch, UnvouchFilled } from 'components/icons';
import { PersonWithAvatar } from 'components/person-with-avatar/person-with-avatar.component';
import { InfiniteTable } from 'components/table/InfiniteTable';
import { tokenCssVars } from 'config/theme';
import { DEFAULT_PAGE_SIZE } from 'constant/constants';
import { useUnvouchModal } from 'contexts/unvouch-modal.context';
import { type useVouchesByAuthor, useVouchesByAuthorInfinite } from 'hooks/user/lookup';
import { type ExtractUseQueryResult } from 'types/query-result.util';
import { getActivityUrl } from 'utils/routing';

type Props = {
  profileId: number;
};

type Vouch = ExtractUseQueryResult<typeof useVouchesByAuthor>['values'][number];

export function VouchesList({ profileId }: Props) {
  const { token } = theme.useToken();
  const { openUnvouchModal } = useUnvouchModal();

  const { data, isLoading, isFetching, fetchNextPage } = useVouchesByAuthorInfinite({
    pagination: {
      limit: DEFAULT_PAGE_SIZE,
      offset: 0,
    },
    archived: false,
    authorProfileIds: [profileId],
  });

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (_: string, vouch: Vouch) => {
        return (
          <Flex gap={4} align="center">
            <RelativeDateTime
              dateTimeFormat={{ dateStyle: 'long', timeStyle: 'long' }}
              timestamp={vouch.activityCheckpoints.vouchedAt}
              verbose
            />
            {vouch.events?.length > 0 && <ViewTxn txnHash={vouch.events[0].txHash} />}
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
      title: 'Title',
      dataIndex: 'comment',
      key: 'comment',
      width: 300,
      render: (comment: string, vouch: Vouch) => (
        <Link
          target="_blank"
          href={getActivityUrl({
            type: vouchActivity,
            data: vouch,
          })}
        >
          <Typography.Title
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
            {comment ? `“${comment}”` : 'No comment was included.'}
          </Typography.Title>
        </Link>
      ),
    },
    {
      title: 'Vouched for',
      dataIndex: 'subjectProfileId',
      key: 'subjectProfileId',
      render: (profileId: ProfileId) => {
        return <PersonWithAvatar target={{ profileId }} nameSize="large" />;
      },
    },
    {
      title: 'Reciprocated',
      dataIndex: 'mutualId',
      width: 120,
      key: 'mutualId',
      render: (mutualId: string, vouch: Vouch) =>
        mutualId ? (
          <Badge
            status="success"
            text={
              <Link
                href={getActivityUrl({
                  type: vouchActivity,
                  data: vouch,
                })}
              >
                <Typography.Text>Yes</Typography.Text>
              </Link>
            }
          />
        ) : (
          <Badge status="error" text="No" />
        ),
    },
    {
      title: 'Contributed Score',
      dataIndex: 'score',
      key: 'score',
      render: (_: string) => (
        <Tag
          color={tokenCssVars.colorBgElevated}
          css={{ color: tokenCssVars.colorText, fontWeight: 600 }}
        >
          Coming Soon
        </Tag>
      ),
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      render: (balance: bigint) => (
        <Tag
          color={tokenCssVars.colorBgElevated}
          css={{ color: tokenCssVars.colorText, fontWeight: 600 }}
        >
          {formatEth(balance)}
        </Tag>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (_: string, vouch: Vouch) => {
        return (
          <Flex gap={12} align="center">
            <Tooltip title="View">
              <Button
                type="link"
                css={{
                  padding: 0,
                  width: 'auto',
                }}
                icon={<ManageSearch />}
                href={getActivityUrl({
                  type: vouchActivity,
                  data: vouch,
                })}
              />
            </Tooltip>
            <Tooltip title="Unvouch">
              <Button
                type="link"
                css={{
                  padding: 0,
                  width: 'auto',
                }}
                onClick={() => {
                  openUnvouchModal(vouch);
                }}
                icon={<UnvouchFilled />}
              />
            </Tooltip>
          </Flex>
        );
      },
    },
  ];

  const isFetchingNewData = !isLoading && isFetching;

  return (
    <InfiniteTable
      columns={columns}
      rowKey={(row) => row.id}
      isFetchingNewData={isFetchingNewData}
      isLoading={isLoading}
      dataSource={data?.values}
      fetchNextPage={fetchNextPage}
    />
  );
}
