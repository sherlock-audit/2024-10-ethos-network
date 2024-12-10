import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import { type EthosReview } from '../../typechain-types/index.js';
import { common } from '../utils/common.js';
import { DEFAULT, REVIEW_PARAMS } from '../utils/defaults.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

describe('EthosReview Leave Review by Address', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  let ethosReview: EthosReview;
  let nonEthosUser: HardhatEthersSigner;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    userA = await deployer.createUser();
    userB = await deployer.createUser();

    if (!deployer.ethosProfile.contract || !deployer.ethosReview.contract) {
      throw new Error('EthosProfile or EthosReview contract not found');
    }
    ethosReview = deployer.ethosReview.contract;

    nonEthosUser = await deployer.newWallet();
  });

  it('should allow a user to leave a review by address', async () => {
    await userA.review({ address: userB.signer.address });

    // Verify the review was created
    const reviewCount = await ethosReview.reviewCount();
    expect(reviewCount).to.equal(1);

    const review = await ethosReview.reviews(0);
    expect(review.score).to.equal(2);
    expect(review.author).to.equal(userA.signer.address);
    expect(review.subject).to.equal(userB.signer.address);
    expect(review.comment).to.equal(REVIEW_PARAMS.comment);
    expect(review.metadata).to.equal(REVIEW_PARAMS.metadata);
  });

  it('should revert when trying to leave a self-review', async () => {
    await expect(userA.review({ address: userA.signer.address }))
      .to.be.revertedWithCustomError(ethosReview, 'SelfReview')
      .withArgs(userA.signer.address);
  });

  it('should revert when trying to leave a self-review by alternate address', async () => {
    const alternateAddress = await deployer.newWallet();
    const signature = await common.signatureForRegisterAddress(
      alternateAddress.address,
      userA.profileId.toString(),
      '0',
      deployer.EXPECTED_SIGNER,
    );
    await deployer.ethosProfile.contract
      .connect(userA.signer)
      .registerAddress(alternateAddress.address, userA.profileId, 0, signature);
    await expect(userA.review({ address: alternateAddress.address }))
      .to.be.revertedWithCustomError(ethosReview, 'SelfReview')
      .withArgs(alternateAddress.address);
  });

  it('should not allow the recipient of a review to leave a review', async () => {
    // bugfix test: https://trust-ethos.atlassian.net/browse/CORE-1213
    await userB.review({ address: nonEthosUser.address });

    await expect(
      ethosReview
        .connect(nonEthosUser)
        .addReview(
          REVIEW_PARAMS.score,
          userB.signer.address,
          DEFAULT.PAYMENT_TOKEN,
          REVIEW_PARAMS.comment,
          REVIEW_PARAMS.metadata,
          REVIEW_PARAMS.attestationDetails,
        ),
    ).to.be.reverted;
  });

  it('should fail if the author has no profile', async () => {
    await expect(
      ethosReview
        .connect(nonEthosUser)
        .addReview(
          REVIEW_PARAMS.score,
          userA.signer.address,
          DEFAULT.PAYMENT_TOKEN,
          REVIEW_PARAMS.comment,
          REVIEW_PARAMS.metadata,
          REVIEW_PARAMS.attestationDetails,
        ),
    )
      .to.be.revertedWithCustomError(deployer.ethosProfile.contract, 'ProfileNotFoundForAddress')
      .withArgs(nonEthosUser.address);
  });

  it('should properly track review IDs in mappings', async () => {
    // Create first review
    await userA.review({ address: userB.signer.address });

    // Create second review
    await userB.review({ address: userA.signer.address });

    // Check reviewIdsByAuthorAddress
    const userAreviewId = await ethosReview.reviewIdsByAuthorAddress(userA.signer.address, 0n);
    expect(userAreviewId).to.equal(0); // First review ID

    const userBReviewId = await ethosReview.reviewIdsByAuthorAddress(userB.signer.address, 0n);
    expect(userBReviewId).to.equal(1); // Second review ID

    // Check reviewIdsBySubjectAddress
    const reviewForUserA = await ethosReview.reviewIdsBySubjectAddress(userA.signer.address, 0n);
    expect(reviewForUserA).to.equal(1); // Second review ID

    const reviewForUserB = await ethosReview.reviewIdsBySubjectAddress(userB.signer.address, 0n);
    expect(reviewForUserB).to.equal(0); // First review ID
  });

  it('should not store review IDs in attestation mapping for address reviews', async () => {
    await userA.review({ address: userB.signer.address });

    // The hash can be any bytes32 value since we're just verifying it's empty
    const dummyHash = DEFAULT.EMPTY_BYTES;
    await expect(ethosReview.reviewIdsByAttestationHash(dummyHash, 0n)).to.be.reverted;
  });
});
