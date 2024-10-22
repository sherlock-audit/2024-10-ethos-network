import { type ContractLookup, TypeChain, type TargetContract } from '@ethos/contracts';
import { type ContractRunner, type ContractTransactionResponse } from 'ethers';
import { type Address } from 'viem';

export class EthosVote {
  public readonly address: Address;
  public readonly contractRunner: ContractRunner;
  public readonly contract: TypeChain.VoteAbi;
  private readonly contractLookup: ContractLookup;

  constructor(runner: ContractRunner, contractLookup: ContractLookup) {
    this.address = contractLookup.vote.address;
    this.contractRunner = runner;
    this.contract = TypeChain.VoteAbi__factory.connect(this.address, runner);
    this.contractLookup = contractLookup;
  }

  /**
   * Votes for a target contract with a target id.
   */
  async voteFor(
    targetContract: TargetContract,
    targetId: number,
    isUpvote: boolean,
  ): Promise<ContractTransactionResponse> {
    return await this.contract.voteFor(
      this.contractLookup[targetContract].address,
      targetId,
      isUpvote,
    );
  }

  /**
   * Gets vote by id.
   */
  async getVoteById(id: number): ReturnType<TypeChain.VoteAbi['votes']> {
    return await this.contract.votes(id);
  }

  /**
   * Gets the total number of votes.
   */
  async getVoteCount(): Promise<bigint> {
    return await this.contract.voteCount();
  }

  /**
   * Return the vote id for a specific voter, target contract, and target id.
   * Target is typically the review contract and review id, or vouch contract and vouch id, etc.
   */
  async getVoteIndexFor(
    voter: number,
    targetContract: TargetContract,
    targetId: number,
  ): Promise<bigint> {
    return await this.contract.voteIndexFor(
      voter,
      this.contractLookup[targetContract].address,
      targetId,
    );
  }

  /**
   * Checks if a voter has voted for a target contract and target id.
   */
  async hasVotedFor(
    voter: number,
    targetContract: TargetContract,
    targetId: number,
  ): Promise<boolean> {
    return await this.contract.hasVotedFor(
      voter,
      this.contractLookup[targetContract].address,
      targetId,
    );
  }

  /**
   * Gets the vote counts (upvotes and downvotes) for a target contract and target id.
   */
  async getVotesCountFor(
    targetContract: TargetContract,
    targetId: number,
  ): Promise<[bigint, bigint]> {
    return await this.contract.votesCountFor(this.contractLookup[targetContract].address, targetId);
  }

  /**
   * Gets votes in range for a target contract and target id.
   */
  async getVotesInRangeFor(
    targetContract: TargetContract,
    targetId: number,
    fromIdx: number,
    maxLength: number,
  ): ReturnType<TypeChain.VoteAbi['votesInRangeFor']> {
    return await this.contract.votesInRangeFor(
      this.contractLookup[targetContract].address,
      targetId,
      fromIdx,
      maxLength,
    );
  }
}
