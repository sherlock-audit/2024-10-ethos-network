import { css } from '@emotion/react';
import { Badge, Button, Tooltip } from 'antd';
import Link from 'next/link';
import { zeroAddress } from 'viem';
import { PaymentsOutlined } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { useCurrentUser } from 'contexts/current-user.context';
import { useThemeMode } from 'contexts/theme-manager.context';
import { useEthToUSD } from 'hooks/api/eth-to-usd-rate.hook';
import { useVouchRewards } from 'hooks/user/lookup';

export function Rewards() {
  const mode = useThemeMode();
  const { connectedAddress } = useCurrentUser();
  const target = { address: connectedAddress ?? zeroAddress };

  const { data: vouchRewards } = useVouchRewards(target);
  const rewardsBalance = {
    eth: Number(vouchRewards?.rewards) || 0,
    usd: useEthToUSD(Number(vouchRewards?.rewards) || 0),
  };

  return (
    <Link href="/profile/vouches">
      <Tooltip
        title={`You have ${rewardsBalance.eth.toFixed(4)}e (${rewardsBalance.usd}) in rewards to claim`}
      >
        <Badge
          dot={rewardsBalance.eth > 0}
          offset={[-8, 10]}
          css={css`
            .ant-badge-dot {
              width: 9px;
              height: 9px;
              box-shadow: 0 0 0 2px ${tokenCssVars.colorBgLayout};
              background-color: ${tokenCssVars.colorPrimary};
            }
          `}
        >
          <Button
            css={css`
              &:hover {
                ${mode === 'light' && `background-color: ${tokenCssVars.colorBgContainer};`}
              }
            `}
            type="text"
            icon={<PaymentsOutlined />}
          />
        </Badge>
      </Tooltip>
    </Link>
  );
}
