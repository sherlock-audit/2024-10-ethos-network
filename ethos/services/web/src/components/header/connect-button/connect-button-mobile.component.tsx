import { css, type SerializedStyles } from '@emotion/react';
import { formatEth } from '@ethos/helpers';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button, Dropdown, Flex, theme, Typography } from 'antd';
import { zeroAddress } from 'viem';
import { ConnectButtonWrapper } from './connect-button-wrapper';
import { useWalletDropdownItems } from './use-wallet-dropdown-items';
import { CustomAvatar } from 'components/custom-rainbowkit/custom-avatar.component';
import { VouchFilled, Wallet } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { useCurrentUser } from 'contexts/current-user.context';
import { useActor } from 'hooks/user/activities';
import { useVouchStats } from 'hooks/user/lookup';
import { routeTo } from 'utils/routing';

type Props = {
  hideDropdownMenu?: boolean;
  wrapperCSS?: SerializedStyles;
};

export function CustomConnectButtonMobile({ hideDropdownMenu, wrapperCSS }: Props) {
  const { connectedAddress } = useCurrentUser();
  const target = { address: connectedAddress ?? zeroAddress };

  const actor = useActor(target);

  const items = useWalletDropdownItems();
  const vouchStats = useVouchStats(target).data;

  return (
    <ConnectButton.Custom>
      {({ account, chain, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const { token } = theme.useToken();
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        return (
          <ConnectButtonWrapper ready={ready} wrapperCSS={wrapperCSS}>
            {(() => {
              if (!connected || chain?.unsupported) {
                return (
                  <Button
                    onClick={chain?.unsupported ? openChainModal : openConnectModal}
                    type="default"
                    icon={<Wallet />}
                    css={{
                      backgroundColor: tokenCssVars.colorBgContainer,
                      color: chain?.unsupported ? tokenCssVars.colorError : tokenCssVars.colorText,
                    }}
                  />
                );
              }

              if (hideDropdownMenu) {
                return '';
              }

              const walletInfo = (
                <Button
                  href={routeTo(target).profile}
                  type="link"
                  css={css`
                    height: 40px;
                    background: transparent;
                    border-radius: ${token.borderRadiusLG}px;
                    padding: 0;
                    border: 0;
                    width: 100%;
                  `}
                >
                  <Flex
                    gap={12}
                    css={css`
                      padding-inline: 0px;
                      width: 100%;
                      flex: 1;
                    `}
                    align="center"
                    justify="flex-start"
                  >
                    <CustomAvatar address={account.address} size={40} />
                    <Flex vertical justify="flex-start" align="flex-start">
                      <Typography.Text
                        css={css`
                          font-size: 14px;
                          font-weight: 600;
                          line-height: 22px;
                          max-width: 120px;
                        `}
                        ellipsis={true}
                      >
                        {actor.name}
                      </Typography.Text>
                      <Flex gap={12}>
                        <Flex
                          gap={4}
                          css={{
                            color: tokenCssVars.colorTextSecondary,
                          }}
                        >
                          <Wallet />
                          {account.balanceFormatted
                            ? formatEth(parseFloat(account.balanceFormatted), 'eth', {
                                maximumFractionDigits: 2,
                              })
                            : ''}
                          <Flex
                            gap={4}
                            css={{
                              color: tokenCssVars.colorTextSecondary,
                            }}
                          >
                            <VouchFilled />
                            {formatEth(vouchStats?.staked.deposited ?? 0, 'eth', {
                              maximumFractionDigits: 3,
                            })}
                          </Flex>
                        </Flex>
                      </Flex>
                    </Flex>
                  </Flex>
                </Button>
              );

              return (
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'wallet',
                        label: walletInfo,
                      },
                      ...items,
                    ],
                    style: {
                      width: 200,
                      float: 'right',
                    },
                  }}
                  trigger={['click']}
                >
                  <Button
                    type="link"
                    css={{
                      paddingInline: 0,
                    }}
                  >
                    <CustomAvatar address={account.address} size={32} />
                  </Button>
                </Dropdown>
              );
            })()}
          </ConnectButtonWrapper>
        );
      }}
    </ConnectButton.Custom>
  );
}
