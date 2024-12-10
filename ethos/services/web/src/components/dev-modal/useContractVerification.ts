import { isAddressEqualSafe } from '@ethos/helpers';
import { message } from 'antd';
import { useState } from 'react';
import { getAddress, type Address } from 'viem';
import { contracts as webContracts } from './contracts.config';
import { echoApi } from 'services/echo';

export type VerificationStatus = 'loading' | 'success' | 'error' | null;

export type VerificationResult = {
  status: VerificationStatus;
  managedAddress?: Address;
  webConfigAddress?: Address;
  echoConfigAddress?: Address;
};

type WebContract = {
  name: string;
  address: string;
};

type EchoContract = {
  name: string;
  configAddress: Address;
  managedAddress: Address;
};

function normalizeContractName(name: string): string {
  // @ethos/contracts names do not include the "Ethos" prefix
  return name.replace(/^Ethos/, '').toLowerCase();
}

function checkContractAddresses(
  webContract: WebContract,
  echoContracts: EchoContract[],
): VerificationResult {
  const webContractAddress = getAddress(webContract.address);
  const echoContract = echoContracts.find(
    (c) => normalizeContractName(c.name) === normalizeContractName(webContract.name),
  );

  if (!echoContract) {
    throw new Error(`Echo contract not found for ${webContract.name}`);
  }

  const result: VerificationResult = {
    status: null,
    echoConfigAddress: echoContract.configAddress,
    webConfigAddress: webContractAddress,
    managedAddress: echoContract.managedAddress,
  };

  // check if the echo config address is the same as the contractAddressManager address
  if (!isAddressEqualSafe(echoContract.configAddress, echoContract.managedAddress)) {
    console.warn(
      `Echo/ContractAddressManager mismatch for ${webContract.name}:`,
      echoContract.configAddress,
      echoContract.managedAddress,
    );

    return { ...result, status: 'error' };
  }

  // check if the web config address is the same as the echo config address
  if (!isAddressEqualSafe(webContractAddress, echoContract.configAddress)) {
    console.warn(
      `Echo/Web config address mismatch for ${webContract.name}:`,
      echoContract.configAddress,
      webContractAddress,
    );

    return { ...result, status: 'error' };
  }

  return { ...result, status: 'success' };
}

async function handleVerifyAllContracts(
  setVerificationResults: React.Dispatch<React.SetStateAction<Record<string, VerificationResult>>>,
) {
  const loadingResults = Object.fromEntries(
    webContracts.map((contract) => [contract.name, { status: 'loading' as const }]),
  );
  setVerificationResults(loadingResults);

  try {
    const echoContracts: EchoContract[] = await echoApi.contracts.getAddresses({
      targetContracts: 'all',
    });
    const contractStatus: Record<string, VerificationResult> = {};

    webContracts.forEach((contract) => {
      contractStatus[contract.name] = checkContractAddresses(contract, echoContracts);
    });

    setVerificationResults(contractStatus);

    const hasErrors = Object.values(contractStatus).some((result) => result.status === 'error');
    message[hasErrors ? 'warning' : 'success'](
      hasErrors
        ? 'Mismatch found for some contracts. Check console for details.'
        : 'All contracts verified successfully!',
    );
  } catch (error) {
    const errorResults = Object.fromEntries(
      webContracts.map((contract) => [contract.name, { status: 'error' as const }]),
    );
    setVerificationResults(errorResults);
    message.error('Failed to verify contracts. Check console for details.');
  }
}

export function useContractVerification() {
  const [verificationResults, setVerificationResults] = useState<
    Record<string, VerificationResult>
  >({});

  function verifyAllContracts() {
    handleVerifyAllContracts(setVerificationResults);
  }

  return { verificationResults, handleVerifyAllContracts: verifyAllContracts };
}
