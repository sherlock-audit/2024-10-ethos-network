'use client';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { Button, Card, Flex, Modal, Space, Switch, Typography } from 'antd';
import { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useSkipOnboardingSteps } from '../../hooks/use-skip-onboarding-steps';
import { useLocalStorage } from '../../hooks/use-storage';
import { ContractsList } from './contracts-list.component';
import { getAppVersion, getEnvironment, tokenCssVars } from 'config';
import { useSimplifiedXAttestation } from 'hooks/use-simplified-x-attestation';
import { clearReactQueryCache } from 'services/idb-store';

const { Text } = Typography;

const environment = getEnvironment();

export function DevModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // "mod" is Cmd on macOS and Ctrl on Windows
  useHotkeys(
    'mod+shift+e',
    () => {
      openModal();
    },
    { preventDefault: true },
  );

  return (
    <Modal
      title="Contracts"
      open={isModalOpen}
      onCancel={closeModal}
      width={640}
      footer={
        <Flex justify="space-between" align="center">
          <Text type="secondary">
            App version: <Text code>{getAppVersion()}</Text>
          </Text>
          <Button key="close" onClick={closeModal}>
            Close
          </Button>
        </Flex>
      }
    >
      <ContractsList shortenAddress />
      <CacheToggler />
      {(environment === 'local' || environment === 'dev') && <TwitterAttestationToggler />}
      {(environment === 'local' || environment === 'dev') && <OnboardingSkipToggler />}
    </Modal>
  );
}

function CacheToggler() {
  const [isCacheEnabled, setIsCacheEnabled] = useLocalStorage('dev.ENABLE_CACHING', true);
  const [isClearingCache, setIsClearingCache] = useState(false);

  async function clearCache() {
    if (!isCacheEnabled) return;
    setIsClearingCache(true);
    const err = await clearReactQueryCache();

    if (err) {
      console.warn('Failed to clear cache:', err);
      setIsClearingCache(false);

      return;
    }
    setTimeout(() => {
      // eslint-disable-next-line no-console
      console.info('Cleared Ethos cache');
      setIsClearingCache(false);
    }, 3000);
  }

  return (
    <Card
      css={css`
        margin-block: 20px;
      `}
    >
      <Space
        css={css`
          width: 100%;
          justify-content: space-between;
        `}
      >
        <Text
          strong
          css={css`
            color: ${isCacheEnabled ? tokenCssVars.colorSuccess : tokenCssVars.colorError};
            font-size: 14px;
          `}
        >
          DEV OPTION: <Text code>react-query</Text> cache
        </Text>
        <Button
          onClick={clearCache}
          type={isClearingCache ? 'default' : 'primary'}
          disabled={isClearingCache || !isCacheEnabled}
        >
          {isClearingCache ? 'Cache Empty' : 'Clear Cache'}
        </Button>
        <Switch
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
          defaultChecked={isCacheEnabled}
          onChange={(checked) => {
            setIsCacheEnabled(checked);
          }}
        />
      </Space>
    </Card>
  );
}

// Todo: Add generic configurable toggler
function TwitterAttestationToggler() {
  const { isSimplifiedXAttestationEnabled, setIsSimplifiedXAttestation } =
    useSimplifiedXAttestation();

  return (
    <Card
      css={css`
        margin-block: 20px;
      `}
    >
      <Space
        css={css`
          width: 100%;
          justify-content: space-between;
        `}
      >
        <Text
          strong
          css={css`
            color: ${isSimplifiedXAttestationEnabled
              ? tokenCssVars.colorSuccess
              : tokenCssVars.colorError};
            font-size: 14px;
          `}
        >
          DEV OPTION: Simplified x.com attestation
        </Text>
        <Switch
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
          defaultChecked={isSimplifiedXAttestationEnabled}
          onChange={(checked) => {
            setIsSimplifiedXAttestation(checked);
          }}
        />
      </Space>
    </Card>
  );
}

function OnboardingSkipToggler() {
  const { setShowSkipOnboarding, showSkipOnboarding } = useSkipOnboardingSteps();

  return (
    <Card
      css={css`
        margin-block: 20px;
      `}
    >
      <Space
        css={css`
          width: 100%;
          justify-content: space-between;
        `}
      >
        <Text
          strong
          css={css`
            color: ${showSkipOnboarding ? tokenCssVars.colorSuccess : tokenCssVars.colorError};
            font-size: 14px;
          `}
        >
          DEV OPTION: Skip onboarding steps
        </Text>
        <Switch
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
          defaultChecked={showSkipOnboarding}
          onChange={(checked) => {
            setShowSkipOnboarding(checked);
          }}
        />
      </Space>
    </Card>
  );
}
