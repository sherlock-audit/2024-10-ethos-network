import { useCopyToClipboard } from '@ethos/common-ui';
import { notEmpty } from '@ethos/helpers';
import { type MenuProps } from 'antd';
import Link from 'next/link';
import { zeroAddress } from 'viem';
import { useDisconnect } from 'wagmi';
import { LogoutIcon, PersonIcon, VouchFilled, Wallet, ManageAccounts } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { useCurrentUser } from 'contexts/current-user.context';
import { routeTo } from 'utils/routing';

export function useWalletDropdownItems(isMobile: boolean = false) {
  const copyToClipboard = useCopyToClipboard();
  const { disconnect } = useDisconnect();
  const { connectedAddress } = useCurrentUser();
  const target = { address: connectedAddress ?? zeroAddress };

  const items: MenuProps['items'] = [
    !isMobile
      ? {
          key: 'my-profile',
          label: <Link href={routeTo(target).profile}>Profile</Link>,
          icon: <PersonIcon />,
        }
      : null,
    {
      key: 'profile-settings',
      label: <Link href="/profile/settings">Settings</Link>,
      icon: <ManageAccounts />,
    },
    {
      key: 'vouches',
      label: <Link href="/profile/vouches">Vouch balances</Link>,
      icon: <VouchFilled />,
    },
    {
      label: 'Copy wallet address',
      key: 'copy-wallet',
      icon: <Wallet />,
      onClick: async () => {
        if (!connectedAddress) {
          return;
        }
        await copyToClipboard(connectedAddress, 'Address successfully copied');
      },
    },
    {
      label: 'Disconnect',
      key: 'disconnect',
      icon: <LogoutIcon />,
      style: {
        color: tokenCssVars.colorError,
      },
      onClick: () => {
        disconnect();
      },
    },
  ];

  return items.filter(notEmpty);
}
