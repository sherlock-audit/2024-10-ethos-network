import { getContractsForEnvironment, isMainnetEnvironment } from '@ethos/contracts';
import { getEnvironment } from 'config';

type NetworkAddresses = {
  isProxy: boolean;
  address: string;
  isMainnet: boolean;
};

const contractsHelper: Record<string, NetworkAddresses> = {};

const isMainnet = isMainnetEnvironment(getEnvironment());

for (const value of Object.values(getContractsForEnvironment(getEnvironment()))) {
  contractsHelper[value.name] = { isProxy: value.isProxy, address: value.address, isMainnet };
}

export const contracts = Object.entries(contractsHelper)
  .map(([key, value]) => {
    return {
      name: key,
      ...value,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
