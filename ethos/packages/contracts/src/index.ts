import { type EthosEnvironment } from '@ethos/env';
import { type Entries } from 'type-fest';
import { type Address, getAddress } from 'viem';
import attestation from './attestation.json';
import contractAddressManager from './contractAddressManager.json';
import discussion from './discussion.json';
import escrow from './escrow.json';
import interactionControl from './interactionControl.json';
import profile from './profile.json';
import reputationMarket from './reputationMarket.json';
import review from './review.json';
import signatureVerifier from './signatureVerifier.json';
import slashPenalty from './slashPenalty.json';
import { type TypedContractEvent } from './types/common';
import vaultFactory from './vaultFactory.json';
import vaultManager from './vaultManager.json';
import vote from './vote.json';
import vouch from './vouch.json';

export * as TypeChain from './types';

export * as TypeChainCommon from './types/common';

export type { TypedContractEvent };

export * as AttestationTypes from './types/AttestationAbi';
export * as ContractAddressManagerTypes from './types/ContractAddressManagerAbi';
export * as DiscussionTypes from './types/DiscussionAbi';
export * as EscrowTypes from './types/EscrowAbi';
export * as InteractionControlTypes from './types/InteractionControlAbi';
export * as ProfileTypes from './types/ProfileAbi';
export * as ReviewTypes from './types/ReviewAbi';
export * as SignatureVerifierTypes from './types/SignatureVerifierAbi';
export * as VoteTypes from './types/VoteAbi';
export * as VouchTypes from './types/VouchAbi';
export * as MarketTypes from './types/ReputationMarketAbi';

export type Network = 'base-sepolia' | 'base-mainnet';

export const ETHOS_ENVIRONMENT_NETWORKS: Record<EthosEnvironment, Network> = {
  local: 'base-sepolia',
  dev: 'base-sepolia',
  testnet: 'base-sepolia',
  prod: 'base-mainnet',
} as const;

export type Contract = (typeof contracts)[number];

export type GetContractArguments = (owner: string) => string[];
export type ContractConfig = Record<
  Contract,
  { name: string; getArguments: GetContractArguments; isUpgradeable: boolean }
>;

export const smartContractNames = {
  attestation: 'ETHOS_ATTESTATION',
  contractAddressManager: 'ETHOS_CONTRACT_ADDRESS_MANAGER',
  discussion: 'ETHOS_DISCUSSION',
  escrow: 'ETHOS_ESCROW',
  interactionControl: 'ETHOS_INTERACTION_CONTROL',
  profile: 'ETHOS_PROFILE',
  reputationMarket: 'ETHOS_REPUTATION_MARKET',
  review: 'ETHOS_REVIEW',
  signatureVerifier: 'ETHOS_SIGNATURE_VERIFIER',
  vote: 'ETHOS_VOTE',
  vouch: 'ETHOS_VOUCH',
  vaultManager: 'ETHOS_VAULT_MANAGER',
  vaultFactory: 'ETHOS_VAULT_FACTORY',
  slashPenalty: 'ETHOS_SLASH_PENALTY',
} as const;

export const contracts = Object.keys(smartContractNames) as ReadonlyArray<
  keyof typeof smartContractNames
>;

type ContractAlias = (typeof smartContractNames)[keyof typeof smartContractNames];

export type ContractLookup = Record<
  Contract,
  {
    name: string;
    address: Address;
    isProxy: boolean;
    isUpgradeable: boolean;
    alias?: ContractAlias;
  }
>;

export const reviewContractName = 'review';
export const vouchContractName = 'vouch';
export const discussionContractName = 'discussion';
export const attestationContractName = 'attestation';
export type TargetContract =
  | typeof attestationContractName
  | typeof reviewContractName
  | typeof vouchContractName
  | typeof discussionContractName;

export function getNetworkByEnvironment(environment: EthosEnvironment): Network {
  return ETHOS_ENVIRONMENT_NETWORKS[environment];
}

export function isMainnetEnvironment(environment: EthosEnvironment): boolean {
  return ETHOS_ENVIRONMENT_NETWORKS[environment] === 'base-mainnet';
}

export function getContractsForEnvironment(environment: EthosEnvironment): ContractLookup {
  const contractsMap = getContractsMap(environment);
  const contractEntries = (Object.entries(contractsMap) as Entries<typeof contractsMap>).map(
    ([key, value]) => {
      const address = value.address;
      const proxyAddress = !value.isUpgradeable ? null : value.proxyAddress;

      const contractAddress = value.isUpgradeable ? proxyAddress : address;

      if (!contractAddress) {
        throw new Error(`Missing contract address for ${key}`);
      }

      const data: ContractLookup[keyof ContractLookup] = {
        name: value.name,
        address: contractAddress,
        isProxy: value.isUpgradeable,
        isUpgradeable: value.isUpgradeable,
      };

      if ('alias' in value) {
        data.alias = value.alias;
      }

      return [key, data];
    },
  );

  return Object.fromEntries(contractEntries);
}

