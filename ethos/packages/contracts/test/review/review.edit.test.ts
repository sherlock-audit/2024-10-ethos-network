import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import { type EthosReview } from '../../typechain-types/index.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

const newComment = 'Updated comment';
const newMetadata = JSON.stringify({ updatedKey: 'updated value' });

describe('EthosReview Edit Review', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  let ethosReview: EthosReview;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    userA = await deployer.createUser();
    userB = await deployer.createUser();

    if (!deployer.ethosProfile.contract || !deployer.ethosReview.contract) {
      throw new Error('EthosProfile or EthosReview contract not found');
    }
    ethosReview = deployer.ethosReview.contract;
  });

  it('should allow a user to edit their own review', async () => {
    await userA.review({ address: userB.signer.address });
    const reviewId = (await ethosReview.reviewCount()) - 1n;

    await userA.editReview(reviewId, newComment, newMetadata);
    const updatedReview = await ethosReview.reviews(reviewId);
    expect(updatedReview.comment).to.equal(newComment);
    expect(updatedReview.metadata).to.equal(newMetadata);
  });

  it('should emit ReviewEdited event when a review is edited', async () => {
    await userA.review({ address: userB.signer.address });

    const reviewCount = await ethosReview.reviewCount();
    const reviewId = reviewCount - 1n;

    await expect(userA.editReview(reviewId, newComment, newMetadata))
      .to.emit(ethosReview, 'ReviewEdited')
      .withArgs(reviewId, userA.signer.address, userB.signer.address);
  });

  it("should not allow a user to edit someone else's review", async () => {
    await userA.review({ address: userB.signer.address });
    const reviewId = (await ethosReview.reviewCount()) - 1n;

    await expect(userB.editReview(reviewId, newComment, newMetadata))
      .to.be.revertedWithCustomError(ethosReview, 'UnauthorizedEdit')
      .withArgs(reviewId);
  });

  it('should not change the score or subject when editing a review', async () => {
    await userA.review({ address: userB.signer.address });
    const reviewId = (await ethosReview.reviewCount()) - 1n;

    const originalReview = await ethosReview.reviews(reviewId);

    await userA.editReview(reviewId, newComment, newMetadata);

    const updatedReview = await ethosReview.reviews(reviewId);
    expect(updatedReview.score).to.equal(originalReview.score);
    expect(updatedReview.subject).to.equal(originalReview.subject);
  });

  it('should not allow editing a review that is archived', async () => {
    await userA.review({ address: userB.signer.address });
    const reviewId = (await ethosReview.reviewCount()) - 1n;

    await ethosReview.connect(userA.signer).archiveReview(reviewId);

    await expect(userA.editReview(reviewId, newComment, newMetadata))
      .to.be.revertedWithCustomError(ethosReview, 'ReviewIsArchived')
      .withArgs(reviewId);
  });
});
