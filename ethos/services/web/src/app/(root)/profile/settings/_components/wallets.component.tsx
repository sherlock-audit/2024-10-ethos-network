import { ClockCircleOutlined, CopyOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { useCopyToClipboard } from '@ethos/common-ui';
import { isAddressEqualSafe, notEmpty, shortenHash } from '@ethos/helpers';
import { usePrivy } from '@privy-io/react-auth';
import { useFeatureGate } from '@statsig/react-bindings';
import { Avatar, Badge, Button, Card, Col, Flex, Row, Typography } from 'antd';
import { Ethereum, SolanaIcon } from 'components/icons';
import { tokenCssVars } from 'config/theme';
import { featureGates } from 'constant/feature-flags';
import { useCurrentUser } from 'contexts/current-user.context';
import { useRegisterSmartWallet } from 'hooks/api/auth/register-wallet.hooks';
import { getBlockieUrl } from 'hooks/user/lookup';
import { useLoginEthosUser } from 'hooks/user/privy.hooks';

export function Wallets() {
  const {
    connectedProfileAddresses,
    connectedProfilePrimaryAddress,
    isLoadingConnectedProfileAddresses,
    smartWalletAddress,
    isSmartWalletConnected,
  } = useCurrentUser();
  const registerSmartWallet = useRegisterSmartWallet();

  const { authenticated, logout, linkPasskey, exportWallet } = usePrivy();
  const login = useLoginEthosUser();
  const { value: isPrivyEnabled } = useFeatureGate(featureGates.privyIntegration);
  const copyToClipboard = useCopyToClipboard();

  const wallets = [...new Set([...connectedProfileAddresses, smartWalletAddress].filter(notEmpty))];

  return (
    <>
      <Row
        gutter={[22, 22]}
        css={css`
          margin-bottom: 12px;
          padding-left: 12px;
        `}
      >
        <Typography.Title level={4}>
          <Ethereum /> Ethereum wallets
        </Typography.Title>
      </Row>
      <Row gutter={[22, 22]}>
        {isLoadingConnectedProfileAddresses ? (
          <Card loading />
        ) : (
          wallets.map((wallet) => {
            const isPrimary =
              connectedProfilePrimaryAddress &&
              isAddressEqualSafe(wallet, connectedProfilePrimaryAddress);
            const isSmartWallet =
              smartWalletAddress && isAddressEqualSafe(wallet, smartWalletAddress);

            const WalletCard = (
              <Card>
                <Flex align="center" vertical gap={12}>
                  <Flex align="center" vertical gap={12}>
                    <Avatar src={getBlockieUrl(wallet)} size="large" />
                    <Flex vertical>
                      <Typography.Title level={5}>{shortenHash(wallet)}</Typography.Title>
                    </Flex>
                    {isPrivyEnabled && isSmartWallet && !isSmartWalletConnected && (
                      <Button
                        size="small"
                        onClick={() => {
                          registerSmartWallet.mutate();
                        }}
                      >
                        Connect
                      </Button>
                    )}
                  </Flex>
                  <Flex
                    css={css`
                      cursor: pointer;
                      color: ${tokenCssVars.colorPrimary};
                      font-size: 14px;
                    `}
                    onClick={async () => {
                      await copyToClipboard(wallet, 'Address successfully copied');
                    }}
                  >
                    <Typography.Link css={{ color: tokenCssVars.colorPrimary }}>
                      Copy full address <CopyOutlined />
                    </Typography.Link>
                  </Flex>
                </Flex>
              </Card>
            );

            return (
              <Col key={wallet} xs={12} sm={8} md={6} lg={5}>
                {(isPrimary ?? isSmartWallet) ? (
                  <Badge.Ribbon
                    text={isPrimary ? 'Primary' : 'Smart Wallet'}
                    color={isPrimary ? 'success' : 'orange'}
                  >
                    {WalletCard}
                  </Badge.Ribbon>
                ) : (
                  WalletCard
                )}
              </Col>
            );
          })
        )}
        {authenticated ? (
          <Col xs={12} sm={8} md={6} lg={5}>
            <Card>
              <Flex gap="small" vertical>
                <Button color="danger" onClick={logout}>
                  Log out
                </Button>
                <Button onClick={linkPasskey}>Set up passkey</Button>
                <Button onClick={exportWallet}>Export wallet</Button>
              </Flex>
            </Card>
          </Col>
        ) : isPrivyEnabled ? (
          <Col xs={12} sm={8} md={6} lg={5}>
            <Card>
              <Button type="primary" onClick={login}>
                Create smart wallet
              </Button>
            </Card>
          </Col>
        ) : null}
      </Row>
      <Row
        gutter={[22, 22]}
        css={css`
          margin-top: 12px;
          margin-bottom: 12px;
          padding-left: 12px;
        `}
      >
        <Typography.Title level={4}>
          <SolanaIcon /> Solana wallets
        </Typography.Title>
      </Row>
      <Row gutter={[22, 22]}>
        <Col xs={12} sm={8} md={6} lg={5}>
          <Card>
            <Flex align="center" vertical gap={12}>
              <Flex align="center" vertical gap={12}>
                <div
                  css={css`
                    width: 64px;
                    height: 64px;
                    background-color: ${tokenCssVars.colorBgLayout};
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                  `}
                >
                  <ClockCircleOutlined />
                </div>
                <Flex vertical>
                  <Typography.Title level={5}>Coming Soon</Typography.Title>
                </Flex>
              </Flex>
              <Typography.Text type="secondary" css={{ textAlign: 'center' }}>
                Solana support is currently in progress.
              </Typography.Text>
            </Flex>
          </Card>
        </Col>
      </Row>
    </>
  );
}