type BaseContractParams = {
  name: string;
  alias?: ContractAlias;
  address: Address;
};

type UpgradeableContractParams = BaseContractParams & {
  isUpgradeable: true;
  proxyAddress: Address;
};

type NonUpgradeableContractParams = BaseContractParams & {
  isUpgradeable: false;
};

export function getContractKeyByEnvironment(
  environment: EthosEnvironment,
): Exclude<EthosEnvironment, 'local'> {
  // Both local and dev environments use the same contract addresses
  return environment === 'local' ? 'dev' : environment;
}

function getContractsMap(
  environment: EthosEnvironment,
): Record<Contract, UpgradeableContractParams | NonUpgradeableContractParams> {
  const contractEnvironmentKey = getContractKeyByEnvironment(environment);

  return {
    attestation: {
      name: 'EthosAttestation',
      alias: smartContractNames.attestation,
      address: getAddress(attestation[contractEnvironmentKey].address),
      proxyAddress: getAddress(attestation[contractEnvironmentKey].proxyAddress),
      isUpgradeable: true,
    },
    contractAddressManager: {
      name: 'ContractAddressManager',
      address: getAddress(contractAddressManager[contractEnvironmentKey].address),
      isUpgradeable: false,
    },
    discussion: {
      name: 'EthosDiscussion',
      alias: smartContractNames.discussion,
      address: getAddress(discussion[contractEnvironmentKey].address),
      proxyAddress: getAddress(discussion[contractEnvironmentKey].proxyAddress),
      isUpgradeable: true,
    },
    interactionControl: {
      name: 'InteractionControl',
      alias: smartContractNames.interactionControl,
      address: getAddress(interactionControl[contractEnvironmentKey].address),
      isUpgradeable: false,
    },
    reputationMarket: {
      name: 'ReputationMarket',
      alias: smartContractNames.reputationMarket,
      address: getAddress(reputationMarket[contractEnvironmentKey].address),
      proxyAddress: getAddress(reputationMarket[contractEnvironmentKey].proxyAddress),
      isUpgradeable: true,
    },
    profile: {
      name: 'EthosProfile',
      alias: smartContractNames.profile,
      address: getAddress(profile[contractEnvironmentKey].address),
      proxyAddress: getAddress(profile[contractEnvironmentKey].proxyAddress),
      isUpgradeable: true,
    },
    review: {
      name: 'EthosReview',
      alias: smartContractNames.review,
      address: getAddress(review[contractEnvironmentKey].address),
      proxyAddress: getAddress(review[contractEnvironmentKey].proxyAddress),
      isUpgradeable: true,
    },
    signatureVerifier: {
      name: 'SignatureVerifier',
      address: getAddress(signatureVerifier[contractEnvironmentKey].address),
      isUpgradeable: false,
    },
    vote: {
      name: 'EthosVote',
      alias: smartContractNames.vote,
      address: getAddress(vote[contractEnvironmentKey].address),
      proxyAddress: getAddress(vote[contractEnvironmentKey].proxyAddress),
      isUpgradeable: true,
    },
    vouch: {
      name: 'EthosVouch',
      alias: smartContractNames.vouch,
      address: getAddress(vouch[contractEnvironmentKey].address),
      proxyAddress: getAddress(vouch[contractEnvironmentKey].proxyAddress),
      isUpgradeable: true,
    },
    escrow: {
      name: 'EthosEscrow',
      alias: smartContractNames.escrow,
      address: getAddress(escrow[contractEnvironmentKey].address),
      isUpgradeable: false,
    },
    vaultManager: {
      name: 'EthosVaultManager',
      alias: smartContractNames.vaultManager,
      address: getAddress(vaultManager[contractEnvironmentKey].address),
      proxyAddress: getAddress(vaultManager[contractEnvironmentKey].proxyAddress),
      isUpgradeable: true,
    },
    vaultFactory: {
      name: 'EthosVaultFactory',
      alias: smartContractNames.vaultFactory,
      address: getAddress(vaultFactory[contractEnvironmentKey].address),
      isUpgradeable: false,
    },
    slashPenalty: {
      name: 'EthosSlashPenalty',
      alias: smartContractNames.slashPenalty,
      address: getAddress(slashPenalty[contractEnvironmentKey].address),
      proxyAddress: getAddress(slashPenalty[contractEnvironmentKey].proxyAddress),
      isUpgradeable: true,
    },
  };
}
