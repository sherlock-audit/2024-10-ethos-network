import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { type ContractTransactionResponse, type Log, type EventLog } from 'ethers';
import { ethers } from 'hardhat';
import { type ReputationMarket } from '../../typechain-types';

export const DEFAULT = {
  reputationMarket: undefined as unknown as ReputationMarket,
  profileId: 1,
  initialLiquidity: ethers.parseEther('1.0'),
  buyAmount: ethers.parseEther('0.001'),
  slippageBasisPoints: 100, // 100 basis points = 1%
  value: { value: ethers.parseEther('0.001') },
  isPositive: true,
  sellVotes: 10n,
};

type Params = {
  reputationMarket: ReputationMarket;
  profileId: number;
  isPositive: boolean;
  buyAmount: bigint;
  sellVotes: bigint;
  slippageBasisPoints: number;
  expectedVotes?: bigint;
};

type Result = {
  balance: bigint;
  gas: bigint;
  trustVotes: bigint;
  distrustVotes: bigint;
  fundsPaid?: bigint;
  fundsReceived?: bigint;
};

function getParams(params?: Partial<Params>): Params {
  return {
    reputationMarket: params?.reputationMarket ?? DEFAULT.reputationMarket,
    profileId: params?.profileId ?? DEFAULT.profileId,
    isPositive: params?.isPositive ?? DEFAULT.isPositive,
    buyAmount: params?.buyAmount ?? DEFAULT.buyAmount,
    sellVotes: params?.sellVotes ?? DEFAULT.sellVotes,
    slippageBasisPoints: params?.slippageBasisPoints ?? DEFAULT.slippageBasisPoints,
    expectedVotes: params?.expectedVotes,
  };
}

export async function getExpectedVotePrice(params?: Partial<Params>): Promise<bigint> {
  const { reputationMarket, profileId, isPositive } = getParams(params);
  const market = await reputationMarket.getMarket(profileId);
  const totalVotes = market.trustVotes + market.distrustVotes;

  return ((isPositive ? market.trustVotes : market.distrustVotes) * DEFAULT.buyAmount) / totalVotes;
}

function isEventLog(log: Log): log is EventLog {
  return 'args' in log && typeof log.args === 'object';
}

function isVotesBoughtEvent(reputationMarket: ReputationMarket) {
  return function (log: Log): log is EventLog {
    return (
      isEventLog(log) &&
      log.topics[0] === reputationMarket.interface.getEvent('VotesBought')?.topicHash
    );
  };
}

function isVotesSoldEvent(reputationMarket: ReputationMarket) {
  return function (log: Log): log is EventLog {
    return (
      isEventLog(log) &&
      log.topics[0] === reputationMarket.interface.getEvent('VotesSold')?.topicHash
    );
  };
}

export class MarketUser {
  public readonly signer: HardhatEthersSigner;
  constructor(signer: HardhatEthersSigner) {
    this.signer = signer;
  }

  async getVotes(
    params?: Partial<Params>,
  ): Promise<{ trustVotes: bigint; distrustVotes: bigint; balance: bigint }> {
    const { reputationMarket, profileId } = getParams(params);
    const { trustVotes, distrustVotes } = await reputationMarket
      .connect(this.signer)
      .getUserVotes(this.signer.getAddress(), profileId);
    const balance = await ethers.provider.getBalance(this.signer.address);

    return { trustVotes, distrustVotes, balance };
  }

  async getGas(tx: ContractTransactionResponse): Promise<{ gas: bigint }> {
    const receipt = await tx.wait();

    if (!receipt?.status) {
      throw new Error('Transaction failed');
    }

    return { gas: receipt.gasUsed };
  }

  async simulateBuy(params?: Partial<Params>): Promise<{
    simulatedVotesBought: bigint;
    simulatedFundsPaid: bigint;
    simulatedNewVotePrice: bigint;
  }> {
    const { reputationMarket, profileId, isPositive, buyAmount } = getParams(params);
    const [simulatedVotesBought, simulatedFundsPaid, simulatedNewVotePrice] = await reputationMarket
      .connect(this.signer)
      .simulateBuy(profileId, isPositive, buyAmount);

    return { simulatedVotesBought, simulatedFundsPaid, simulatedNewVotePrice };
  }

  async buyVotes(params?: Partial<Params>): Promise<Result> {
    const {
      reputationMarket,
      profileId,
      isPositive,
      buyAmount,
      slippageBasisPoints,
      expectedVotes,
    } = getParams(params);

    let expectedVoteCount = expectedVotes;

    if (!expectedVoteCount) {
      const { simulatedVotesBought } = await this.simulateBuy(params);
      expectedVoteCount = simulatedVotesBought;
    }
    const tx: ContractTransactionResponse = await reputationMarket
      .connect(this.signer)
      .buyVotes(profileId, isPositive, expectedVoteCount, slippageBasisPoints, {
        value: buyAmount,
      });
    const { gas } = await this.getGas(tx);
    const { trustVotes, distrustVotes, balance } = await this.getVotes(params);
    const receipt = await tx.wait();
    const event = receipt?.logs.find(isVotesBoughtEvent(reputationMarket));
    const fundsPaid = event ? event.args.funds : 0n;

    return { gas, trustVotes, distrustVotes, balance, fundsPaid };
  }

  async simulateSell(params?: Partial<Params>): Promise<{
    simulatedVotesSold: bigint;
    simulatedFundsReceived: bigint;
    simulatedNewVotePrice: bigint;
  }> {
    const { reputationMarket, profileId, isPositive, sellVotes } = getParams(params);
    const [simulatedVotesSold, simulatedFundsReceived, simulatedNewVotePrice] =
      await reputationMarket.connect(this.signer).simulateSell(profileId, isPositive, sellVotes);

    return { simulatedVotesSold, simulatedFundsReceived, simulatedNewVotePrice };
  }

  async sellVotes(params?: Partial<Params>): Promise<Result> {
    const { reputationMarket, profileId, isPositive, sellVotes } = getParams(params);
    const tx: ContractTransactionResponse = await reputationMarket
      .connect(this.signer)
      .sellVotes(profileId, isPositive, sellVotes);
    const { gas } = await this.getGas(tx);
    const { trustVotes, distrustVotes, balance } = await this.getVotes(params);
    const receipt = await tx.wait();
    const event = receipt?.logs.find(isVotesSoldEvent(reputationMarket));
    const fundsReceived = event ? event.args.funds : 0n;

    return { gas, trustVotes, distrustVotes, balance, fundsReceived };
  }

  async buyOneVote(params?: Partial<Params>): Promise<Result> {
    const { profileId, reputationMarket, isPositive } = getParams({ ...params });
    const votePrice = await reputationMarket.getVotePrice(profileId, isPositive);

    return await this.buyVotes(getParams({ ...params, buyAmount: votePrice }));
  }

  async sellOneVote(params?: Partial<Params>): Promise<Result> {
    const updatedParams = getParams({ ...params, sellVotes: 1n });

    return await this.sellVotes(updatedParams);
  }
}
