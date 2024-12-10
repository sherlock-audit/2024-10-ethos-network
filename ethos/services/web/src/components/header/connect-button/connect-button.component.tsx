import { css, type SerializedStyles } from '@emotion/react';
import { formatEth } from '@ethos/helpers';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button, Dropdown, Flex, theme, Tooltip } from 'antd';
import { zeroAddress } from 'viem';
import { ConnectButtonWrapper } from './connect-button-wrapper';
import { useWalletDropdownItems } from './use-wallet-dropdown-items';
import { CustomAvatar } from 'components/custom-rainbowkit/custom-avatar.component';
import { CaretDownIcon, VouchFilled, Wallet } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { useCurrentUser } from 'contexts/current-user.context';
import { useVouchStats } from 'hooks/user/lookup';

type Props = {
  hideDropdownMenu?: boolean;
  wrapperCSS?: SerializedStyles;
};

export function CustomConnectButton({ hideDropdownMenu, wrapperCSS }: Props) {
  const { connectedAddress, connectedProfile } = useCurrentUser();

  const items = useWalletDropdownItems();

  const vouchStats = useVouchStats({ address: connectedAddress ?? zeroAddress }).data;

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
              if (!connected) {
                return (
                  <Button
                    onClick={openConnectModal}
                    type="primary"
                    css={css`
                      height: 40px;
                      border-radius: ${token.borderRadiusLG}px;
                    `}
                  >
                    Connect Wallet
                  </Button>
                );
              }
              if (chain.unsupported) {
                return (
                  <Button
                    onClick={openChainModal}
                    type="primary"
                    danger
                    icon={<CaretDownIcon />}
                    iconPosition="end"
                    css={css`
                      height: 40px;
                      border-radius: ${token.borderRadiusLG}px;
                    `}
                  >
                    Wrong network
                  </Button>
                );
              }

              if (hideDropdownMenu) {
                return '';
              }

              return (
                <Dropdown
                  menu={{
                    items,
                    style: {
                      width: 180,
                      float: 'right',
                    },
                  }}
                  trigger={['click']}
                >
                  <Button
                    css={css`
                      height: 40px;
                      background: ${tokenCssVars.colorBgContainer};
                      border-radius: ${token.borderRadiusLG}px;
                      padding: 0;
                      border: 0;
                      &:hover {
                        color: ${tokenCssVars.colorLinkHover};
                      }
                    `}
                  >
                    <Flex
                      css={css`
                        height: 100%;
                      `}
                    >
                      <Flex
                        css={css`
                          padding-inline: ${token.paddingSM}px;
                          font-weight: 600;
                          border-right: 1px solid ${tokenCssVars.colorBorderBg};
                          height: 100%;
                        `}
                        align="center"
                        justify="center"
                      >
                        <Flex align="center" gap={12}>
                          <Tooltip title="Wallet balance">
                            <span
                              css={css`
                                color: ${tokenCssVars.colorTextBase};
                              `}
                            >
                              <Wallet />{' '}
                              <span
                                css={css`
                                  color: ${tokenCssVars.colorText};
                                `}
                              >
                                {account.balanceFormatted
                                  ? formatEth(parseFloat(account.balanceFormatted), 'eth', {
                                      maximumFractionDigits: 2,
                                    })
                                  : ''}
                              </span>
                            </span>
                          </Tooltip>
                          {connectedProfile && (
                            <Tooltip title="Vouch balance">
                              <span
                                css={css`
                                  color: ${tokenCssVars.colorTextBase};
                                `}
                              >
                                <VouchFilled />{' '}
                                <span
                                  css={css`
                                    color: ${tokenCssVars.colorText};
                                  `}
                                >
                                  {formatEth(vouchStats?.staked.deposited ?? 0, 'eth')}
                                </span>
                              </span>
                            </Tooltip>
                          )}
                        </Flex>
                      </Flex>
                      <Flex
                        gap={4}
                        css={css`
                          padding-inline: ${token.paddingSM}px;
                        `}
                        align="center"
                        justify="center"
                      >
                        <CustomAvatar address={account.address} size={20} />
                        <CaretDownIcon />
                      </Flex>
                    </Flex>
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
