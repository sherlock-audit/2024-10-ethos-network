import { type ContractLookup, TypeChain, type TargetContract } from '@ethos/contracts';
import { type ContractRunner } from 'ethers';
import { type Address } from 'viem';

export class EthosDiscussion {
  public readonly address: Address;
  public readonly contractRunner: ContractRunner;
  public readonly contract: TypeChain.DiscussionAbi;
  private readonly contractLookup: ContractLookup;

  constructor(runner: ContractRunner, contractLookup: ContractLookup) {
    this.address = contractLookup.discussion.address;
    this.contractRunner = runner;
    this.contract = TypeChain.DiscussionAbi__factory.connect(this.address, runner);
    this.contractLookup = contractLookup;
  }

  /**
   * Adds a reply to a target contract with a target id.
   */
  async addReply(
    targetContract: TargetContract,
    targetId: number,
    content: string,
  ): ReturnType<TypeChain.DiscussionAbi['addReply']> {
    return await this.contract.addReply(
      this.contractLookup[targetContract].address,
      targetId,
      content,
      '',
    );
  }

  /**
   * Gets replies by ID.
   */
  async repliesById(replyIds: bigint[]): ReturnType<TypeChain.DiscussionAbi['repliesById']> {
    return await this.contract.repliesById(replyIds);
  }

  /**
   * Edits an existing reply.
   */
  async editReply(
    replyId: number,
    content: string,
    metadata: string,
  ): ReturnType<TypeChain.DiscussionAbi['editReply']> {
    return await this.contract.editReply(replyId, content, metadata);
  }

  /**
   * Gets replies by author within a specified range.
   */
  async repliesByAuthorInRange(
    author: number,
    fromIdx: number,
    maxLength: number,
  ): ReturnType<TypeChain.DiscussionAbi['repliesByAuthorInRange']> {
    return await this.contract.repliesByAuthorInRange(author, fromIdx, maxLength);
  }

  /**
   * Gets direct replies for a target within a specified range.
   */
  async directRepliesInRange(
    targetContract: Address,
    parentId: number,
    fromIdx: number,
    maxLength: number,
  ): ReturnType<TypeChain.DiscussionAbi['directRepliesInRange']> {
    return await this.contract.directRepliesInRange(targetContract, parentId, fromIdx, maxLength);
  }

  /**
   * Gets the number of direct replies for a given target.
   */
  async directReplyCount(
    targetContract: Address,
    targetId: number,
  ): ReturnType<TypeChain.DiscussionAbi['directReplyCount']> {
    return await this.contract.directReplyCount(targetContract, targetId);
  }

  /**
   * Gets the total number of replies.
   */
  async getReplyCount(): Promise<bigint> {
    return await this.contract.replyCount();
  }
}
