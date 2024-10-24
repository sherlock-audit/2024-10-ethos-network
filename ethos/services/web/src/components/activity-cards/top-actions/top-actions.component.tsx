import { DeleteOutlined, LinkOutlined, MoreOutlined } from '@ant-design/icons';
import { notEmpty } from '@ethos/helpers';
import { Button, Dropdown, type MenuProps, Tooltip } from 'antd';
import { getTxnURL } from 'app/(root)/activity/_components/view.txn.component';
import { OpenInNewIcon } from 'components/icons';
import { useCopyToClipboard } from 'utils/clipboard';

type MenuItem = NonNullable<MenuProps['items']>[number];

type Props = {
  onWithdraw?: () => void;
  pathname?: string;
  txnHash?: string;
};

const items: MenuItem[] = [
  {
    key: 'copy-link',
    icon: <LinkOutlined />,
    label: 'Copy link',
  },
];

export function TopActions({ onWithdraw, pathname, txnHash }: Props) {
  const copyToClipboard = useCopyToClipboard();

  const onClick: MenuProps['onClick'] = async ({ key }) => {
    // TODO this is an anti-pattern, MenuItem accepts onClick property
    if (key === 'withdraw' && onWithdraw) {
      onWithdraw();
    }

    if (key === 'copy-link') {
      if (window !== undefined && pathname) {
        const link = new URL(pathname, window.location.origin).toString();

        await copyToClipboard(link, 'Link successfully copied');
      }
    }

    if (key === 'view-txn' && txnHash) {
      window.open(getTxnURL(txnHash), '_blank');
    }
  };

  const withdrawActionItem: MenuItem = {
    key: 'withdraw',
    icon: <DeleteOutlined />,
    disabled: !onWithdraw,
    danger: true,
    label: (
      <a
        onClick={(e) => {
          e.preventDefault();
        }}
      >
        Remove
      </a>
    ),
  };

  const viewTxnItem: MenuItem = {
    key: 'view-txn',
    icon: <OpenInNewIcon />,
    label: 'View transaction',
  };

  const menuItems: MenuItem[] = [
    ...items,
    ...(txnHash ? [viewTxnItem] : []),
    ...(onWithdraw ? [withdrawActionItem] : []),
  ].filter(notEmpty);

  return (
    <Tooltip title="More" mouseEnterDelay={0.75}>
      <span>
        <Dropdown
          menu={{
            items: menuItems,
            onClick,
          }}
          trigger={['click']}
        >
          <Button size="small" type="text" icon={<MoreOutlined />} />
        </Dropdown>
      </span>
    </Tooltip>
  );
}
