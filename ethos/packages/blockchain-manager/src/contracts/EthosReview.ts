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
} from '../types';

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
      authorProfileId,
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
      authorProfileId: toNumber(authorProfileId),
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
   * Returns a single review ID by author profile ID and array index, from the reviewIdsByAuthorProfileId mapping.
   * @param authorProfileId The profile ID of the author.
   * @param index The index of the author review IDs
   * @returns An array of review IDs.
   */
  async getReviewIdsByAuthorProfileId(authorProfileId: number, index: number): Promise<number> {
    const reviewId = await this.contract.reviewIdsByAuthorProfileId(
      BigInt(authorProfileId),
      BigInt(index),
    );

    return toNumber(reviewId);
  }

  /**
   * Returns reviews by author within a specified range.
   * @param authorProfileId The profile ID of the author.
   * @param fromIdx The starting index.
   * @param maxLength The maximum number of reviews to return.
   * @returns An array of Review objects.
   */
  async getReviewsByAuthorInRange(
    authorProfileId: number,
    fromIdx: number,
    maxLength: number,
  ): Promise<Review[]> {
    const rawReviews = await this.contract.reviewsByAuthorInRange(
      authorProfileId,
      fromIdx,
      maxLength,
    );

    return rawReviews
      .map((rawReview) => this.formatRawReview(rawReview))
      .filter((review): review is Review => review !== null);
  }

  /**
   * Returns the number of reviews by an author.
   * @param authorProfileId The profile ID of the author.
   * @returns The number of reviews.
   */
  async getNumberOfReviewsByAuthor(authorProfileId: number): Promise<number> {
    const reviewCount = await this.contract.numberOfReviewsBy(0, authorProfileId, zeroAddress);

    return toNumber(reviewCount);
  }

  /**
   * Retrieves all reviews written by a specific author.
   *
   * This method fetches reviews in batches to handle potentially large numbers of reviews without hitting gas limits.
   * It uses the `getReviewsByAuthorInRange` method internally to fetch reviews in chunks.
   *
   * @param authorProfileId - The profile ID of the author whose reviews are to be fetched.
   * @returns A promise that resolves to an array of Review objects representing all reviews by the specified author.
   *
   * @remarks
   * - This method may make multiple blockchain calls depending on the number of reviews.
   * - The reviews are fetched in batches of 100 to optimize performance and avoid potential gas limits.
   * - If the author has no reviews, an empty array will be returned.
   *
   * @example
   * ```typescript
   * const ethosReview = new EthosReview(runner, contractLookup);
   * const authorProfileId = 123;
   * const allReviews = await ethosReview.getAllReviewsByAuthor(authorProfileId);
   * ```
   */
  async getAllReviewsByAuthor(authorProfileId: number): Promise<Review[]> {
    const reviewCount = await this.getNumberOfReviewsByAuthor(authorProfileId);
    const batchSize = 100;
    const allReviews: Review[] = [];

    for (let fromIdx = 0; fromIdx < reviewCount; fromIdx += batchSize) {
      const maxLength = Math.min(batchSize, reviewCount - fromIdx);
      const batchReviews = await this.getReviewsByAuthorInRange(
        authorProfileId,
        fromIdx,
        maxLength,
      );
      allReviews.push(...batchReviews);
    }

    return allReviews;
  }

  /**
   * Returns review IDs by subject address.
   * @param subjectAddress Review subject's address.
   * @returns An array of review IDs.
   */
  async reviewIdsBySubjectAddress(subjectAddress: Address): Promise<number[]> {
    const reviewIds = await this.contract.reviewIdsBySubjectAddress(subjectAddress);

    return reviewIds.map(toNumber);
  }

  /**
   * Returns review IDs by subject attestation hash.
   * @param attestationHash Review subject's attestation hash.
   * @returns An array of review IDs.
   */
  async reviewIdsBySubjectAttestationHash(attestationHash: string): Promise<number[]> {
    const reviewIds = await this.contract.reviewIdsBySubjectAttestationHash(attestationHash);

    return reviewIds.map(toNumber);
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
