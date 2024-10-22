import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { type ContractTransactionResponse, type Log, type EventLog } from 'ethers';
import { ethers } from 'hardhat';
import { type ReputationMarket } from '../../typechain-types';

export const DEFAULT = {
  reputationMarket: undefined as unknown as ReputationMarket,
  profileId: 1,
  initialLiquidity: ethers.parseEther('1.0'),
  maximumPrice: ethers.parseEther('0.001'),
  value: { value: ethers.parseEther('0.001') },
  isPositive: true,
  votes: 10n,
};

type Params = {
  reputationMarket: ReputationMarket;
  profileId: number;
  isPositive: boolean;
  amount: bigint;
  votes: bigint;
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
    amount: params?.amount ?? DEFAULT.maximumPrice,
    votes: params?.votes ?? DEFAULT.votes,
  };
}

export async function getExpectedVotePrice(params?: Partial<Params>): Promise<bigint> {
  const { reputationMarket, profileId, isPositive } = getParams(params);
  const market = await reputationMarket.getMarket(profileId);
  const totalVotes = market.trustVotes + market.distrustVotes;

  return (
    ((isPositive ? market.trustVotes : market.distrustVotes) * DEFAULT.maximumPrice) / totalVotes
  );
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
    const { reputationMarket, profileId, isPositive, amount, votes } = getParams(params);
    const [simulatedVotesBought, simulatedFundsPaid, simulatedNewVotePrice] = await reputationMarket
      .connect(this.signer)
      .simulateBuy(profileId, isPositive, votes, amount);

    return { simulatedVotesBought, simulatedFundsPaid, simulatedNewVotePrice };
  }

  async buyVotes(params?: Partial<Params>): Promise<Result> {
    const { reputationMarket, profileId, isPositive, amount, votes } = getParams(params);
    const tx: ContractTransactionResponse = await reputationMarket
      .connect(this.signer)
      .buyVotes(profileId, isPositive, votes, { value: amount });
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
    const { reputationMarket, profileId, isPositive, votes } = getParams(params);
    const [simulatedVotesSold, simulatedFundsReceived, simulatedNewVotePrice] =
      await reputationMarket.connect(this.signer).simulateSell(profileId, isPositive, votes);

    return { simulatedVotesSold, simulatedFundsReceived, simulatedNewVotePrice };
  }

  async sellVotes(params?: Partial<Params>): Promise<Result> {
    const { reputationMarket, profileId, isPositive, votes } = getParams(params);
    const tx: ContractTransactionResponse = await reputationMarket
      .connect(this.signer)
      .sellVotes(profileId, isPositive, votes);
    const { gas } = await this.getGas(tx);
    const { trustVotes, distrustVotes, balance } = await this.getVotes(params);
    const receipt = await tx.wait();
    const event = receipt?.logs.find(isVotesSoldEvent(reputationMarket));
    const fundsReceived = event ? event.args.funds : 0n;

    return { gas, trustVotes, distrustVotes, balance, fundsReceived };
  }

  async buyOneVote(params?: Partial<Params>): Promise<Result> {
    const updatedParams = {
      ...params,
      votes: 1n,
      amount: DEFAULT.maximumPrice,
    };

    return await this.buyVotes(updatedParams);
  }

  async sellOneVote(params?: Partial<Params>): Promise<Result> {
    const updatedParams = {
      ...params,
      votes: 1n,
    };

    return await this.sellVotes(updatedParams);
  }
}
