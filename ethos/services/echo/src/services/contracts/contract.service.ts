import {
  type ContractLookup,
  getContractsForEnvironment,
  smartContractNames,
} from '@ethos/contracts';
import { type Address } from 'viem';
import { z } from 'zod';
import { blockchainManager } from '../../common/blockchain-manager';
import { config } from '../../common/config';
import { Service } from '../service.base';
import { ServiceError } from '../service.error';
import { type AnyRecord } from '../service.types';

type ContractInfo = {
  name: string;
  configAddress: Address;
  managedAddress: Address;
  isProxy: boolean;
};

const contracts: ContractLookup = getContractsForEnvironment(config.ETHOS_ENV);
const contractNames = Object.keys(smartContractNames);
const validContractName = z.custom<keyof ContractLookup>(
  (v) => typeof v === 'string' && isValidContractName(v),
  {
    message: 'Invalid contract name',
  },
);
const schema = z.object({
  targetContracts: z.union([z.literal('all'), z.array(validContractName)]),
});
type Input = z.infer<typeof schema>;
type Output = ContractInfo[];

if (!isNonEmptyArray(contractNames)) {
  throw new Error('No smart contract names configured');
}

export class ContractService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ targetContracts }: Input): Promise<Output> {
    const contractsToFetch = targetContracts === 'all' ? contractNames : targetContracts;

    const validContracts = contractsToFetch.filter(isValidContractName);

    return await Promise.all(
      validContracts.map(async (name) => ({
        name,
        configAddress: contracts[name].address,
        managedAddress: await getManagedContractAddress(name),
        isProxy: contracts[name].isProxy,
      })),
    );
  }
}

async function getManagedContractAddress(name: string): Promise<Address> {
  const noAliases: string[] = ['contractAddressManager', 'signatureVerifier'];

  if (!isValidContractName(name)) {
    throw ServiceError.InternalServerError(`Invalid contract name: ${name}`, {
      fields: ['targetContracts'],
    });
  }
  if (noAliases.includes(name)) {
    return contracts[name].address;
  }
  const alias = contracts[name].alias;

  if (!alias) {
    throw ServiceError.InternalServerError(`Contract ${name} is not aliased`, {
      fields: ['targetContracts'],
    });
  }
  try {
    return await blockchainManager.contractAddressManager.getContractAddressForName(alias);
  } catch (err) {
    throw ServiceError.InternalServerError(
      `Error getting address for contract ${name}: ${err instanceof Error ? err.message : String(err)}`,
      {
        fields: ['targetContracts'],
      },
    );
  }
}

// type guards
function isValidContractName(name: string): name is keyof ContractLookup {
  return name in contracts;
}
function isNonEmptyArray<T>(arr: T[]): arr is [T, ...T[]] {
  return arr.length > 0;
}
