import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { type Vouch, type VouchFunds } from '@ethos/blockchain-manager';
import { useCopyToClipboard } from '@ethos/common-ui';
import { type LiteProfile } from '@ethos/domain';
import { formatEth } from '@ethos/helpers';
import { Button, Dropdown } from 'antd';
import { type ItemType } from 'antd/es/menu/interface';
import Link from 'next/link';
import { useState } from 'react';
import {
  ReviewFilled,
  SlashFilled,
  VouchFilled,
  ManageAccounts,
  ClipboardIcon,
} from 'components/icons';
import { tokenCssVars } from 'config/theme';

type DropdownMenuActionsProps = {
  isCurrentUser: boolean;
  targetProfile: LiteProfile | null | undefined;
  connectedProfile: LiteProfile | null | undefined;
  vouchByConnectedAddress: (Vouch & VouchFunds) | null;
  onReviewClick: () => void;
  onVouchClick: () => void;
  onUnvouchClick: () => void;
};

export function DropdownMenuActions({
  isCurrentUser,
  targetProfile,
  connectedProfile,
  vouchByConnectedAddress,
  onReviewClick,
  onVouchClick,
  onUnvouchClick,
}: DropdownMenuActionsProps) {
  const copyToClipboard = useCopyToClipboard();
  const [open, setOpen] = useState(false); // State to track dropdown open/closed
  const vouchedAmount = vouchByConnectedAddress?.staked ?? 0n;

  const items: ItemType[] = [
    ...(!isCurrentUser
      ? [
          {
            key: 'review',
            label: 'Review',
            icon: <ReviewFilled />,
            onClick: onReviewClick,
          },
          {
            key: 'vouch',
            label: vouchByConnectedAddress ? (
              <span
                css={css`
                  color: ${tokenCssVars.colorPrimary};
                `}
              >
                Vouched · {formatEth(vouchedAmount)}
              </span>
            ) : (
              'Vouch'
            ),
            icon: (
              <VouchFilled
                css={css`
                  color: ${vouchByConnectedAddress ? tokenCssVars.colorPrimary : undefined};
                `}
              />
            ),
            disabled: !vouchByConnectedAddress && !targetProfile,
            onClick: vouchByConnectedAddress ? onUnvouchClick : onVouchClick,
          },
          {
            key: 'slash',
            label: 'Slash (Coming Soon)',
            disabled: true,
            icon: <SlashFilled />,
          },
          {
            key: 'copy-profile',
            label: 'Copy link',
            onClick: async () => {
              const { origin, pathname } = window.location;

              await copyToClipboard(
                new URL(pathname, origin).toString(),
                'Link successfully copied',
              );
            },
            icon: <ClipboardIcon />,
          },
        ]
      : []),

    ...(isCurrentUser && connectedProfile
      ? [
          {
            key: 'vouch-balances',
            label: <Link href="/profile/vouches">Vouch balances</Link>,
            icon: <VouchFilled />,
          },
          {
            key: 'profile-settings',
            label: <Link href="/profile/settings">Settings</Link>,
            icon: <ManageAccounts />,
          },
        ]
      : []),
  ];

  return (
    <Dropdown
      menu={{ items }}
      trigger={['click']}
      onOpenChange={(state) => {
        setOpen(state);
      }}
      open={open}
    >
      <Button
        type="primary"
        iconPosition="end"
        icon={open ? <CaretUpOutlined /> : <CaretDownOutlined />}
        ghost
      >
        Actions
      </Button>
    </Dropdown>
  );
}
