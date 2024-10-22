import { AreaChartOutlined, CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { type Vouch, type VouchFunds } from '@ethos/blockchain-manager';
import { type LiteProfile } from '@ethos/domain';
import { formatEth } from '@ethos/helpers';
import { useFeatureGate } from '@statsig/react-bindings';
import { Button, Dropdown } from 'antd';
import { type ItemType } from 'antd/es/menu/interface';
import Link from 'next/link';
import { useState } from 'react';
import { ReviewFilled, SlashFilled, VouchFilled, ManageAccounts } from 'components/icons';
import { tokenCssVars } from 'config';
import { featureGates } from 'constant/feature-flags';
import { useMarketExists } from 'hooks/market/market.hooks';
import { useRouteTo } from 'hooks/user/hooks';

type DropdownMenuActionsProps = {
  isCurrentUser: boolean;
  targetProfile: LiteProfile | null | undefined;
  connectedProfile: LiteProfile | null | undefined;
  vouchByConnectedAddress: (Vouch & VouchFunds) | null;
  onReviewClick: () => void;
  onVouchClick: () => void;
};

export function DropdownMenuActions({
  isCurrentUser,
  targetProfile,
  connectedProfile,
  vouchByConnectedAddress,
  onReviewClick,
  onVouchClick,
}: DropdownMenuActionsProps) {
  const { value: isReputationMarketEnabled } = useFeatureGate(
    featureGates.isReputationMarketEnabled,
  );
  const isMarketCreated = useMarketExists(targetProfile?.id);
  const showMarketButton = isReputationMarketEnabled && isMarketCreated;
  const { data: routes } = useRouteTo({ profileId: targetProfile?.id ?? 0 });

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
            onClick: onVouchClick,
          },
          {
            key: 'slash',
            label: 'Slash (Coming Soon)',
            disabled: true,
            icon: <SlashFilled />,
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
            label: <Link href="/profile/settings">Profile settings</Link>,
            icon: <ManageAccounts />,
          },
        ]
      : []),
    ...(showMarketButton
      ? [
          {
            key: 'market',
            label: <Link href={routes.market}>Market</Link>,
            icon: <AreaChartOutlined />,
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
