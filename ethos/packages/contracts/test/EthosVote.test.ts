import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs.js';
import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { type EthosReview } from '../typechain-types/index.js';
import { smartContractNames } from './utils/mock.names.js';

const { ethers } = hre;

describe('EthosVote', () => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async function deployFixture() {
    const [
      OWNER,
      ADMIN,
      EXPECTED_SIGNER,
      WRONG_ADDRESS_0,
      WRONG_ADDRESS_1,
      OTHER_0,
      OTHER_1,
      REVIEW_CREATOR_0,
      REVIEW_CREATOR_1,
      REVIEW_SUBJECT_0,
      REVIEW_SUBJECT_1,
      VOTER_0,
      VOTER_1,
    ] = await ethers.getSigners();
    const ZERO_ADDRESS = ethers.ZeroAddress;

    // deploy Smart Contracts
    const ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy');

    const contractAddressManager = await ethers.deployContract('ContractAddressManager', []);
    const contractAddressManagerAddress = await contractAddressManager.getAddress();

    const signatureVerifier = await ethers.deployContract('SignatureVerifier', []);
    const signatureVerifierAddress = await signatureVerifier.getAddress();

    const interactionControl = await ethers.deployContract('InteractionControl', [
      OWNER.address,
      contractAddressManagerAddress,
    ]);
    const interactionControlAddress = await interactionControl.getAddress();

    const attestation = await ethers.getContractFactory('EthosAttestation');
    const attestationImplementation = await ethers.deployContract('EthosAttestation', []);
    const ethosAttestationImpAddress = await attestationImplementation.getAddress();

    const ethosAttestationProxy = await ERC1967Proxy.deploy(
      ethosAttestationImpAddress,
      attestation.interface.encodeFunctionData('initialize', [
        OWNER.address,
        ADMIN.address,
        EXPECTED_SIGNER.address,
        signatureVerifierAddress,
        contractAddressManagerAddress,
      ]),
    );
    await ethosAttestationProxy.waitForDeployment();
    const ethosAttestationAddress = await ethosAttestationProxy.getAddress();
    const ethosAttestation = await ethers.getContractAt(
      'EthosAttestation',
      ethosAttestationAddress,
    );

    const profile = await ethers.getContractFactory('EthosProfile');
    const profileImplementation = await ethers.deployContract('EthosProfile', []);
    const profileImpAddress = await profileImplementation.getAddress();

    const ethosProfileProxy = await ERC1967Proxy.deploy(
      profileImpAddress,
      profile.interface.encodeFunctionData('initialize', [
        OWNER.address,
        ADMIN.address,
        EXPECTED_SIGNER.address,
        signatureVerifierAddress,
        contractAddressManagerAddress,
      ]),
    );
    await ethosProfileProxy.waitForDeployment();
    const ethosProfileAddress = await ethosProfileProxy.getAddress();
    const ethosProfile = await ethers.getContractAt('EthosProfile', ethosProfileAddress);

    const review = await ethers.getContractFactory('EthosReview');
    const reviewImplementation = await ethers.deployContract('EthosReview', []);
    const reviewImpAddress = await reviewImplementation.getAddress();

    const ethosReviewProxy = await ERC1967Proxy.deploy(
      reviewImpAddress,
      review.interface.encodeFunctionData('initialize', [
        OWNER.address,
        ADMIN.address,
        EXPECTED_SIGNER.address,
        signatureVerifierAddress,
        contractAddressManagerAddress,
      ]),
    );
    await ethosReviewProxy.waitForDeployment();
    const ethosReviewAddress = await ethosReviewProxy.getAddress();
    const ethosReview = await ethers.getContractAt('EthosReview', ethosReviewAddress);

    const vote = await ethers.getContractFactory('EthosVote');
    const voteImplementation = await ethers.deployContract('EthosVote', []);
    const voteImpAddress = await voteImplementation.getAddress();

    const ethosVoteProxy = await ERC1967Proxy.deploy(
      voteImpAddress,
      vote.interface.encodeFunctionData('initialize', [
        OWNER.address,
        ADMIN.address,
        EXPECTED_SIGNER.address,
        signatureVerifierAddress,
        contractAddressManagerAddress,
      ]),
    );
    await ethosVoteProxy.waitForDeployment();
    const ethosVoteAddress = await ethosVoteProxy.getAddress();
    const ethosVote = await ethers.getContractAt('EthosVote', ethosVoteAddress);

    // update Smart Contracts
    await contractAddressManager.updateContractAddressesForNames(
      [
        ethosAttestationAddress,
        ethosProfileAddress,
        ethosReviewAddress,
        ethosVoteAddress,
        interactionControlAddress,
      ],
      [
        smartContractNames.attestation,
        smartContractNames.profile,
        smartContractNames.review,
        smartContractNames.vote,
        smartContractNames.interactionControl,
      ],
    );

    await interactionControl.addControlledContractNames([
      smartContractNames.attestation,
      smartContractNames.profile,
      smartContractNames.review,
      smartContractNames.vote,
    ]);

    const SERVICE_X = 'x.com';
    const SERVICE_FB = 'fb.com';

    const ACCOUNT_NAME_BEN = 'benwalther256';
    const ACCOUNT_NAME_IVAN = 'ivansolo512';

    const ATTESTATION_EVIDENCE_0 = 'ATTESTATION_EVIDENCE_0';
    const ATTESTATION_EVIDENCE_1 = 'ATTESTATION_EVIDENCE_1';

    const PAYMENT_TOKEN_0 = await ethers.deployContract('PaymentToken', [
      'PAYMENT TOKEN NAME 0',
      'PTN 0',
    ]);

    const PAYMENT_TOKEN_1 = await ethers.deployContract('PaymentToken', [
      'PAYMENT TOKEN NAME 1',
      'PTN 1',
    ]);

    const provider = ethers.provider;

    return {
      OWNER,
      ADMIN,
      EXPECTED_SIGNER,
      WRONG_ADDRESS_0,
      WRONG_ADDRESS_1,
      OTHER_0,
      OTHER_1,
      ZERO_ADDRESS,
      REVIEW_CREATOR_0,
      REVIEW_CREATOR_1,
      REVIEW_SUBJECT_0,
      REVIEW_SUBJECT_1,
      SERVICE_X,
      SERVICE_FB,
      ACCOUNT_NAME_BEN,
      ACCOUNT_NAME_IVAN,
      ATTESTATION_EVIDENCE_0,
      ATTESTATION_EVIDENCE_1,
      PAYMENT_TOKEN_0,
      PAYMENT_TOKEN_1,
      VOTER_0,
      VOTER_1,
      signatureVerifier,
      interactionControl,
      ethosAttestation,
      ethosProfile,
      ethosReview,
      ethosVote,
      contractAddressManager,
      ERC1967Proxy,
      provider,
    };
  }

  async function allowPaymentToken(
    admin: HardhatEthersSigner,
    ethosReview: EthosReview,
    paymentTokenAddress: string,
    isAllowed: boolean,
    priceEth: bigint,
  ): Promise<void> {
    await ethosReview.connect(admin).setReviewPrice(isAllowed, paymentTokenAddress, priceEth);
  }

  async function addReview(
    admin: HardhatEthersSigner,
    reviewCreator: HardhatEthersSigner,
    reviewSubject: HardhatEthersSigner,
    ethosReview: EthosReview,
  ): Promise<void> {
    const Score = {
      Negative: 0,
      Neutral: 1,
      Positive: 2,
    };

    type AttestationDetails = {
      account: string;
      service: string;
    };

    const defaultComment = 'default comment';
    const defaultMetadata = '{ "metadata": "some value for metadata" }';

    const reviewPrice = ethers.parseEther('1.23456789');
    await allowPaymentToken(admin, ethosReview, ethers.ZeroAddress, true, reviewPrice);

    const params = {
      score: Score.Positive,
      subject: reviewSubject.address,
      paymentToken: ethers.ZeroAddress,
      comment: defaultComment,
      metadata: defaultMetadata,
      attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
    };

    await ethosReview
      .connect(reviewCreator)
      .addReview(
        params.score,
        params.subject,
        params.paymentToken,
        params.comment,
        params.metadata,
        params.attestationDetails,
        { value: reviewPrice },
      );
  }

  describe('upgradeable', () => {
    it('should fail if upgraded not by owner', async () => {
      const { ADMIN, ethosVote } = await loadFixture(deployFixture);

      const implementation = await ethers.deployContract('EthosVote', []);
      const implementationAddress = await implementation.getAddress();

      await expect(
        ethosVote.connect(ADMIN).upgradeToAndCall(implementationAddress, '0x'),
      ).to.be.revertedWithCustomError(ethosVote, 'AccessControlUnauthorizedAccount');
    });

    it('should fail if upgraded contract is zero address', async () => {
      const { OWNER, ethosVote } = await loadFixture(deployFixture);

      await expect(
        ethosVote.connect(OWNER).upgradeToAndCall(ethers.ZeroAddress, '0x'),
      ).to.be.revertedWithCustomError(ethosVote, 'ZeroAddress');
    });

    it('should upgrade to new implementation address', async () => {
      const { OWNER, ethosVote, provider } = await loadFixture(deployFixture);
      const proxyAddr = await ethosVote.getAddress();

      const implementation = await ethers.deployContract('EthosVote', []);
      const implementationAddress = await implementation.getAddress();
      await ethosVote.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);
    });

    it('should persist storage after upgrade', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        OTHER_0,
        ADMIN,
        ethosVote,
        ethosReview,
        OWNER,
        ethosProfile,
        provider,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      let IS_UPVOTE = true;
      let TARGET_ID = 0;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);

      // create 4 reviews
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      // 0
      TARGET_ID = 3;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      const proxyAddr = await ethosVote.getAddress();

      const implementation = await ethers.deployContract('EthosVoteMock', []);
      const implementationAddress = await implementation.getAddress();
      await ethosVote.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);

      const proxy = await ethers.getContractAt('EthosVoteMock', proxyAddr);

      const votesCount = await proxy.votesCountFor(TARGET_CONTRACT, TARGET_ID);

      expect(votesCount.upvotes).to.equal(1, 'Wrong isUpvote, 0');
      expect(votesCount.downvotes).to.equal(0, 'Wrong isArchived, 0');
    });

    it('should upgrade and enable new storage', async () => {
      const { OWNER, ethosVote, provider } = await loadFixture(deployFixture);
      const proxyAddr = await ethosVote.getAddress();

      const implementation = await ethers.deployContract('EthosVoteMock', []);
      const implementationAddress = await implementation.getAddress();
      await ethosVote.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);

      const proxy = await ethers.getContractAt('EthosVoteMock', proxyAddr);
      await proxy.setTestValue(22);
      const testValue = await proxy.testValue();
      expect(testValue).to.equal(22);
    });

    it('should revert calling initialize a second time', async () => {
      const {
        OWNER,
        ethosVote,
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        contractAddressManager,
      } = await loadFixture(deployFixture);

      const Vote = await ethers.getContractFactory('EthosVoteMock');
      const implementation = await ethers.deployContract('EthosVoteMock', []);
      const implementationAddress = await implementation.getAddress();
      await expect(
        ethosVote
          .connect(OWNER)
          .upgradeToAndCall(
            implementationAddress,
            Vote.interface.encodeFunctionData('initialize', [
              OWNER.address,
              ADMIN.address,
              EXPECTED_SIGNER.address,
              await signatureVerifier.getAddress(),
              await contractAddressManager.getAddress(),
            ]),
          ),
      ).to.revertedWithCustomError(ethosVote, 'InvalidInitialization');
    });
  });

  describe('constructor', () => {
    it('should set the correct values', async () => {
      const {
        OWNER,
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        ethosVote,
        contractAddressManager,
      } = await loadFixture(deployFixture);

      const OWNER_ROLE = await ethosVote.OWNER_ROLE();
      expect(await ethosVote.getRoleMember(OWNER_ROLE, 0)).to.equal(OWNER.address, 'Wrong owner');

      const ADMIN_ROLE = await ethosVote.ADMIN_ROLE();
      expect(await ethosVote.getRoleMember(ADMIN_ROLE, 0)).to.equal(ADMIN.address, 'Wrong admin');

      expect(await ethosVote.expectedSigner()).to.equal(
        EXPECTED_SIGNER.address,
        'Wrong expectedSigner',
      );

      expect(await ethosVote.signatureVerifier()).to.equal(
        await signatureVerifier.getAddress(),
        'Wrong signatureVerifier',
      );

      expect(await ethosVote.contractAddressManager()).to.equal(
        await contractAddressManager.getAddress(),
        'Wrong contractAddressManager',
      );
    });
  });

  describe('voteFor', () => {
    it('should fail if paused', async () => {
      const { OWNER, VOTER_0, ethosVote, ethosReview, interactionControl } =
        await loadFixture(deployFixture);

      await interactionControl.connect(OWNER).pauseAll();

      const TARGET_CONTRACT = await ethosReview.getAddress();
      const TARGET_ID = 1;
      const IS_UPVOTE = true;

      await expect(
        ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE),
      ).to.be.revertedWithCustomError(ethosVote, 'EnforcedPause');
    });

    it('should fail if user is not ethos profile', async () => {
      const {
        OWNER,
        ADMIN,
        VOTER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        ethosVote,
        ethosReview,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      const TARGET_ID = 0;
      const IS_UPVOTE = true;

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);

      // create a review
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      await expect(ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE))
        .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress')
        .withArgs(VOTER_0.address);
    });

    it('should fail if target does not exist', async () => {
      const {
        VOTER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      // no reviews created yet
      const TARGET_CONTRACT = await ethosReview.getAddress();
      const TARGET_ID = 1;
      const IS_UPVOTE = true;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);

      await expect(ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE))
        .to.be.revertedWithCustomError(ethosVote, 'TargetNotFound')
        .withArgs(TARGET_CONTRACT, TARGET_ID);

      // create a review
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      await expect(ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE))
        .to.be.revertedWithCustomError(ethosVote, 'TargetNotFound')
        .withArgs(TARGET_CONTRACT, TARGET_ID);
    });

    it('should succeed if target is archived', async () => {
      const {
        VOTER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      const TARGET_ID = 0;
      const IS_UPVOTE = true;

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);

      // create a review
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);
      await ethosReview.connect(REVIEW_CREATOR_0).archiveReview(TARGET_ID);

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);

      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      const vote = await ethosVote.votes(1);
      expect(vote.isUpvote).to.be.equal(true);
    });

    it('should update votesCountFor after multiple votes', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        OTHER_0,
        ADMIN,
        ethosVote,
        ethosReview,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      let IS_UPVOTE = true;
      let TARGET_ID = 0;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);

      // create 4 reviews
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      // 0
      TARGET_ID = 3;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      let votesCount = await ethosVote.votesCountFor(TARGET_CONTRACT, TARGET_ID);

      expect(votesCount.upvotes).to.equal(1, 'Wrong isUpvote, 0');
      expect(votesCount.downvotes).to.equal(0, 'Wrong isArchived, 0');

      // 1
      TARGET_ID = 2;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      votesCount = await ethosVote.votesCountFor(TARGET_CONTRACT, TARGET_ID);

      expect(votesCount.upvotes).to.equal(1, 'Wrong isUpvote, 1');
      expect(votesCount.downvotes).to.equal(0, 'Wrong isArchived, 1');

      // 2
      TARGET_ID = 2;
      IS_UPVOTE = false;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      votesCount = await ethosVote.votesCountFor(TARGET_CONTRACT, TARGET_ID);

      expect(votesCount.upvotes).to.equal(1, 'Wrong isUpvote, 2');
      expect(votesCount.downvotes).to.equal(1, 'Wrong isArchived, 2');

      // 3
      TARGET_ID = 3;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      votesCount = await ethosVote.votesCountFor(TARGET_CONTRACT, TARGET_ID);

      expect(votesCount.upvotes).to.equal(2, 'Wrong isUpvote, 3');
      expect(votesCount.downvotes).to.equal(0, 'Wrong isArchived, 3');

      // 4
      TARGET_ID = 3;
      IS_UPVOTE = false;
      await ethosVote.connect(OTHER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      votesCount = await ethosVote.votesCountFor(TARGET_CONTRACT, TARGET_ID);

      expect(votesCount.upvotes).to.equal(2, 'Wrong isUpvote, 4');
      expect(votesCount.downvotes).to.equal(1, 'Wrong isArchived, 4');
    });

    it('should update Vote with correct data', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      let IS_UPVOTE = true;
      let TARGET_ID = 0;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      const voter0Profile = await ethosProfile.verifiedProfileIdForAddress(VOTER_0.address);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      const voter1Profile = await ethosProfile.verifiedProfileIdForAddress(VOTER_1.address);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      // create 4 reviews
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      // 0
      TARGET_ID = 3;
      IS_UPVOTE = true;

      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      let timeVoted = await time.latest();
      let vote = await ethosVote.votes(1);

      expect(vote.isUpvote).to.equal(true, 'Wrong isUpvote, 0');
      expect(vote.voter).to.equal(voter0Profile, 'Wrong voter, 0');
      expect(vote.targetContract).to.equal(TARGET_CONTRACT, 'Wrong targetContract, 0');
      expect(vote.targetId).to.equal(TARGET_ID, 'Wrong targetId, 0');
      expect(vote.createdAt).to.equal(timeVoted, 'Wrong timeVoted, 0');

      // 1
      TARGET_ID = 2;
      IS_UPVOTE = true;

      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      timeVoted = await time.latest();
      vote = await ethosVote.votes(2);

      expect(vote.isUpvote).to.equal(true, 'Wrong isUpvote, 1');
      expect(vote.voter).to.equal(voter1Profile, 'Wrong voter, 1');
      expect(vote.targetContract).to.equal(TARGET_CONTRACT, 'Wrong targetContract, 1');
      expect(vote.targetId).to.equal(TARGET_ID, 'Wrong targetId, 1');
      expect(vote.createdAt).to.equal(timeVoted, 'Wrong timeVoted, 1');

      // 2
      TARGET_ID = 2;
      IS_UPVOTE = false;

      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      timeVoted = await time.latest();
      vote = await ethosVote.votes(3);

      expect(vote.isUpvote).to.equal(false, 'Wrong isUpvote, 2');
      expect(vote.voter).to.equal(voter0Profile, 'Wrong voter, 2');
      expect(vote.targetContract).to.equal(TARGET_CONTRACT, 'Wrong targetContract, 2');
      expect(vote.targetId).to.equal(TARGET_ID, 'Wrong targetId, 2');
      expect(vote.createdAt).to.equal(timeVoted, 'Wrong timeVoted, 2');
    });

    it('should increment voteCount after multiple votings', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      let TARGET_ID = 0;
      const IS_UPVOTE = true;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      // create 4 reviews
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      expect(await ethosVote.voteCount()).to.equal(1, 'Wrong before 0');

      TARGET_ID = 0;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      expect(await ethosVote.voteCount()).to.equal(2, 'Wrong after 0');

      TARGET_ID = 2;
      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      expect(await ethosVote.voteCount()).to.equal(3, 'Wrong after 1');

      TARGET_ID = 2;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      expect(await ethosVote.voteCount()).to.equal(4, 'Wrong after 2');

      TARGET_ID = 3;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      expect(await ethosVote.voteCount()).to.equal(5, 'Wrong after 3');
    });

    it('should emit Voted event with correct params', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      let TARGET_ID = 0;
      let IS_UPVOTE = true;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      const voter0Profile = await ethosProfile.verifiedProfileIdForAddress(VOTER_0.address);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      const voter1Profile = await ethosProfile.verifiedProfileIdForAddress(VOTER_1.address);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      // create 4 reviews
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      // 0
      TARGET_ID = 3;
      IS_UPVOTE = true;

      await expect(ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE))
        .to.emit(ethosVote, 'Voted')
        .withArgs(IS_UPVOTE, voter0Profile, TARGET_CONTRACT, TARGET_ID, 1);

      // 1
      TARGET_ID = 2;
      IS_UPVOTE = true;

      await expect(ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE))
        .to.emit(ethosVote, 'Voted')
        .withArgs(IS_UPVOTE, voter1Profile, TARGET_CONTRACT, TARGET_ID, 2);

      // 2
      TARGET_ID = 2;
      IS_UPVOTE = false;

      await expect(ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE))
        .to.emit(ethosVote, 'Voted')
        .withArgs(IS_UPVOTE, voter0Profile, TARGET_CONTRACT, TARGET_ID, 3);
    });
  });

  describe('changeVote', () => {
    it('should change upvote to downvote', async () => {
      const {
        VOTER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      const TARGET_ID = 0;
      const IS_UPVOTE = true;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);

      // create a review
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      let vote = await ethosVote.votes(1);
      expect(vote.isUpvote).to.be.equal(true);
      const tx = await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, !IS_UPVOTE);
      vote = await ethosVote.votes(1);
      expect(vote.isUpvote).to.be.equal(false);
      const counts = await ethosVote.votesCountFor(TARGET_CONTRACT, TARGET_ID);
      expect(counts[0]).to.be.equal(0);
      expect(counts[1]).to.be.equal(1);
      await expect(tx)
        .to.emit(ethosVote, 'VoteChanged')
        .withArgs(false, false, anyValue, TARGET_CONTRACT, TARGET_ID, 1);
    });

    it('should change downvote to upvote', async () => {
      const {
        VOTER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      const TARGET_ID = 0;
      const IS_UPVOTE = false;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);

      // create a review
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      let vote = await ethosVote.votes(1);
      expect(vote.isUpvote).to.be.equal(false);
      const tx = await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, !IS_UPVOTE);
      vote = await ethosVote.votes(1);
      expect(vote.isUpvote).to.be.equal(true);
      const counts = await ethosVote.votesCountFor(TARGET_CONTRACT, TARGET_ID);
      expect(counts[0]).to.be.equal(1);
      expect(counts[1]).to.be.equal(0);
      await expect(tx)
        .to.emit(ethosVote, 'VoteChanged')
        .withArgs(false, true, anyValue, TARGET_CONTRACT, TARGET_ID, 1);
    });

    it('should change vote within many votes', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      const TARGET_ID = 0;
      const IS_UPVOTE = false;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      // create a review
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      let vote = await ethosVote.votes(1);
      expect(vote.isUpvote).to.be.equal(false);

      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      vote = await ethosVote.votes(2);
      expect(vote.isUpvote).to.be.equal(false);

      await ethosVote.connect(REVIEW_CREATOR_1).voteFor(TARGET_CONTRACT, TARGET_ID, !IS_UPVOTE);
      vote = await ethosVote.votes(3);
      expect(vote.isUpvote).to.be.equal(true);

      const tx = await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, !IS_UPVOTE);
      vote = await ethosVote.votes(2);
      expect(vote.isUpvote).to.be.equal(true);
      const counts = await ethosVote.votesCountFor(TARGET_CONTRACT, TARGET_ID);
      expect(counts[0]).to.be.equal(2);
      expect(counts[1]).to.be.equal(1);
      await expect(tx)
        .to.emit(ethosVote, 'VoteChanged')
        .withArgs(false, true, anyValue, TARGET_CONTRACT, TARGET_ID, 2);
    });

    it('should unvote downvote', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      const TARGET_ID = 0;
      const IS_UPVOTE = false;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      // create a review
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      let vote = await ethosVote.votes(1);
      expect(vote.isUpvote).to.be.equal(false);
      expect(vote.isArchived).to.be.equal(false);

      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      vote = await ethosVote.votes(2);
      expect(vote.isUpvote).to.be.equal(false);
      expect(vote.isArchived).to.be.equal(false);

      await ethosVote.connect(REVIEW_CREATOR_1).voteFor(TARGET_CONTRACT, TARGET_ID, !IS_UPVOTE);
      vote = await ethosVote.votes(3);
      expect(vote.isUpvote).to.be.equal(true);
      expect(vote.isArchived).to.be.equal(false);

      const tx = await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      vote = await ethosVote.votes(2);
      expect(vote.isUpvote).to.be.equal(false);
      expect(vote.isArchived).to.be.equal(true);
      const counts = await ethosVote.votesCountFor(TARGET_CONTRACT, TARGET_ID);
      expect(counts[0]).to.be.equal(1);
      expect(counts[1]).to.be.equal(1);
      await expect(tx)
        .to.emit(ethosVote, 'VoteChanged')
        .withArgs(true, false, anyValue, TARGET_CONTRACT, TARGET_ID, 2);
    });

    it('should unvote upvote', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      const TARGET_ID = 0;
      const IS_UPVOTE = true;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      // create a review
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      let vote = await ethosVote.votes(1);
      expect(vote.isUpvote).to.be.equal(true);
      expect(vote.isArchived).to.be.equal(false);

      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      vote = await ethosVote.votes(2);
      expect(vote.isUpvote).to.be.equal(true);
      expect(vote.isArchived).to.be.equal(false);

      await ethosVote.connect(REVIEW_CREATOR_1).voteFor(TARGET_CONTRACT, TARGET_ID, !IS_UPVOTE);
      vote = await ethosVote.votes(3);
      expect(vote.isUpvote).to.be.equal(false);
      expect(vote.isArchived).to.be.equal(false);

      const tx = await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      vote = await ethosVote.votes(2);
      expect(vote.isUpvote).to.be.equal(true);
      expect(vote.isArchived).to.be.equal(true);
      const counts = await ethosVote.votesCountFor(TARGET_CONTRACT, TARGET_ID);
      expect(counts[0]).to.be.equal(1);
      expect(counts[1]).to.be.equal(1);
      await expect(tx)
        .to.emit(ethosVote, 'VoteChanged')
        .withArgs(true, true, anyValue, TARGET_CONTRACT, TARGET_ID, 2);
    });

    it('should revote as upvote', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      const TARGET_ID = 0;
      const IS_UPVOTE = false;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      // create a review
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      let vote = await ethosVote.votes(1);
      expect(vote.isUpvote).to.be.equal(false);
      expect(vote.isArchived).to.be.equal(false);

      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      vote = await ethosVote.votes(2);
      expect(vote.isUpvote).to.be.equal(false);
      expect(vote.isArchived).to.be.equal(false);

      await ethosVote.connect(REVIEW_CREATOR_1).voteFor(TARGET_CONTRACT, TARGET_ID, !IS_UPVOTE);
      vote = await ethosVote.votes(3);
      expect(vote.isUpvote).to.be.equal(true);
      expect(vote.isArchived).to.be.equal(false);

      // archive
      let tx = await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      vote = await ethosVote.votes(2);
      expect(vote.isUpvote).to.be.equal(false);
      expect(vote.isArchived).to.be.equal(true);
      let counts = await ethosVote.votesCountFor(TARGET_CONTRACT, TARGET_ID);
      expect(counts[0]).to.be.equal(1);
      expect(counts[1]).to.be.equal(1);
      await expect(tx)
        .to.emit(ethosVote, 'VoteChanged')
        .withArgs(true, false, anyValue, TARGET_CONTRACT, TARGET_ID, 2);

      // re-vote
      tx = await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, !IS_UPVOTE);
      vote = await ethosVote.votes(2);
      expect(vote.isUpvote).to.be.equal(true);
      expect(vote.isArchived).to.be.equal(false);
      counts = await ethosVote.votesCountFor(TARGET_CONTRACT, TARGET_ID);
      expect(counts[0]).to.be.equal(2);
      expect(counts[1]).to.be.equal(1);
      await expect(tx)
        .to.emit(ethosVote, 'VoteChanged')
        .withArgs(false, true, anyValue, TARGET_CONTRACT, TARGET_ID, 2);
    });

    it('should revote as downvote', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      const TARGET_ID = 0;
      const IS_UPVOTE = true;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      // create a review
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      let vote = await ethosVote.votes(1);
      expect(vote.isUpvote).to.be.equal(true);
      expect(vote.isArchived).to.be.equal(false);

      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      vote = await ethosVote.votes(2);
      expect(vote.isUpvote).to.be.equal(true);
      expect(vote.isArchived).to.be.equal(false);

      await ethosVote.connect(REVIEW_CREATOR_1).voteFor(TARGET_CONTRACT, TARGET_ID, !IS_UPVOTE);
      vote = await ethosVote.votes(3);
      expect(vote.isUpvote).to.be.equal(false);
      expect(vote.isArchived).to.be.equal(false);

      // archive
      let tx = await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      vote = await ethosVote.votes(2);
      expect(vote.isUpvote).to.be.equal(true);
      expect(vote.isArchived).to.be.equal(true);
      let counts = await ethosVote.votesCountFor(TARGET_CONTRACT, TARGET_ID);
      expect(counts[0]).to.be.equal(1);
      expect(counts[1]).to.be.equal(1);
      await expect(tx)
        .to.emit(ethosVote, 'VoteChanged')
        .withArgs(true, true, anyValue, TARGET_CONTRACT, TARGET_ID, 2);

      // re-vote
      tx = await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, !IS_UPVOTE);
      vote = await ethosVote.votes(2);
      expect(vote.isUpvote).to.be.equal(false);
      expect(vote.isArchived).to.be.equal(false);
      counts = await ethosVote.votesCountFor(TARGET_CONTRACT, TARGET_ID);
      expect(counts[0]).to.be.equal(1);
      expect(counts[1]).to.be.equal(2);
      await expect(tx)
        .to.emit(ethosVote, 'VoteChanged')
        .withArgs(false, false, anyValue, TARGET_CONTRACT, TARGET_ID, 2);
    });

    it('should revote preserving the old value', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      const TARGET_ID = 0;
      const IS_UPVOTE = true;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      // create a review
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      let vote = await ethosVote.votes(1);
      expect(vote.isUpvote).to.be.equal(true);
      expect(vote.isArchived).to.be.equal(false);

      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      vote = await ethosVote.votes(2);
      expect(vote.isUpvote).to.be.equal(true);
      expect(vote.isArchived).to.be.equal(false);

      await ethosVote.connect(REVIEW_CREATOR_1).voteFor(TARGET_CONTRACT, TARGET_ID, !IS_UPVOTE);
      vote = await ethosVote.votes(3);
      expect(vote.isUpvote).to.be.equal(false);
      expect(vote.isArchived).to.be.equal(false);

      // archive
      let tx = await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      vote = await ethosVote.votes(2);
      expect(vote.isUpvote).to.be.equal(true);
      expect(vote.isArchived).to.be.equal(true);
      let counts = await ethosVote.votesCountFor(TARGET_CONTRACT, TARGET_ID);
      expect(counts[0]).to.be.equal(1);
      expect(counts[1]).to.be.equal(1);
      await expect(tx)
        .to.emit(ethosVote, 'VoteChanged')
        .withArgs(true, true, anyValue, TARGET_CONTRACT, TARGET_ID, 2);

      // re-vote
      tx = await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      vote = await ethosVote.votes(2);
      expect(vote.isUpvote).to.be.equal(true);
      expect(vote.isArchived).to.be.equal(false);
      counts = await ethosVote.votesCountFor(TARGET_CONTRACT, TARGET_ID);
      expect(counts[0]).to.be.equal(2);
      expect(counts[1]).to.be.equal(1);
      await expect(tx)
        .to.emit(ethosVote, 'VoteChanged')
        .withArgs(true, true, anyValue, TARGET_CONTRACT, TARGET_ID, 2);
    });
  });

  describe('voteIndexFor', () => {
    it('should return correct voteIndex for sender', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      let TARGET_ID = 0;
      let IS_UPVOTE = true;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      const voter0Profile = await ethosProfile.verifiedProfileIdForAddress(VOTER_0.address);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      const voter1Profile = await ethosProfile.verifiedProfileIdForAddress(VOTER_1.address);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      // create 4 reviews
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      // 0
      TARGET_ID = 3;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      let voteIndex = await ethosVote.voteIndexFor(voter0Profile, TARGET_CONTRACT, TARGET_ID);
      expect(voteIndex).to.equal(1, 'Wrong voteIndex, 0');

      // 1
      TARGET_ID = 2;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      voteIndex = await ethosVote.voteIndexFor(voter1Profile, TARGET_CONTRACT, TARGET_ID);
      expect(voteIndex).to.equal(2, 'Wrong voteIndex, 1');

      // 2
      TARGET_ID = 2;
      IS_UPVOTE = false;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      voteIndex = await ethosVote.voteIndexFor(voter0Profile, TARGET_CONTRACT, TARGET_ID);
      expect(voteIndex).to.equal(3, 'Wrong voteIndex, 2');
    });
  });

  describe('hasVotedFor', () => {
    it('should return correct hasVotedFor for sender', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        OTHER_0,
        ADMIN,
        ethosVote,
        ethosReview,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      let TARGET_ID = 0;
      let IS_UPVOTE = true;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      const voter0Profile = await ethosProfile.verifiedProfileIdForAddress(VOTER_0.address);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      const voter1Profile = await ethosProfile.verifiedProfileIdForAddress(VOTER_1.address);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      const other0Profile = await ethosProfile.verifiedProfileIdForAddress(OTHER_0.address);

      // create 4 reviews
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      // 0
      TARGET_ID = 3;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      expect(await ethosVote.hasVotedFor(voter0Profile, TARGET_CONTRACT, TARGET_ID)).to.equal(
        true,
        'Wrong hasVotedFor for VOTER_0, 0',
      );
      expect(await ethosVote.hasVotedFor(voter1Profile, TARGET_CONTRACT, TARGET_ID)).to.equal(
        false,
        'Wrong hasVotedFor for VOTER_1, 0',
      );
      expect(await ethosVote.hasVotedFor(other0Profile, TARGET_CONTRACT, TARGET_ID)).to.equal(
        false,
        'Wrong hasVotedFor for OTHER_0, 0',
      );

      // 1
      TARGET_ID = 2;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      expect(await ethosVote.hasVotedFor(voter0Profile, TARGET_CONTRACT, TARGET_ID)).to.equal(
        false,
        'Wrong hasVotedFor for VOTER_0, 1',
      );
      expect(await ethosVote.hasVotedFor(voter1Profile, TARGET_CONTRACT, TARGET_ID)).to.equal(
        true,
        'Wrong hasVotedFor for VOTER_1, 1',
      );
      expect(await ethosVote.hasVotedFor(other0Profile, TARGET_CONTRACT, TARGET_ID)).to.equal(
        false,
        'Wrong hasVotedFor for OTHER_0, 1',
      );

      // 2
      TARGET_ID = 2;
      IS_UPVOTE = false;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      expect(await ethosVote.hasVotedFor(voter0Profile, TARGET_CONTRACT, TARGET_ID)).to.equal(
        true,
        'Wrong hasVotedFor for VOTER_0, 2',
      );
      expect(await ethosVote.hasVotedFor(voter1Profile, TARGET_CONTRACT, TARGET_ID)).to.equal(
        true,
        'Wrong hasVotedFor for VOTER_1, 2',
      );
      expect(await ethosVote.hasVotedFor(other0Profile, TARGET_CONTRACT, TARGET_ID)).to.equal(
        false,
        'Wrong hasVotedFor for OTHER_0, 2',
      );

      // 3
      TARGET_ID = 3;
      IS_UPVOTE = false;
      await ethosVote.connect(OTHER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      expect(await ethosVote.hasVotedFor(voter0Profile, TARGET_CONTRACT, TARGET_ID)).to.equal(
        true,
        'Wrong hasVotedFor for VOTER_0, 3',
      );
      expect(await ethosVote.hasVotedFor(voter1Profile, TARGET_CONTRACT, TARGET_ID)).to.equal(
        false,
        'Wrong hasVotedFor for VOTER_1, 3',
      );
      expect(await ethosVote.hasVotedFor(other0Profile, TARGET_CONTRACT, TARGET_ID)).to.equal(
        true,
        'Wrong hasVotedFor for OTHER_0, 3',
      );

      // 4
      TARGET_ID = 3;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      expect(await ethosVote.hasVotedFor(voter0Profile, TARGET_CONTRACT, TARGET_ID)).to.equal(
        true,
        'Wrong hasVotedFor for VOTER_0, 4',
      );
      expect(await ethosVote.hasVotedFor(voter1Profile, TARGET_CONTRACT, TARGET_ID)).to.equal(
        true,
        'Wrong hasVotedFor for VOTER_1, 4',
      );
      expect(await ethosVote.hasVotedFor(other0Profile, TARGET_CONTRACT, TARGET_ID)).to.equal(
        true,
        'Wrong hasVotedFor for OTHER_0, 4',
      );
    });
  });

  describe('votesInRangeFor', () => {
    it('should return empty if no votes', async () => {
      const {
        VOTER_0,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      let TARGET_ID = 0;
      let IS_UPVOTE = true;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      // create 4 reviews
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      // 0
      TARGET_ID = 3;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      TARGET_ID = 34;
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, TARGET_ID, 0, 1)).to.be.deep.equal(
        [],
        'Wrong for 0',
      );
    });

    it('should return empty if maxLength == 0', async () => {
      const {
        VOTER_0,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      // create 4 reviews
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      const TARGET_ID = 3;
      const IS_UPVOTE = true;

      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      // 0
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, 0, 0, 0)).to.be.deep.equal(
        [],
        'Wrong for 0',
      );

      // 1
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, TARGET_ID, 0, 0)).to.be.deep.equal(
        [],
        'Wrong for 1',
      );
    });

    it('should return empty if fromIdx >= votes', async () => {
      const {
        VOTER_0,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      // create 4 reviews
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      const TARGET_ID = 3;
      const IS_UPVOTE = true;

      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      // 0
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, TARGET_ID, 1, 1)).to.be.deep.equal(
        [],
        'Wrong for 0',
      );

      // 1
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, TARGET_ID, 4, 12)).to.be.deep.equal(
        [],
        'Wrong for 1',
      );
    });

    it('should return correct votes if requested length <= available length, fromIdx == 0', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      let TARGET_ID = 0;
      let IS_UPVOTE = true;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      const voter0Profile = await ethosProfile.verifiedProfileIdForAddress(VOTER_0.address);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      const voter1Profile = await ethosProfile.verifiedProfileIdForAddress(VOTER_1.address);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      // create 4 reviews
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      // 0
      TARGET_ID = 3;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      const timeCreated0 = await time.latest();

      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, TARGET_ID, 0, 1)).to.be.deep.equal(
        [[true, false, TARGET_CONTRACT, voter0Profile, 3, timeCreated0]],
        'Wrong for 0',
      );

      // 1
      TARGET_ID = 2;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      const timeCreated1 = await time.latest();

      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, TARGET_ID, 0, 1)).to.be.deep.equal(
        [[true, false, TARGET_CONTRACT, voter1Profile, 2, timeCreated1]],
        'Wrong for 1',
      );

      // 2
      TARGET_ID = 2;
      IS_UPVOTE = false;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      const timeCreated2 = await time.latest();

      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, TARGET_ID, 0, 2)).to.be.deep.equal(
        [
          [true, false, TARGET_CONTRACT, voter1Profile, 2, timeCreated1],
          [false, false, TARGET_CONTRACT, voter0Profile, 2, timeCreated2],
        ],
        'Wrong for 2',
      );
    });

    it('should return correct votes if requested length <= available length, fromIdx == custom number', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      let TARGET_ID = 0;
      let IS_UPVOTE = true;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      const voter0Profile = await ethosProfile.verifiedProfileIdForAddress(VOTER_0.address);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      const voter1Profile = await ethosProfile.verifiedProfileIdForAddress(VOTER_1.address);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      const reviewCreator0Profile = await ethosProfile.verifiedProfileIdForAddress(
        REVIEW_CREATOR_0.address,
      );
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      // create 4 reviews
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      // create votes
      TARGET_ID = 3;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      TARGET_ID = 2;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      const timeCreated1 = await time.latest();

      TARGET_ID = 2;
      IS_UPVOTE = false;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      const timeCreated2 = await time.latest();

      TARGET_ID = 1;
      IS_UPVOTE = false;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      TARGET_ID = 0;
      IS_UPVOTE = false;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);

      TARGET_ID = 2;
      IS_UPVOTE = true;
      await ethosVote.connect(REVIEW_CREATOR_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      const timeCreated5 = await time.latest();

      TARGET_ID = 0;
      IS_UPVOTE = false;
      await ethosVote.connect(REVIEW_CREATOR_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      const timeCreated6 = await time.latest();

      // 0
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, 2, 0, 1)).to.be.deep.equal(
        [[true, false, TARGET_CONTRACT, voter1Profile, 2, timeCreated1]],
        'Wrong for 0',
      );

      // 1
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, 2, 0, 2)).to.be.deep.equal(
        [
          [true, false, TARGET_CONTRACT, voter1Profile, 2, timeCreated1],
          [false, false, TARGET_CONTRACT, voter0Profile, 2, timeCreated2],
        ],
        'Wrong for 1',
      );

      // 2
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, 2, 0, 3)).to.be.deep.equal(
        [
          [true, false, TARGET_CONTRACT, voter1Profile, 2, timeCreated1],
          [false, false, TARGET_CONTRACT, voter0Profile, 2, timeCreated2],
          [true, false, TARGET_CONTRACT, reviewCreator0Profile, 2, timeCreated5],
        ],
        'Wrong for 2',
      );

      // 3
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, 2, 1, 1)).to.be.deep.equal(
        [[false, false, TARGET_CONTRACT, voter0Profile, 2, timeCreated2]],
        'Wrong for 3',
      );

      // 4
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, 2, 1, 2)).to.be.deep.equal(
        [
          [false, false, TARGET_CONTRACT, voter0Profile, 2, timeCreated2],
          [true, false, TARGET_CONTRACT, reviewCreator0Profile, 2, timeCreated5],
        ],
        'Wrong for 4',
      );

      // 5
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, 2, 2, 1)).to.be.deep.equal(
        [[true, false, TARGET_CONTRACT, reviewCreator0Profile, 2, timeCreated5]],
        'Wrong for 5',
      );

      // 6
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, 0, 1, 1)).to.be.deep.equal(
        [[false, false, TARGET_CONTRACT, reviewCreator0Profile, 0, timeCreated6]],
        'Wrong for 6',
      );
    });

    it('should return all votes if requested length > available length, fromIdx starts from 0 and more', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      let TARGET_ID = 0;
      let IS_UPVOTE = true;

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      const voter0Profile = await ethosProfile.verifiedProfileIdForAddress(VOTER_0.address);
      const voter1Profile = await ethosProfile.verifiedProfileIdForAddress(VOTER_1.address);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      const reviewCreator0Profile = await ethosProfile.verifiedProfileIdForAddress(
        REVIEW_CREATOR_0.address,
      );
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      // create 4 reviews
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      // create votes
      TARGET_ID = 3;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      const timeCreated0 = await time.latest();
      await time.increase(1);

      TARGET_ID = 2;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      const timeCreated1 = await time.latest();
      await time.increase(1);

      TARGET_ID = 2;
      IS_UPVOTE = false;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      const timeCreated2 = await time.latest();
      await time.increase(1);

      TARGET_ID = 1;
      IS_UPVOTE = false;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      await time.increase(1);

      TARGET_ID = 0;
      IS_UPVOTE = false;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      const timeCreated4 = await time.latest();
      await time.increase(1);

      TARGET_ID = 2;
      IS_UPVOTE = true;
      await ethosVote.connect(REVIEW_CREATOR_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      const timeCreated5 = await time.latest();
      await time.increase(1);

      TARGET_ID = 0;
      IS_UPVOTE = false;
      await ethosVote.connect(REVIEW_CREATOR_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      const timeCreated6 = await time.latest();
      await time.increase(1);

      // 0
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, 2, 0, 4)).to.be.deep.equal(
        [
          [true, false, TARGET_CONTRACT, voter1Profile, 2, timeCreated1],
          [false, false, TARGET_CONTRACT, voter0Profile, 2, timeCreated2],
          [true, false, TARGET_CONTRACT, reviewCreator0Profile, 2, timeCreated5],
        ],
        'Wrong for 0',
      );

      // 1
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, 2, 1, 14)).to.be.deep.equal(
        [
          [false, false, TARGET_CONTRACT, voter0Profile, 2, timeCreated2],
          [true, false, TARGET_CONTRACT, reviewCreator0Profile, 2, timeCreated5],
        ],
        'Wrong for 1',
      );

      // 2
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, 2, 2, 8)).to.be.deep.equal(
        [[true, false, TARGET_CONTRACT, reviewCreator0Profile, 2, timeCreated5]],
        'Wrong for 2',
      );

      // 3
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, 3, 0, 18)).to.be.deep.equal(
        [[true, false, TARGET_CONTRACT, voter0Profile, 3, timeCreated0]],
        'Wrong for 3',
      );

      // 4
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, 0, 0, 10)).to.be.deep.equal(
        [
          [false, false, TARGET_CONTRACT, voter0Profile, 0, timeCreated4],
          [false, false, TARGET_CONTRACT, reviewCreator0Profile, 0, timeCreated6],
        ],
        'Wrong for 4',
      );

      // 5
      expect(await ethosVote.votesInRangeFor(TARGET_CONTRACT, 0, 1, 110)).to.be.deep.equal(
        [[false, false, TARGET_CONTRACT, reviewCreator0Profile, 0, timeCreated6]],
        'Wrong for 5',
      );
    });

    it('should return correct votes for multiple targets and ids', async () => {
      const {
        VOTER_0,
        VOTER_1,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        ethosVote,
        ethosReview,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(VOTER_0.address);
      await ethosProfile.connect(VOTER_0).createProfile(1);
      const voter0Profile = await ethosProfile.verifiedProfileIdForAddress(VOTER_0.address);
      await ethosProfile.connect(OWNER).inviteAddress(VOTER_1.address);
      await ethosProfile.connect(VOTER_1).createProfile(1);
      const voter1Profile = await ethosProfile.verifiedProfileIdForAddress(VOTER_1.address);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_1.address);
      await ethosProfile.connect(REVIEW_CREATOR_1).createProfile(1);

      const TARGET_CONTRACT = await ethosReview.getAddress();
      let TARGET_ID = 0;
      let IS_UPVOTE = true;

      // create 4 reviews
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_1, REVIEW_SUBJECT_0, ethosReview);
      await addReview(ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosReview);

      // 0
      TARGET_ID = 3;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      let timeCreated = await time.latest();

      let votes = await ethosVote.votesInRangeFor(TARGET_CONTRACT, TARGET_ID, 0, 1);
      expect(votes.length).to.equal(1, 'Wrong votes length, 0');
      expect(votes[0].isUpvote).to.equal(true, 'Wrong isUpvote, 0');
      expect(votes[0].voter).to.equal(voter0Profile, 'Wrong voter, 0');
      expect(votes[0].targetContract).to.equal(TARGET_CONTRACT, 'Wrong targetContract, 0');
      expect(votes[0].targetId).to.equal(3, 'Wrong targetId, 0');
      expect(votes[0].createdAt).to.equal(timeCreated, 'Wrong timeCreated, 0');

      // 1
      TARGET_ID = 2;
      IS_UPVOTE = true;
      await ethosVote.connect(VOTER_1).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      timeCreated = await time.latest();

      votes = await ethosVote.votesInRangeFor(TARGET_CONTRACT, TARGET_ID, 0, 1);
      expect(votes.length).to.equal(1, 'Wrong votes length, 1');
      expect(votes[0].isUpvote).to.equal(true, 'Wrong isUpvote, 1');
      expect(votes[0].voter).to.equal(voter1Profile, 'Wrong voter, 1');
      expect(votes[0].targetContract).to.equal(TARGET_CONTRACT, 'Wrong targetContract, 1');
      expect(votes[0].targetId).to.equal(2, 'Wrong targetId, 1');
      expect(votes[0].createdAt).to.equal(timeCreated, 'Wrong timeCreated, 1');

      // 2
      TARGET_ID = 2;
      IS_UPVOTE = false;
      await ethosVote.connect(VOTER_0).voteFor(TARGET_CONTRACT, TARGET_ID, IS_UPVOTE);
      timeCreated = await time.latest();

      votes = await ethosVote.votesInRangeFor(TARGET_CONTRACT, TARGET_ID, 0, 2);
      expect(votes.length).to.equal(2, 'Wrong votes length, 2');

      expect(votes[0].isUpvote).to.equal(true, 'Wrong isUpvote for [0], 2');
      expect(votes[0].voter).to.equal(voter1Profile, 'Wrong voter for [0] 2');
      expect(votes[0].targetContract).to.equal(TARGET_CONTRACT, 'Wrong targetContract for [0], 2');
      expect(votes[0].targetId).to.equal(2, 'Wrong targetId for [0], 2');

      expect(votes[1].isUpvote).to.equal(false, 'Wrong isUpvote for [1], 3');
      expect(votes[1].voter).to.equal(voter0Profile, 'Wrong voter for [1], 3');
      expect(votes[1].targetContract).to.equal(TARGET_CONTRACT, 'Wrong targetContract for [1], 3');
      expect(votes[1].targetId).to.equal(2, 'Wrong targetId for [1], 3');
      expect(votes[1].createdAt).to.equal(timeCreated, 'Wrong timeCreated for [1], 3');
    });
  });
});
