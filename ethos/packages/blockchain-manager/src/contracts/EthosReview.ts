import { type ContractLookup, TypeChain } from '@ethos/contracts';
import { isValidAddress } from '@ethos/helpers';
import { toNumber, type ContractRunner, type ContractTransactionResponse } from 'ethers';
import { type Address, isAddress, zeroAddress } from 'viem';
import {
  Score,
  ScoreByValue,
  type Review,
  type ScoreType,
  type ReviewTarget,
  getScoreValue,
} from '../types.js';

type ReviewRaw = Awaited<ReturnType<TypeChain.ReviewAbi['reviews']>>;

export class EthosReview {
  public readonly address: Address;
  public readonly contractRunner: ContractRunner;
  public readonly contract: TypeChain.ReviewAbi;

  constructor(runner: ContractRunner, contractLookup: ContractLookup) {
    this.address = contractLookup.review.address;
    this.contractRunner = runner;
    this.contract = TypeChain.ReviewAbi__factory.connect(this.address, runner);
  }

  /**
   * Adds a review.
   * @returns Transaction response.
   */
  async addReview(
    scoreType: ScoreType,
    subject: ReviewTarget,
    comment: string,
    metadata: string,
  ): Promise<ContractTransactionResponse> {
    const score = Score[scoreType];

    const address = 'address' in subject ? subject.address : zeroAddress;
    const attestation = 'service' in subject ? subject : { service: '', account: '' };
    const paymentToken = zeroAddress;

    return await this.contract.addReview(
      score,
      address,
      paymentToken,
      comment,
      metadata,
      attestation,
    );
  }

  /**
   * Edits an existing review. May only be called by the original author of the review.
   */
  async editReview(
    id: number,
    comment: string,
    metadata: string,
  ): Promise<ContractTransactionResponse> {
    return await this.contract.editReview(id, comment, metadata);
  }

  /**
   * Archives a review.
   * @returns Transaction response.
   */
  async archiveReview(id: number): Promise<ContractTransactionResponse> {
    return await this.contract.archiveReview(id);
  }

  /**
   * Restores an archived review.
   * @param id The ID of the review to restore.
   * @returns Transaction response.
   */
  async restoreReview(id: number): Promise<ContractTransactionResponse> {
    return await this.contract.restoreReview(id);
  }

  /**
   * Get review details.
   */
  async getReview(id: number): Promise<Review | null> {
    const rawReview = await this.contract.reviews(id);

    return this.formatRawReview(rawReview);
  }

  private formatRawReview(rawReview: ReviewRaw): Review | null {
    const {
      archived,
      score,
      author,
      subject,
      reviewId,
      createdAt,
      comment,
      metadata,
      attestationDetails: { account, service },
    } = rawReview;

    if (!isValidAddress(author)) {
      return null;
    }

    return {
      // TODO: figure out how to get review id when we request reviews by subject/author
      id: toNumber(reviewId),
      archived: Boolean(archived),
      score: ScoreByValue[getScoreValue(toNumber(score))],
      author: isAddress(author) ? author : zeroAddress,
      subject: isAddress(subject) ? subject : zeroAddress,
      createdAt: toNumber(createdAt),
      comment,
      metadata,
      attestationDetails: {
        account: account.toLowerCase(),
        service: service.toLowerCase(),
      },
    };
  }

  /**
   * Returns the number of reviews. Also, it's the same as the most recent review id.
   */
  async reviewCount(): Promise<number> {
    const reviewCount = await this.contract.reviewCount();

    return toNumber(reviewCount);
  }

  /**
   * Sets review price for a specific payment token.
   * @param allowed Whether the token is allowed.
   * @param paymentToken Payment token address.
   * @param price Review price.
   * @returns Transaction response.
   */
  async setReviewPrice(
    allowed: boolean,
    paymentToken: Address,
    price: bigint,
  ): Promise<ContractTransactionResponse> {
    return await this.contract.setReviewPrice(allowed, paymentToken, price);
  }

  /**
   * Withdraws funds from the contract.
   * @param paymentToken Payment token address.
   * @returns Transaction response.
   */
  async withdrawFunds(paymentToken: Address): Promise<ContractTransactionResponse> {
    return await this.contract.withdrawFunds(paymentToken);
  }
}
