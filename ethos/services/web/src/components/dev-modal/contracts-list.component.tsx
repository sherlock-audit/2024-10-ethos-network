import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { getNetworkByEnvironment } from '@ethos/contracts';
import { isValidAddress, shortenHash } from '@ethos/helpers';
import { Flex, Table, Tag, Typography, Button, type TableProps } from 'antd';
import Link from 'next/link';
import { contracts } from './contracts.config';
import {
  useContractVerification,
  type VerificationResult,
  type VerificationStatus,
} from './useContractVerification';
import { CustomPopover } from 'components/custom-popover/custom-popover.component';
import { getEnvironment } from 'config/environment';
import { tokenCssVars } from 'config/theme';

const { Text } = Typography;

const columns: TableProps['columns'] = [
  {
    title: 'Contract',
    dataIndex: 'contract',
    key: 'contract',
  },
  {
    title: getNetworkByEnvironment(getEnvironment()),
    dataIndex: 'network',
    key: 'network',
  },
  {
    title: 'Verification',
    dataIndex: 'verification',
    key: 'verification',
  },
];

const tableStyles = css`
  .ant-table-tbody > tr > td {
    padding: 4px 16px;
  }
`;

function VerificationStatusIcon({ status }: { status: VerificationStatus }) {
  if (status === 'loading') return <LoadingOutlined />;
  if (status === 'success')
    return <CheckCircleOutlined css={css({ color: tokenCssVars.colorSuccess })} />;
  if (status === 'error')
    return <CloseCircleOutlined css={css({ color: tokenCssVars.colorError })} />;

  return <CheckCircleOutlined css={css({ color: tokenCssVars.colorTextQuaternary })} />;
}

function VerificationItem({ verificationResult }: { verificationResult: VerificationResult }) {
  let contents = '';

  if (verificationResult.status === 'success' && verificationResult.managedAddress) {
    contents = verificationResult.managedAddress;
  }
  if (verificationResult.status === 'error') {
    contents =
      (verificationResult.echoConfigAddress
        ? 'echo: ' + shortenHash(verificationResult.echoConfigAddress)
        : '—') +
      ' | ' +
      (verificationResult.managedAddress
        ? 'managed: ' + shortenHash(verificationResult.managedAddress)
        : '—');
  }

  return (
    <Flex align="center" gap="small">
      <VerificationStatusIcon status={verificationResult.status} />
      <CustomPopover content={contents}>
        {verificationResult.status === 'success' && verificationResult.managedAddress && (
          <Text>{shortenHash(verificationResult.managedAddress)}</Text>
        )}
        {verificationResult.status === 'error' && <Text type="danger">Mismatch</Text>}
        {verificationResult.status === null && <Text type="secondary">Not verified</Text>}
        {verificationResult.status === 'loading' && <Text>Verifying...</Text>}
      </CustomPopover>
    </Flex>
  );
}

function BasescanLink({
  address,
  isMainnet,
  isProxy,
  shortenAddress = false,
}: {
  address: string;
  isMainnet: boolean;
  isProxy: boolean;
  shortenAddress?: boolean;
}) {
  if (!isValidAddress(address)) {
    return <span>—</span>;
  }

  return (
    <Flex gap={8} align="center">
      <Text copyable={{ text: address }}>
        <Link
          href={`https://${isMainnet ? 'basescan.org' : 'sepolia.basescan.org'}/address/${address}`}
          target="_blank"
        >
          {shortenAddress ? shortenHash(address) : address}&nbsp;
        </Link>
      </Text>
      {isProxy && <Tag color={tokenCssVars.colorPrimary}>Proxy</Tag>}
    </Flex>
  );
}

export function ContractsList({ shortenAddress = false }: { shortenAddress?: boolean }) {
  const { verificationResults, handleVerifyAllContracts } = useContractVerification();

  function getVerificationResult(contractName: string) {
    return verificationResults[contractName] || { status: null };
  }

  const dataSource = contracts.map((contract) => ({
    key: contract.name,
    contract: contract.name,
    network: (
      <BasescanLink
        address={contract.address}
        isMainnet={false}
        isProxy={contract.isProxy}
        shortenAddress={shortenAddress}
      />
    ),
    verification: <VerificationItem verificationResult={getVerificationResult(contract.name)} />,
  }));

  return (
    <Flex
      vertical
      css={css`
        height: 100%;
      `}
    >
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="small"
        css={css`
          ${tableStyles}
          flex-grow: 1;
        `}
      />
      <Flex
        justify="flex-end"
        css={css`
          margin-top: 16px;
        `}
      >
        <Button
          onClick={handleVerifyAllContracts}
          type="primary"
          ghost
          loading={Object.values(verificationResults).some((result) => result.status === 'loading')}
        >
          Verify All Contracts
        </Button>
      </Flex>
    </Flex>
  );
}
