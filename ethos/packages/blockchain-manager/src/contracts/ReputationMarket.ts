import { type ContractLookup, TypeChain } from '@ethos/contracts';
import {
  type ErrorDescription,
  isCallException,
  type ContractRunner,
  type ContractTransactionResponse,
} from 'ethers';
import { getAddress, parseEther, type Address } from 'viem';
import { type ProfileId } from '../types.js';

export class InsufficientVotesOwnedError extends Error {
  profileId: number;
  address: Address;

  constructor(error: ErrorDescription) {
    super('Insufficient votes', { cause: error });
    this.profileId = error.args.getValue('profileId');
    this.address = error.args.getValue('addressStr');
  }
}
export class InsufficientFundsError extends Error {
  constructor(error: ErrorDescription) {
    super('Insufficient funds', { cause: error });
  }
}

export class SlippageLimitExceededError extends Error {
  constructor(error: ErrorDescription) {
    super(
      `Slippage limit of ${Number(error.args.getValue('slippageBasisPoints')) / 10}% was exceeded. Expected to buy ${error.args.getValue('expectedVotes')} votes, but only ${error.args.getValue('votesBought')} could be funded.`,
      {
        cause: error,
      },
    );
  }
}

export type ReputationMarketError =
  | InsufficientVotesOwnedError
  | InsufficientFundsError
  | SlippageLimitExceededError
  | Error;

type Market = {
  profileId: ProfileId;
  trustVotes: bigint;
  distrustVotes: bigint;
};

export class ReputationMarket {
  public readonly address: Address;
  public readonly contractRunner: ContractRunner;
  public readonly contract: TypeChain.ReputationMarketAbi;

  public readonly MAX_VOTE_PRICE = parseEther('0.001'); // todo pull this from contract

  constructor(runner: ContractRunner, contractLookup: ContractLookup) {
    this.address = contractLookup.reputationMarket.address;
    this.contractRunner = runner;
    this.contract = TypeChain.ReputationMarketAbi__factory.connect(this.address, runner);
  }

  async getVotePrice(profileId: number, isPositive: boolean): Promise<bigint> {
    return await this.contract.getVotePrice(profileId, isPositive);
  }

  async getUserVotes(
    user: Address,
    profileId: number,
  ): Promise<{ trustVotes: bigint; distrustVotes: bigint }> {
    return await this.contract.getUserVotes(user, profileId);
  }

  async createMarket(value: bigint): Promise<ContractTransactionResponse> {
    return await this.contract.createMarket({ value });
  }

  async createMarketWithConfigAdmin(
    marketOwner: Address,
    marketConfigIndex: number,
    initialLiquidity: bigint,
  ): Promise<ContractTransactionResponse> {
    return await this.contract.createMarketWithConfigAdmin(marketOwner, marketConfigIndex, {
      value: initialLiquidity,
    });
  }

  async getMarketConfigs(): Promise<
    Array<{ configIndex: number; initialLiquidity: bigint; initialVotes: bigint }>
  > {
    const marketConfigCount = await this.contract.getMarketConfigCount();

    const configs = await Promise.all(
      Array.from({ length: Number(marketConfigCount) }, async (_, i) => {
        const config = await this.contract.marketConfigs(i);

        return {
          configIndex: i,
          initialLiquidity: config.initialLiquidity,
          initialVotes: config.initialVotes,
        };
      }),
    );

    return configs;
  }

  async buyVotes(
    profileId: number,
    buyAmount: bigint,
    isPositive: boolean,
    expectedVotes: bigint,
    slippageBasisPoints: bigint,
  ): Promise<ContractTransactionResponse> {
    try {
      return await this.contract.buyVotes(
        profileId,
        isPositive,
        expectedVotes,
        slippageBasisPoints,
        {
          value: buyAmount,
        },
      );
    } catch (error) {
      throw this.tryParseError(error);
    }
  }

  async sellVotes(
    profileId: number,
    isPositive: boolean,
    amount: number,
  ): Promise<ContractTransactionResponse> {
    return await this.contract.sellVotes(profileId, isPositive, amount);
  }

  async getMarket(profileId: number): Promise<Market> {
    const market = await this.contract.getMarket(profileId);

    return {
      profileId: Number(market.profileId),
      trustVotes: market.trustVotes,
      distrustVotes: market.distrustVotes,
    };
  }

  async simulateSell(
    profileId: number,
    isPositive: boolean,
    amount: number,
    address: Address,
  ): Promise<{ votesSold: bigint; fundsReceived: bigint; newVotePrice: bigint }> {
    try {
      return await this.contract.simulateSell(profileId, isPositive, amount, { from: address });
    } catch (error) {
      const marketError = this.tryParseError(error);
      throw marketError;
    }
  }

  async simulateBuy(
    profileId: number,
    isPositive: boolean,
    funds: bigint,
  ): Promise<{ votesBought: bigint; fundsPaid: bigint; newVotePrice: bigint }> {
    try {
      return await this.contract.simulateBuy(profileId, isPositive, funds);
    } catch (error) {
      const marketError = this.tryParseError(error);
      throw marketError;
    }
  }

  async getParticipants(profileId: number, index: number): Promise<Address> {
    const participant = await this.contract.participants(profileId, index);

    return getAddress(participant);
  }

  async isParticipant(profileId: number, address: Address): Promise<boolean> {
    return await this.contract.isParticipant(profileId, address);
  }

  async getParticipantCount(profileId: number): Promise<bigint> {
    return await this.contract.getParticipantCount(profileId);
  }

  async setIsProfileAllowedToCreateMarket(
    profileId: number,
    isAllowed: boolean,
  ): Promise<ContractTransactionResponse> {
    return await this.contract.setUserAllowedToCreateMarket(profileId, isAllowed);
  }

  async getIsProfileAllowedToCreateMarket(profileId: number): Promise<boolean> {
    return await this.contract.isAllowedToCreateMarket(profileId);
  }

  private tryParseError(error: any): ReputationMarketError {
    if (!isCallException(error) || !error.data) {
      return new Error('Unknown error', { cause: error });
    }

    const parsedError = this.contract.interface.parseError(error.data);

    if (!parsedError) {
      return new Error('Unexpected error', { cause: error });
    }

    switch (parsedError.name) {
      case 'InsufficientVotesOwned':
        return new InsufficientVotesOwnedError(parsedError);
      case 'InsufficientFunds':
        return new InsufficientFundsError(parsedError);
      case 'SlippageLimitExceeded':
        return new SlippageLimitExceededError(parsedError);
      default:
        return new Error('Unknown error', { cause: error });
    }
  }
}
