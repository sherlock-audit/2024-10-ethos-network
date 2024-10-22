import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { type EthosReview } from '../../typechain-types';
import { DEFAULT, REVIEW_PARAMS } from '../utils/defaults';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { type EthosUser } from '../utils/ethosUser';

describe('EthosReview View Functions', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  let userC: EthosUser;
  let ethosReview: EthosReview;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    userA = await deployer.createUser();
    userB = await deployer.createUser();
    userC = await deployer.createUser();

    if (!deployer.ethosProfile.contract || !deployer.ethosReview.contract) {
      throw new Error('EthosProfile or EthosReview contract not found');
    }
    ethosReview = deployer.ethosReview.contract;

    // Create some reviews
    await userA.review({ address: userB.signer.address });
    await userA.review({ address: userC.signer.address });
    await userB.review({ address: userC.signer.address });
  });

  async function hash(attestationDetails: { service: string; account: string }): Promise<string> {
    return await deployer.ethosAttestation.contract.getServiceAndAccountHash(
      attestationDetails.service,
      attestationDetails.account,
    );
  }

  describe('reviewsByAuthorInRange', () => {
    it('should return correct reviews for an author', async () => {
      const reviews = await ethosReview.reviewsByAuthorInRange(userA.profileId, 0, 10);

      expect(reviews.length).to.equal(2);
      expect(reviews[0].author).to.equal(userA.signer.address);
      expect(reviews[1].author).to.equal(userA.signer.address);
    });

    it('should respect fromIdx and maxLength parameters', async () => {
      const reviews = await ethosReview.reviewsByAuthorInRange(userA.profileId, 1, 1);

      expect(reviews.length).to.equal(1);
      expect(reviews[0].author).to.equal(userA.signer.address);
      expect(reviews[0].subject).to.equal(userC.signer.address);
    });
  });

  describe('reviewsBySubjectInRange', () => {
    it('should return correct reviews for a subject', async () => {
      const reviews = await ethosReview.reviewsBySubjectInRange(userC.profileId, 0, 10);

      expect(reviews.length).to.equal(2);
      expect(reviews[0].subject).to.equal(userC.signer.address);
      expect(reviews[1].subject).to.equal(userC.signer.address);
    });
  });

  describe('numberOfReviewsBy', () => {
    it('should return correct number of reviews by author', async () => {
      const count = await ethosReview.numberOfReviewsBy(
        0,
        userA.profileId,
        DEFAULT.ATTESTATION_HASH,
      );

      expect(count).to.equal(2);
    });

    it('should return correct number of reviews by subject', async () => {
      const count = await ethosReview.numberOfReviewsBy(
        1,
        userC.profileId,
        DEFAULT.ATTESTATION_HASH,
      );

      expect(count).to.equal(2);
    });
  });

  describe('reviewIdsBySubjectAddress', () => {
    it('should return correct review IDs for a subject address', async () => {
      const reviewIds = await ethosReview.reviewIdsBySubjectAddress(userC.signer.address);

      expect(reviewIds.length).to.equal(2);
      expect(reviewIds[0]).to.equal(1);
      expect(reviewIds[1]).to.equal(2);
    });
  });

  describe('reviewsByAttestationHashInRange', () => {
    it('should return all reviews if requested length > available length, fromIdx starts from 0 and more, multiple attestationHashes', async () => {
      // Create multiple reviews with different attestation hashes
      const attestationDetails1 = {
        service: DEFAULT.SERVICE_X,
        account: DEFAULT.ACCOUNT_NAME_NASA,
      };
      const attestationDetails2 = {
        service: DEFAULT.SERVICE_FB,
        account: DEFAULT.ACCOUNT_NAME_EXAMPLE,
      };
      const attestationHash1 = await hash(attestationDetails1);
      const attestationHash2 = await hash(attestationDetails2);

      await userA.review({ ...REVIEW_PARAMS, attestationDetails: attestationDetails1 });
      await userB.review({ ...REVIEW_PARAMS, attestationDetails: attestationDetails1 });
      await userC.review({ ...REVIEW_PARAMS, attestationDetails: attestationDetails2 });

      // Test with fromIdx = 0 and maxLength > available reviews
      const reviews1 = await ethosReview.reviewsByAttestationHashInRange(attestationHash1, 0, 10);
      expect(reviews1.length).to.equal(2);
      expect(reviews1[0].attestationDetails.service).to.equal(attestationDetails1.service);
      expect(reviews1[0].attestationDetails.account).to.equal(attestationDetails1.account);
      expect(reviews1[1].attestationDetails.service).to.equal(attestationDetails1.service);
      expect(reviews1[1].attestationDetails.account).to.equal(attestationDetails1.account);

      // Test with fromIdx > 0
      const reviews2 = await ethosReview.reviewsByAttestationHashInRange(attestationHash1, 1, 10);
      expect(reviews2.length).to.equal(1);
      expect(reviews2[0].attestationDetails.service).to.equal(attestationDetails1.service);
      expect(reviews2[0].attestationDetails.account).to.equal(attestationDetails1.account);

      // Test with different attestation hash
      const reviews3 = await ethosReview.reviewsByAttestationHashInRange(attestationHash2, 0, 10);
      expect(reviews3.length).to.equal(1);
      expect(reviews3[0].attestationDetails.service).to.equal(attestationDetails2.service);
      expect(reviews3[0].attestationDetails.account).to.equal(attestationDetails2.account);
    });

    it('should return correct reviews if requested length <= available length, fromIdx == custom number, multiple attestationHashes', async () => {
      // Create multiple reviews with different attestation hashes
      const attestationDetails1 = {
        service: DEFAULT.SERVICE_X,
        account: DEFAULT.ACCOUNT_NAME_NASA,
      };
      const attestationDetails2 = {
        service: DEFAULT.SERVICE_FB,
        account: DEFAULT.ACCOUNT_NAME_EXAMPLE,
      };
      const attestationHash1 = await hash(attestationDetails1);

      // 5 reviews for attestation1
      await userA.review({ ...REVIEW_PARAMS, attestationDetails: attestationDetails1 });
      await userB.review({ ...REVIEW_PARAMS, attestationDetails: attestationDetails1 });
      await userC.review({ ...REVIEW_PARAMS, attestationDetails: attestationDetails1 });
      await userA.review({ ...REVIEW_PARAMS, attestationDetails: attestationDetails1 });
      await userB.review({ ...REVIEW_PARAMS, attestationDetails: attestationDetails1 });
      // 2 reviews for attestation2
      await userB.review({ ...REVIEW_PARAMS, attestationDetails: attestationDetails2 });
      await userC.review({ ...REVIEW_PARAMS, attestationDetails: attestationDetails2 });

      // Test with fromIdx = 2 and maxLength = 2 for attestation1
      const reviews = await ethosReview.reviewsByAttestationHashInRange(attestationHash1, 2, 2);
      expect(reviews.length).to.equal(2);

      // Check the content of the reviews
      for (let i = 0; i < reviews.length; i++) {
        expect(reviews[i].attestationDetails.service).to.equal(attestationDetails1.service);
        expect(reviews[i].attestationDetails.account).to.equal(attestationDetails1.account);
      }

      // Test with fromIdx = 0 and maxLength = 3
      const moreReviews = await ethosReview.reviewsByAttestationHashInRange(attestationHash1, 0, 3);
      expect(moreReviews.length).to.equal(3);

      // Test with fromIdx = 4 and maxLength = 2 (should return only one review)
      const lastReview = await ethosReview.reviewsByAttestationHashInRange(attestationHash1, 4, 2);
      expect(lastReview.length).to.equal(1);
    });
  });
});
