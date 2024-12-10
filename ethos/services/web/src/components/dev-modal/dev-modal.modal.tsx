'use client';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { useStatsigClient } from '@statsig/react-bindings';
import { Button, Card, Flex, Modal, Space, Switch, Table, Tag, Typography } from 'antd';
import { type ColumnType } from 'antd/es/table';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useSkipOnboardingSteps } from '../../hooks/use-skip-onboarding-steps';
import { useLocalStorage } from '../../hooks/use-storage';
import { ContractsList } from './contracts-list.component';
import { getEnvironment } from 'config/environment';
import { getAppVersion } from 'config/misc';
import { tokenCssVars } from 'config/theme';
import { featureGates, sensitiveFeatureGates } from 'constant/feature-flags';
import { useSimplifiedXAttestation } from 'hooks/use-simplified-x-attestation';
import { clearReactQueryCache } from 'services/idb-store';

const { Text } = Typography;

const environment = getEnvironment();

export function DevModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  function openModal() {
    setIsModalOpen(true);
  }
  function closeModal() {
    setIsModalOpen(false);
  }

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
      {environment !== 'prod' && <FeatureGateList />}
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

function FeatureGateList() {
  const statsigClient = useStatsigClient();
  const isReadOnly = !['dev', 'local'].includes(getEnvironment());

  const featureGateList = useMemo(() => {
    return Object.values(featureGates)
      .filter((f) => !isReadOnly || !sensitiveFeatureGates.has(f))
      .map((featureGate) => {
        const gate = statsigClient.getFeatureGate(featureGate);

        return {
          name: featureGate,
          value: gate.value,
          details: gate.details,
        };
      });
  }, [statsigClient, isReadOnly]);
  const columns: Array<ColumnType<(typeof featureGateList)[number]>> = [
    {
      title: `Feature Gate (${featureGateList.length})`,
      dataIndex: 'name',
      render: (name: string) => {
        return isReadOnly ? (
          <Text code copyable>
            {name}
          </Text>
        ) : (
          <Link href={`https://console.statsig.com/gates/${name}`} target="_blank">
            {name}
          </Link>
        );
      },
    },
    {
      title: 'Enabled',
      dataIndex: 'value',
      align: 'right',
      render: (value: boolean) => {
        return <Tag color={value ? 'success' : 'error'}>{value ? 'Yes' : 'No'}</Tag>;
      },
    },
  ];

  return <Table dataSource={featureGateList} columns={columns} pagination={false} />;
}
