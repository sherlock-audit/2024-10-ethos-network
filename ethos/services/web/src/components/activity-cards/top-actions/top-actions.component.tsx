import { DeleteOutlined, LinkOutlined, MoreOutlined } from '@ant-design/icons';
import { useCopyToClipboard } from '@ethos/common-ui';
import { notEmpty } from '@ethos/helpers';
import { Button, Dropdown, type MenuProps, Tooltip } from 'antd';
import { getTxnURL } from 'app/(root)/activity/_components/view.txn.component';
import { OpenInNewIcon } from 'components/icons';

type MenuItem = NonNullable<MenuProps['items']>[number];

type Props = {
  onWithdraw?: () => void;
  pathname?: string;
  txnHash?: string;
};

export function TopActions({ onWithdraw, pathname, txnHash }: Props) {
  const copyToClipboard = useCopyToClipboard();

  const items: MenuItem[] = [
    {
      key: 'copy-link',
      icon: <LinkOutlined />,
      label: 'Copy link',
      async onClick() {
        if (pathname) {
          const link = new URL(pathname, window.location.origin).toString();

          await copyToClipboard(link, 'Link successfully copied');
        }
      },
    },
    ...(txnHash
      ? [
          {
            key: 'view-txn',
            icon: <OpenInNewIcon />,
            label: 'View transaction',
            onClick() {
              window.open(getTxnURL(txnHash), '_blank');
            },
          },
        ]
      : []),
    onWithdraw && {
      key: 'withdraw',
      icon: <DeleteOutlined />,
      disabled: !onWithdraw,
      danger: true,
      label: 'Remove',
      onClick() {
        onWithdraw();
      },
    },
  ].filter(notEmpty);

  return (
    <Tooltip title="More" mouseEnterDelay={0.75}>
      <span>
        <Dropdown
          menu={{
            items,
          }}
          trigger={['click']}
        >
          <Button size="small" type="text" icon={<MoreOutlined />} />
        </Dropdown>
      </span>
    </Tooltip>
  );
}
