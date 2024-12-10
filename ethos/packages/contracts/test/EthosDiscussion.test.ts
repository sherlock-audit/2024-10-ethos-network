import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { type EthosReview } from '../typechain-types/index.js';
import { smartContractNames } from './utils/mock.names.js';

const { ethers } = hre;

describe('EthosDiscussion', () => {
  const defaultComment = 'default comment';
  const defaultMetadata = JSON.stringify({ itemKey: 'item value' });

  const defaultReplyContent = 'default reply content';
  const defaultReplyMetadata = 'default reply metadata';
  const editReplyContent = 'edit reply content';
  const editReplyMetadata = 'edit reply metadata';

  const Score = {
    Negative: 0,
    Neutral: 1,
    Positive: 2,
  };

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
      COMMENTER_0,
      COMMENTER_1,
      COMMENTER_2,
      RANDOM_ADDRESS_0,
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

    const discussion = await ethers.getContractFactory('EthosDiscussion');
    const discussionImplementation = await ethers.deployContract('EthosDiscussion', []);
    const discussionImpAddress = await discussionImplementation.getAddress();

    const ethosDiscussionProxy = await ERC1967Proxy.deploy(
      discussionImpAddress,
      discussion.interface.encodeFunctionData('initialize', [
        OWNER.address,
        ADMIN.address,
        EXPECTED_SIGNER.address,
        signatureVerifierAddress,
        contractAddressManagerAddress,
      ]),
    );
    await ethosDiscussionProxy.waitForDeployment();
    const ethosDiscussionAddress = await ethosDiscussionProxy.getAddress();
    const ethosDiscussion = await ethers.getContractAt('EthosDiscussion', ethosDiscussionAddress);

    // update Smart Contracts
    await contractAddressManager.updateContractAddressesForNames(
      [
        ethosAttestationAddress,
        ethosProfileAddress,
        ethosReviewAddress,
        ethosVoteAddress,
        interactionControlAddress,
        ethosDiscussionAddress,
      ],
      [
        smartContractNames.attestation,
        smartContractNames.profile,
        smartContractNames.review,
        smartContractNames.vote,
        smartContractNames.interactionControl,
        smartContractNames.discussion,
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

    // allow payment token for review
    const reviewPrice = ethers.parseEther('1');
    await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

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
      COMMENTER_0,
      COMMENTER_1,
      COMMENTER_2,
      RANDOM_ADDRESS_0,
      signatureVerifier,
      signatureVerifierAddress,
      interactionControl,
      ethosAttestation,
      ethosProfile,
      ethosReview,
      ethosReviewAddress,
      ethosVote,
      contractAddressManager,
      ethosDiscussion,
      ethosDiscussionAddress,
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

  describe('upgradeable', () => {
    it('should fail if upgraded not by owner', async () => {
      const { RANDOM_ADDRESS_0, ethosDiscussion } = await loadFixture(deployFixture);

      const implementation = await ethers.deployContract('EthosDiscussion', []);
      const implementationAddress = await implementation.getAddress();

      await expect(
        ethosDiscussion.connect(RANDOM_ADDRESS_0).upgradeToAndCall(implementationAddress, '0x'),
      ).to.be.revertedWithCustomError(ethosDiscussion, 'AccessControlUnauthorizedAccount');
    });
    it('should fail if upgraded contract is zero address', async () => {
      const { OWNER, ethosDiscussion } = await loadFixture(deployFixture);

      await expect(
        ethosDiscussion.connect(OWNER).upgradeToAndCall(ethers.ZeroAddress, '0x'),
      ).to.be.revertedWithCustomError(ethosDiscussion, 'ZeroAddress');
    });

    it('should upgrade to new implementation address', async () => {
      const { OWNER, ethosDiscussion, provider } = await loadFixture(deployFixture);
      const proxyAddr = await ethosDiscussion.getAddress();

      const implementation = await ethers.deployContract('EthosDiscussion', []);
      const implementationAddress = await implementation.getAddress();
      await ethosDiscussion.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);
    });

    it('should persist storage after upgrade', async () => {
      const {
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        ethosReview,
        ethosDiscussion,
        ethosProfile,
        OWNER,
        provider,
        COMMENTER_0,
        ethosReviewAddress,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);

      const proxyAddr = await ethosDiscussion.getAddress();

      const implementation = await ethers.deployContract('EthosDiscussionMock', []);
      const implementationAddress = await implementation.getAddress();
      await ethosDiscussion.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);

      const proxy = await ethers.getContractAt('EthosDiscussionMock', proxyAddr);
      const count = await proxy.replyCount();
      expect(count).to.be.equal(1);
    });

    it('should upgrade and enable new storage', async () => {
      const { OWNER, ethosDiscussion, provider } = await loadFixture(deployFixture);
      const proxyAddr = await ethosDiscussion.getAddress();

      const implementation = await ethers.deployContract('EthosDiscussionMock', []);
      const implementationAddress = await implementation.getAddress();
      await ethosDiscussion.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);

      const proxy = await ethers.getContractAt('EthosDiscussionMock', proxyAddr);
      await proxy.setTestValue(21);
      const testValue = await proxy.testValue();
      expect(testValue).to.equal(21);
    });

    it('should revert calling initialize a second time', async () => {
      const {
        OWNER,
        ADMIN,
        EXPECTED_SIGNER,
        ethosDiscussion,
        signatureVerifierAddress,
        contractAddressManager,
      } = await loadFixture(deployFixture);

      const discussion = await ethers.getContractFactory('EthosDiscussionMock');
      const implementation = await ethers.deployContract('EthosDiscussionMock', []);
      const implementationAddress = await implementation.getAddress();
      await expect(
        ethosDiscussion
          .connect(OWNER)
          .upgradeToAndCall(
            implementationAddress,
            discussion.interface.encodeFunctionData('initialize', [
              OWNER.address,
              ADMIN.address,
              EXPECTED_SIGNER.address,
              signatureVerifierAddress,
              await contractAddressManager.getAddress(),
            ]),
          ),
      ).to.revertedWithCustomError(ethosDiscussion, 'InvalidInitialization');
    });
  });

  describe('constructor test', () => {
    it('should revert if owner is zeroAddress', async () => {
      const {
        ADMIN,
        EXPECTED_SIGNER,
        ethosDiscussion,
        contractAddressManager,
        signatureVerifierAddress,
        ZERO_ADDRESS,
        ERC1967Proxy,
      } = await loadFixture(deployFixture);

      const discussion = await ethers.getContractFactory('EthosDiscussion');
      const discussionImplementation = await ethers.deployContract('EthosDiscussion', []);
      const discussionImpAddress = await discussionImplementation.getAddress();

      await expect(
        ERC1967Proxy.deploy(
          discussionImpAddress,
          discussion.interface.encodeFunctionData('initialize', [
            ZERO_ADDRESS,
            ADMIN.address,
            EXPECTED_SIGNER.address,
            signatureVerifierAddress,
            await contractAddressManager.getAddress(),
          ]),
        ),
      ).to.be.revertedWithCustomError(ethosDiscussion, 'ZeroAddress');
    });

    it('should revert if admin is zeroAddress', async () => {
      const {
        OWNER,
        EXPECTED_SIGNER,
        ethosDiscussion,
        contractAddressManager,
        signatureVerifierAddress,
        ZERO_ADDRESS,
        ERC1967Proxy,
      } = await loadFixture(deployFixture);

      const discussion = await ethers.getContractFactory('EthosDiscussion');
      const discussionImplementation = await ethers.deployContract('EthosDiscussion', []);
      const discussionImpAddress = await discussionImplementation.getAddress();

      await expect(
        ERC1967Proxy.deploy(
          discussionImpAddress,
          discussion.interface.encodeFunctionData('initialize', [
            OWNER.address,
            ZERO_ADDRESS,
            EXPECTED_SIGNER.address,
            signatureVerifierAddress,
            await contractAddressManager.getAddress(),
          ]),
        ),
      ).to.be.revertedWithCustomError(ethosDiscussion, 'ZeroAddress');
    });

    it('should revert if signer is zeroAddress', async () => {
      const {
        OWNER,
        ADMIN,
        ethosDiscussion,
        contractAddressManager,
        signatureVerifierAddress,
        ZERO_ADDRESS,
        ERC1967Proxy,
      } = await loadFixture(deployFixture);

      const discussion = await ethers.getContractFactory('EthosDiscussion');
      const discussionImplementation = await ethers.deployContract('EthosDiscussion', []);
      const discussionImpAddress = await discussionImplementation.getAddress();

      await expect(
        ERC1967Proxy.deploy(
          discussionImpAddress,
          discussion.interface.encodeFunctionData('initialize', [
            OWNER.address,
            ADMIN.address,
            ZERO_ADDRESS,
            signatureVerifierAddress,
            await contractAddressManager.getAddress(),
          ]),
        ),
      ).to.be.revertedWithCustomError(ethosDiscussion, 'ZeroAddress');
    });

    it('should revert if signature verifier is zeroAddress', async () => {
      const {
        OWNER,
        ADMIN,
        EXPECTED_SIGNER,
        ethosDiscussion,
        contractAddressManager,
        ZERO_ADDRESS,
        ERC1967Proxy,
      } = await loadFixture(deployFixture);

      const discussion = await ethers.getContractFactory('EthosDiscussion');
      const discussionImplementation = await ethers.deployContract('EthosDiscussion', []);
      const discussionImpAddress = await discussionImplementation.getAddress();

      await expect(
        ERC1967Proxy.deploy(
          discussionImpAddress,
          discussion.interface.encodeFunctionData('initialize', [
            OWNER.address,
            ADMIN.address,
            EXPECTED_SIGNER.address,
            ZERO_ADDRESS,
            await contractAddressManager.getAddress(),
          ]),
        ),
      ).to.be.revertedWithCustomError(ethosDiscussion, 'ZeroAddress');
    });
    it('should revert if manager is zeroAddress', async () => {
      const {
        OWNER,
        ADMIN,
        EXPECTED_SIGNER,
        ethosDiscussion,
        signatureVerifierAddress,
        ZERO_ADDRESS,
        ERC1967Proxy,
      } = await loadFixture(deployFixture);

      const discussion = await ethers.getContractFactory('EthosDiscussion');
      const discussionImplementation = await ethers.deployContract('EthosDiscussion', []);
      const discussionImpAddress = await discussionImplementation.getAddress();

      await expect(
        ERC1967Proxy.deploy(
          discussionImpAddress,
          discussion.interface.encodeFunctionData('initialize', [
            OWNER.address,
            ADMIN.address,
            EXPECTED_SIGNER.address,
            signatureVerifierAddress,
            ZERO_ADDRESS,
          ]),
        ),
      ).to.be.revertedWithCustomError(ethosDiscussion, 'ZeroAddress');
    });

    it('should correctly set contractAddressManager', async () => {
      const { ethosDiscussion, contractAddressManager } = await loadFixture(deployFixture);

      const manager = await ethosDiscussion.contractAddressManager();

      expect(manager).to.equal(contractAddressManager);
    });
  });

  describe('addReply', () => {
    it('should revert with TargetNotFound if targetContract == EthosDiscussion & there is no parent with id. User tries to add a reply for non-existing reply', async () => {
      const { COMMENTER_0, ethosDiscussion, ethosDiscussionAddress, ethosProfile, OWNER } =
        await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await expect(
        ethosDiscussion
          .connect(COMMENTER_0)
          .addReply(ethosDiscussionAddress, 0, defaultReplyContent, defaultReplyMetadata),
      )
        .to.be.revertedWithCustomError(ethosDiscussion, 'TargetNotFound')
        .withArgs(ethosDiscussionAddress, 0);

      await expect(
        ethosDiscussion
          .connect(COMMENTER_0)
          .addReply(ethosDiscussionAddress, 1, defaultReplyContent, defaultReplyMetadata),
      )
        .to.be.revertedWithCustomError(ethosDiscussion, 'TargetNotFound')
        .withArgs(ethosDiscussionAddress, 1);
    });

    it('should revert if target is zero address', async () => {
      const { COMMENTER_0, ethosDiscussion, ethosProfile, OWNER } =
        await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await expect(
        ethosDiscussion
          .connect(COMMENTER_0)
          .addReply(ethers.ZeroAddress, 0, defaultReplyContent, defaultReplyMetadata),
      ).to.be.revertedWithCustomError(ethosDiscussion, 'ZeroAddress');
    });

    it('should revert if targetContract does not implement ITargetStatus', async () => {
      const {
        COMMENTER_0,
        ethosDiscussion,
        ethosDiscussionAddress,
        interactionControl,
        PAYMENT_TOKEN_0,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await expect(
        ethosDiscussion
          .connect(COMMENTER_0)
          .addReply(ethosDiscussionAddress, 0, defaultReplyContent, defaultReplyMetadata),
      )
        .to.be.revertedWithCustomError(ethosDiscussion, 'TargetNotFound')
        .withArgs(ethosDiscussionAddress, 0);

      // 1
      const PAYMENT_TOKEN_0_ADDRESS = await PAYMENT_TOKEN_0.getAddress();
      await expect(
        ethosDiscussion
          .connect(COMMENTER_0)
          .addReply(PAYMENT_TOKEN_0_ADDRESS, 0, defaultReplyContent, defaultReplyMetadata),
      ).to.be.revertedWithoutReason();

      // 2
      await expect(
        ethosDiscussion
          .connect(COMMENTER_0)
          .addReply(COMMENTER_0.address, 1, defaultReplyContent, defaultReplyMetadata),
      ).to.be.revertedWithoutReason();

      // 3
      await expect(
        ethosDiscussion
          .connect(COMMENTER_0)
          .addReply(
            await interactionControl.getAddress(),
            1,
            defaultReplyContent,
            defaultReplyMetadata,
          ),
      ).to.be.revertedWithoutReason();
    });

    it('should revert if targetContract implements ITargetStatus, but there is no parent with id', async () => {
      const { COMMENTER_0, ethosDiscussion, ethosReviewAddress, ethosProfile, OWNER } =
        await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await expect(
        ethosDiscussion
          .connect(COMMENTER_0)
          .addReply(ethosReviewAddress, 1, defaultReplyContent, defaultReplyMetadata),
      )
        .to.be.revertedWithCustomError(ethosDiscussion, 'TargetNotFound')
        .withArgs(ethosReviewAddress, 1);
    });

    it('should revert if targetContract implements ITargetStatus, but there is no parent with id is not allowed', async () => {
      const {
        COMMENTER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosDiscussion,
        ethosReview,
        ethosReviewAddress,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // archieve second review made by REVIEW_CREATOR_0
      await ethosReview.connect(REVIEW_CREATOR_0).archiveReview(1);

      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await expect(
        ethosDiscussion
          .connect(COMMENTER_0)
          .addReply(ethosReviewAddress, 3, defaultReplyContent, defaultReplyMetadata),
      )
        .to.be.revertedWithCustomError(ethosDiscussion, 'TargetNotFound')
        .withArgs(ethosReviewAddress, 3);
    });

    it('should emit ReplyAdded event', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // add replies
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await expect(
        ethosDiscussion
          .connect(COMMENTER_0)
          .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata),
      )
        .to.emit(ethosDiscussion, 'ReplyAdded')
        .withArgs(5, ethosReviewAddress, 0);

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_1.address);
      await ethosProfile.connect(COMMENTER_1).createProfile(1);
      await expect(
        ethosDiscussion
          .connect(COMMENTER_1)
          .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata),
      )
        .to.emit(ethosDiscussion, 'ReplyAdded')
        .withArgs(6, ethosReviewAddress, 1);
    });

    it('should increment replyCount', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // add replies
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      expect(await ethosDiscussion.replyCount()).to.equal(1, 'Wrong replyCount for 0');

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_1.address);
      await ethosProfile.connect(COMMENTER_1).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      expect(await ethosDiscussion.replyCount()).to.equal(2, 'Wrong replyCount for 1');
    });

    it('should revert when paused', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosProfile,
        interactionControl,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // add replies
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await expect(
        ethosDiscussion
          .connect(COMMENTER_0)
          .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata),
      )
        .to.emit(ethosDiscussion, 'ReplyAdded')
        .withArgs(5, ethosReviewAddress, 0);

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_1.address);
      await ethosProfile.connect(COMMENTER_1).createProfile(1);

      await interactionControl.connect(OWNER).pauseContract(smartContractNames.discussion);
      await expect(
        ethosDiscussion
          .connect(COMMENTER_1)
          .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata),
      ).to.be.revertedWithCustomError(ethosDiscussion, 'EnforcedPause');
    });
  });

  describe('repliesById', () => {
    it('should fail with NoReplyFound if requested id is absent', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // add replies
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_1.address);
      await ethosProfile.connect(COMMENTER_1).createProfile(1);
      await ethosDiscussion.connect(COMMENTER_1).addReply(
        ethosReviewAddress,

        0,
        defaultReplyContent,
        defaultReplyMetadata,
      );

      // 2
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 1, defaultReplyContent, defaultReplyMetadata);

      // 3
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(ethosReviewAddress, 1, 'some other comment', defaultReplyMetadata);
      // 4
      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      await ethosDiscussion
        .connect(OTHER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);

      // test 0
      await expect(ethosDiscussion.repliesById([6]))
        .to.be.revertedWithCustomError(ethosDiscussion, 'NoReplyFound')
        .withArgs(6);

      // test 1
      await expect(ethosDiscussion.repliesById([2, 6]))
        .to.be.revertedWithCustomError(ethosDiscussion, 'NoReplyFound')
        .withArgs(6);
    });

    it('should return the correct Replies for id', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // add replies
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      const time0 = await time.latest();
      await time.increase(1);

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_1.address);
      await ethosProfile.connect(COMMENTER_1).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      const time1 = await time.latest();
      await time.increase(2);

      // 2
      await ethosDiscussion.connect(COMMENTER_0).addReply(
        ethosReviewAddress,

        1,
        defaultReplyContent,
        defaultReplyMetadata,
      );
      const time2 = await time.latest();
      await time.increase(3);

      // 3
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(ethosReviewAddress, 1, 'some other comment', defaultReplyMetadata);
      const time3 = await time.latest();
      await time.increase(4);

      // 4
      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      await ethosDiscussion
        .connect(OTHER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      const time4 = await time.latest();
      await time.increase(5);

      // test 0
      expect(await ethosDiscussion.repliesById([])).to.deep.equal([], 'Wrong replies for 0');

      // test 1
      expect(await ethosDiscussion.repliesById([0])).to.deep.equal(
        [[true, ethosReviewAddress, 5, 0, 0, time0, 0, defaultReplyContent, defaultReplyMetadata]],
        'Wrong replies for 1',
      );

      // test 2
      expect(await ethosDiscussion.repliesById([0, 1])).to.deep.equal(
        [
          [true, ethosReviewAddress, 5, 0, 0, time0, 0, defaultReplyContent, defaultReplyMetadata],
          [true, ethosReviewAddress, 6, 1, 0, time1, 0, defaultReplyContent, defaultReplyMetadata],
        ],
        'Wrong replies for 2',
      );

      // test 3
      expect(await ethosDiscussion.repliesById([3])).to.deep.equal(
        [[true, ethosReviewAddress, 6, 3, 1, time3, 0, 'some other comment', defaultReplyMetadata]],
        'Wrong replies for 3',
      );

      // test 4
      expect(await ethosDiscussion.repliesById([4, 2, 1])).to.deep.equal(
        [
          [true, ethosReviewAddress, 7, 4, 0, time4, 0, defaultReplyContent, defaultReplyMetadata],
          [true, ethosReviewAddress, 5, 2, 1, time2, 0, defaultReplyContent, defaultReplyMetadata],
          [true, ethosReviewAddress, 6, 1, 0, time1, 0, defaultReplyContent, defaultReplyMetadata],
        ],
        'Wrong replies for 4',
      );
    });
  });

  describe('repliesByAuthorInRange', () => {
    it('should return empty if there are no replies by author', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // add replies
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_1.address);
      await ethosProfile.connect(COMMENTER_1).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);

      // 2
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 1, defaultReplyContent, defaultReplyMetadata);

      // test 0
      expect(await ethosDiscussion.repliesByAuthorInRange(OTHER_0.address, 0, 2)).to.deep.equal(
        [],
        'Wrong replies for 0',
      );

      // test 1
      expect(await ethosDiscussion.repliesByAuthorInRange(OTHER_0.address, 0, 1)).to.deep.equal(
        [],
        'Wrong replies for 1',
      );
    });

    it('should return empty if maxLength == 0', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // add replies
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_1.address);
      await ethosProfile.connect(COMMENTER_1).createProfile(1);
      await ethosDiscussion.connect(COMMENTER_1).addReply(
        ethosReviewAddress,

        0,
        defaultReplyContent,
        defaultReplyMetadata,
      );

      // 2
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 1, defaultReplyContent, defaultReplyMetadata);

      // test 0
      expect(await ethosDiscussion.repliesByAuthorInRange(COMMENTER_0.address, 0, 0)).to.deep.equal(
        [],
        'Wrong replies for 0',
      );
    });

    it('should return empty if fromIdx >= arrayLength', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // add replies
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_1.address);
      await ethosProfile.connect(COMMENTER_1).createProfile(1);
      await ethosDiscussion.connect(COMMENTER_1).addReply(
        ethosReviewAddress,

        0,
        defaultReplyContent,
        defaultReplyMetadata,
      );

      // 2
      await ethosDiscussion.connect(COMMENTER_0).addReply(
        ethosReviewAddress,

        1,
        defaultReplyContent,
        defaultReplyMetadata,
      );

      // test 0
      expect(await ethosDiscussion.repliesByAuthorInRange(COMMENTER_0.address, 2, 1)).to.deep.equal(
        [],
        'Wrong replies for 0',
      );

      // test 1
      expect(await ethosDiscussion.repliesByAuthorInRange(COMMENTER_0.address, 4, 1)).to.deep.equal(
        [],
        'Wrong replies for 1',
      );
    });

    it('should return correct replies', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosDiscussionAddress,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // add replies - three first replies to original comment
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      const time0 = await time.latest();
      await time.increase(1);

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_1.address);
      await ethosProfile.connect(COMMENTER_1).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);

      await time.increase(2);

      // 2
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 1, defaultReplyContent, defaultReplyMetadata);

      const time2 = await time.latest();
      await time.increase(3);

      // add replies to replies
      // 3 - reply to the first reply to original comment
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(
          ethosDiscussionAddress,
          0,
          '3 - reply to the first reply to original comment',
          defaultReplyMetadata,
        );
      const time3 = await time.latest();
      await time.increase(4);

      // 4 - reply to another first reply to original comment
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(
          ethosDiscussionAddress,
          1,
          '4 - reply to another first reply to original comment',
          defaultReplyMetadata,
        );
      const time4 = await time.latest();
      await time.increase(5);

      // 5 - reply to reply
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosDiscussionAddress, 1, '5 - reply to reply', defaultReplyMetadata);
      const time5 = await time.latest();
      await time.increase(6);

      // 6 - reply to reply by COMMENTER_1
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(
          ethosDiscussionAddress,
          2,
          '6 - reply to reply by COMMENTER_1',
          defaultReplyMetadata,
        );
      const time6 = await time.latest();
      await time.increase(7);

      // 6 - reply to reply
      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      await ethosDiscussion
        .connect(OTHER_0)
        .addReply(ethosDiscussionAddress, 1, '6 - reply to reply', defaultReplyMetadata);
      const time7 = await time.latest();
      await time.increase(7);

      // 7 - reply to reply by COMMENTER_1
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(
          ethosDiscussionAddress,
          2,
          '7 - reply to reply by COMMENTER_1',
          defaultReplyMetadata,
        );
      await time.increase(7);

      // test

      // test OTHER_0
      expect(await ethosDiscussion.repliesByAuthorInRange(7, 0, 1)).to.deep.equal(
        [
          [
            false,
            ethosDiscussionAddress,
            7,
            7,
            1,
            time7,
            0,
            '6 - reply to reply',
            defaultReplyMetadata,
          ],
        ],
        'Wrong replies for OTHER_0, 0',
      );

      expect(await ethosDiscussion.repliesByAuthorInRange(7, 0, 12)).to.deep.equal(
        [
          [
            false,
            ethosDiscussionAddress,
            7,
            7,
            1,
            time7,
            0,
            '6 - reply to reply',
            defaultReplyMetadata,
          ],
        ],
        'Wrong replies for OTHER_0, 1',
      );

      // test COMMENTER_0
      expect(await ethosDiscussion.repliesByAuthorInRange(5, 0, 1)).to.deep.equal(
        [[true, ethosReviewAddress, 5, 0, 0, time0, 0, defaultReplyContent, defaultReplyMetadata]],
        'Wrong replies for COMMENTER_0, 0',
      );

      expect(await ethosDiscussion.repliesByAuthorInRange(5, 2, 2)).to.deep.equal(
        [
          [
            false,
            ethosDiscussionAddress,
            5,
            3,
            0,
            time3,
            0,
            '3 - reply to the first reply to original comment',
            defaultReplyMetadata,
          ],
          [
            false,
            ethosDiscussionAddress,
            5,
            4,
            1,
            time4,
            0,
            '4 - reply to another first reply to original comment',
            defaultReplyMetadata,
          ],
        ],
        'Wrong replies for COMMENTER_0, 0',
      );

      expect(await ethosDiscussion.repliesByAuthorInRange(5, 0, 112)).to.deep.equal(
        [
          [true, ethosReviewAddress, 5, 0, 0, time0, 0, defaultReplyContent, defaultReplyMetadata],
          [true, ethosReviewAddress, 5, 2, 1, time2, 0, defaultReplyContent, defaultReplyMetadata],
          [
            false,
            ethosDiscussionAddress,
            5,
            3,
            0,
            time3,
            0,
            '3 - reply to the first reply to original comment',
            defaultReplyMetadata,
          ],
          [
            false,
            ethosDiscussionAddress,
            5,
            4,
            1,
            time4,
            0,
            '4 - reply to another first reply to original comment',
            defaultReplyMetadata,
          ],
          [
            false,
            ethosDiscussionAddress,
            5,
            5,
            1,
            time5,
            0,
            '5 - reply to reply',
            defaultReplyMetadata,
          ],
        ],
        'Wrong replies for COMMENTER_0, 0',
      );

      expect(await ethosDiscussion.repliesByAuthorInRange(5, 3, 12)).to.deep.equal(
        [
          [
            false,
            ethosDiscussionAddress,
            5,
            4,
            1,
            time4,
            0,
            '4 - reply to another first reply to original comment',
            defaultReplyMetadata,
          ],
          [
            false,
            ethosDiscussionAddress,
            5,
            5,
            1,
            time5,
            0,
            '5 - reply to reply',
            defaultReplyMetadata,
          ],
        ],
        'Wrong replies for OTHER_0, 1',
      );

      // test COMMENTER_1
      expect(await ethosDiscussion.repliesByAuthorInRange(6, 1, 1)).to.deep.equal(
        [
          [
            false,
            ethosDiscussionAddress,
            6,
            6,
            2,
            time6,
            0,
            '6 - reply to reply by COMMENTER_1',
            defaultReplyMetadata,
          ],
        ],
        'Wrong replies for COMMENTER_1, 0',
      );
    });
  });

  describe('directRepliesInRange', () => {
    it('should return empty if there are no direct replies', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosDiscussionAddress,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // test before
      expect(await ethosDiscussion.directRepliesInRange(ethosReviewAddress, 2, 0, 1)).to.deep.equal(
        [],
        'Wrong replies before',
      );

      // add replies - three first replies to original comment
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      await time.increase(1);

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_1.address);
      await ethosProfile.connect(COMMENTER_1).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);

      await time.increase(2);

      // 2
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 1, defaultReplyContent, defaultReplyMetadata);
      await time.increase(3);

      // add replies to replies
      // 3 - reply to the first reply to original comment
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(
          ethosDiscussionAddress,
          0,
          '3 - reply to the first reply to original comment',
          defaultReplyMetadata,
        );
      await time.increase(4);

      // 4 - reply to another first reply to original comment
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(
          ethosDiscussionAddress,
          1,
          '4 - reply to another first reply to original comment',
          defaultReplyMetadata,
        );
      await time.increase(5);

      // 5 - reply to reply
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosDiscussionAddress, 1, '5 - reply to reply', defaultReplyMetadata);
      await time.increase(6);

      // 6 - reply to reply by COMMENTER_1
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(
          ethosDiscussionAddress,
          2,
          '6 - reply to reply by COMMENTER_1',
          defaultReplyMetadata,
        );
      await time.increase(7);

      // 6 - reply to reply
      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      await ethosDiscussion
        .connect(OTHER_0)
        .addReply(ethosDiscussionAddress, 1, '6 - reply to reply', defaultReplyMetadata);
      await time.increase(7);

      // 7 - reply to reply by COMMENTER_1
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(
          ethosDiscussionAddress,
          2,
          '7 - reply to reply by COMMENTER_1',
          defaultReplyMetadata,
        );
      await time.increase(7);

      // test after
      expect(await ethosDiscussion.directRepliesInRange(ethosReviewAddress, 2, 0, 1)).to.deep.equal(
        [],
        'Wrong replies after',
      );
    });

    it('should return empty if maxLength == 0', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosDiscussionAddress,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // add replies - three first replies to original comment
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      await time.increase(1);

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_1.address);
      await ethosProfile.connect(COMMENTER_1).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);

      await time.increase(2);

      // 2
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 1, defaultReplyContent, defaultReplyMetadata);
      await time.increase(3);

      // add replies to replies
      // 3 - reply to the first reply to original comment
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(
          ethosDiscussionAddress,
          0,
          '3 - reply to the first reply to original comment',
          defaultReplyMetadata,
        );
      await time.increase(4);

      // 4 - reply to another first reply to original comment
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(
          ethosDiscussionAddress,
          1,
          '4 - reply to another first reply to original comment',
          defaultReplyMetadata,
        );
      await time.increase(5);

      // 5 - reply to reply
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosDiscussionAddress, 1, '5 - reply to reply', defaultReplyMetadata);
      await time.increase(6);

      // 6 - reply to reply by COMMENTER_1
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(
          ethosDiscussionAddress,
          2,
          '6 - reply to reply by COMMENTER_1',
          defaultReplyMetadata,
        );
      await time.increase(7);

      // 6 - reply to reply
      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      await ethosDiscussion
        .connect(OTHER_0)
        .addReply(ethosDiscussionAddress, 1, '6 - reply to reply', defaultReplyMetadata);
      await time.increase(7);

      // 7 - reply to reply by COMMENTER_1
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(
          ethosDiscussionAddress,
          2,
          '7 - reply to reply by COMMENTER_1',
          defaultReplyMetadata,
        );
      await time.increase(7);

      // test 0
      expect(await ethosDiscussion.directRepliesInRange(ethosReviewAddress, 0, 0, 0)).to.deep.equal(
        [],
        'Wrong replies 0',
      );

      // test 1
      expect(await ethosDiscussion.directRepliesInRange(ethosReviewAddress, 1, 0, 0)).to.deep.equal(
        [],
        'Wrong replies 1',
      );
    });

    it('should return empty if fromIdx >= arrayLength', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosDiscussionAddress,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // add replies - three first replies to original comment
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      await time.increase(1);

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_1.address);
      await ethosProfile.connect(COMMENTER_1).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);

      await time.increase(2);

      // 2
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 1, defaultReplyContent, defaultReplyMetadata);
      await time.increase(3);

      // add replies to replies
      // 3 - reply to the first reply to original comment
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(
          ethosDiscussionAddress,
          0,
          '3 - reply to the first reply to original comment',
          defaultReplyMetadata,
        );
      await time.increase(4);

      // 4 - reply to another first reply to original comment
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(
          ethosDiscussionAddress,
          1,
          '4 - reply to another first reply to original comment',
          defaultReplyMetadata,
        );
      await time.increase(5);

      // 5 - reply to reply
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosDiscussionAddress, 1, '5 - reply to reply', defaultReplyMetadata);
      await time.increase(6);

      // 6 - reply to reply by COMMENTER_1
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(
          ethosDiscussionAddress,
          2,
          '6 - reply to reply by COMMENTER_1',
          defaultReplyMetadata,
        );
      await time.increase(7);

      // 6 - reply to reply
      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      await ethosDiscussion
        .connect(OTHER_0)
        .addReply(ethosDiscussionAddress, 1, '6 - reply to reply', defaultReplyMetadata);
      await time.increase(7);

      // 7 - reply to reply by COMMENTER_1
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(
          ethosDiscussionAddress,
          2,
          '7 - reply to reply by COMMENTER_1',
          defaultReplyMetadata,
        );
      await time.increase(7);

      // test 0
      expect(await ethosDiscussion.directRepliesInRange(ethosReviewAddress, 0, 4, 1)).to.deep.equal(
        [],
        'Wrong replies 0',
      );
    });

    it('should return correct direct replies for original comment', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosDiscussionAddress,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // add replies - three first replies to original comment
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      const time0 = await time.latest();
      await time.increase(1);

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_1.address);
      await ethosProfile.connect(COMMENTER_1).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      const time1 = await time.latest();
      await time.increase(2);

      // 2
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 1, defaultReplyContent, defaultReplyMetadata);

      const time2 = await time.latest();
      await time.increase(3);

      // add replies to replies
      // 3 - reply to the first reply to original comment
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(
          ethosDiscussionAddress,
          0,
          '3 - reply to the first reply to original comment',
          defaultReplyMetadata,
        );
      await time.increase(4);

      // 4 - reply to another first reply to original comment
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(
          ethosDiscussionAddress,
          1,
          '4 - reply to another first reply to original comment',
          defaultReplyMetadata,
        );
      await time.increase(5);

      // 5 - reply to reply
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosDiscussionAddress, 1, '5 - reply to reply', defaultReplyMetadata);
      await time.increase(6);

      // 6 - reply to reply by COMMENTER_1
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(
          ethosDiscussionAddress,
          2,
          '6 - reply to reply by COMMENTER_1',
          defaultReplyMetadata,
        );
      await time.increase(7);

      // 6 - reply to reply
      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      await ethosDiscussion
        .connect(OTHER_0)
        .addReply(ethosDiscussionAddress, 1, '6 - reply to reply', defaultReplyMetadata);
      await time.increase(7);

      // 7 - reply to reply by COMMENTER_1
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(
          ethosDiscussionAddress,
          2,
          '7 - reply to reply by COMMENTER_1',
          defaultReplyMetadata,
        );
      await time.increase(7);

      // test 0
      expect(await ethosDiscussion.directRepliesInRange(ethosReviewAddress, 0, 0, 1)).to.deep.equal(
        [[true, ethosReviewAddress, 5, 0, 0, time0, 0, defaultReplyContent, defaultReplyMetadata]],
        'Wrong replies 0',
      );

      // test 1
      expect(await ethosDiscussion.directRepliesInRange(ethosReviewAddress, 0, 0, 3)).to.deep.equal(
        [
          [true, ethosReviewAddress, 5, 0, 0, time0, 0, defaultReplyContent, defaultReplyMetadata],
          [true, ethosReviewAddress, 6, 1, 0, time1, 0, defaultReplyContent, defaultReplyMetadata],
        ],
        'Wrong replies 0',
      );

      // test 2
      expect(
        await ethosDiscussion.directRepliesInRange(ethosReviewAddress, 1, 0, 11),
      ).to.deep.equal(
        [[true, ethosReviewAddress, 5, 2, 1, time2, 0, defaultReplyContent, defaultReplyMetadata]],
        'Wrong replies 1',
      );
    });

    it('should return correct direct replies for reply', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosDiscussionAddress,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // add replies - three first replies to original comment
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      await time.increase(1);

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_1.address);
      await ethosProfile.connect(COMMENTER_1).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      await time.increase(2);

      // 2
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 1, defaultReplyContent, defaultReplyMetadata);
      await time.increase(3);

      // add replies to replies
      // 3 - reply to the first reply to original comment
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(
          ethosDiscussionAddress,
          0,
          '3 - reply to the first reply to original comment',
          defaultReplyMetadata,
        );
      await time.increase(4);

      // 4 - reply to another first reply to original comment
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(
          ethosDiscussionAddress,
          1,
          '4 - reply to another first reply to original comment',
          defaultReplyMetadata,
        );
      await time.increase(5);

      // 5 - reply to reply
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosDiscussionAddress, 1, '5 - reply to reply', defaultReplyMetadata);
      await time.increase(6);

      // 6 - reply to reply by COMMENTER_1
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(
          ethosDiscussionAddress,
          2,
          '6 - reply to reply by COMMENTER_1',
          defaultReplyMetadata,
        );
      const time6 = await time.latest();
      await time.increase(7);

      // 7 - reply to reply
      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      await ethosDiscussion
        .connect(OTHER_0)
        .addReply(ethosDiscussionAddress, 1, '6 - reply to reply', defaultReplyMetadata);
      await time.increase(7);

      // 8 - reply to reply by COMMENTER_1
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(
          ethosDiscussionAddress,
          2,
          '8 - reply to reply by COMMENTER_1',
          defaultReplyMetadata,
        );
      const time8 = await time.latest();
      await time.increase(7);

      // test 0
      expect(
        await ethosDiscussion.directRepliesInRange(ethosDiscussionAddress, 2, 0, 11),
      ).to.deep.equal(
        [
          [
            false,
            ethosDiscussionAddress,
            6,
            6,
            2,
            time6,
            0,
            '6 - reply to reply by COMMENTER_1',
            defaultReplyMetadata,
          ],
          [
            false,
            ethosDiscussionAddress,
            6,
            8,
            2,
            time8,
            0,
            '8 - reply to reply by COMMENTER_1',
            defaultReplyMetadata,
          ],
        ],
        'Wrong replies 0',
      );
    });

    it('should return correct discussion', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosDiscussionAddress,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // add replies - three first replies to original comment
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      await time.increase(1);

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_1.address);
      await ethosProfile.connect(COMMENTER_1).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      await time.increase(2);

      // 2
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 1, defaultReplyContent, defaultReplyMetadata);

      const time2 = await time.latest();
      await time.increase(3);

      // add replies to replies
      // 3 - reply to the first reply to original comment
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(
          ethosDiscussionAddress,
          0,
          '3 - reply to the first reply to original comment',
          defaultReplyMetadata,
        );
      await time.increase(4);

      // 4 - reply to another first reply to original comment
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(
          ethosDiscussionAddress,
          1,
          '4 - reply to another first reply to original comment',
          defaultReplyMetadata,
        );
      await time.increase(5);

      // 5 - reply to reply
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosDiscussionAddress, 1, '5 - reply to reply', defaultReplyMetadata);
      await time.increase(6);

      // 6 - reply to reply by COMMENTER_1
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(
          ethosDiscussionAddress,
          2,
          '6 - reply to reply by COMMENTER_1',
          defaultReplyMetadata,
        );
      const time6 = await time.latest();
      await time.increase(7);

      // 7 - reply to reply
      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      await ethosDiscussion
        .connect(OTHER_0)
        .addReply(ethosDiscussionAddress, 1, '6 - reply to reply', defaultReplyMetadata);
      await time.increase(7);

      // 8 - reply to reply by COMMENTER_1
      await ethosDiscussion
        .connect(OTHER_0)
        .addReply(ethosDiscussionAddress, 2, '8 - reply to reply by OTHER_0', defaultReplyMetadata);
      const time8 = await time.latest();
      await time.increase(7);

      // test reply for original comment
      expect(
        await ethosDiscussion.directRepliesInRange(ethosReviewAddress, 1, 0, 11),
      ).to.deep.equal(
        [[true, ethosReviewAddress, 5, 2, 1, time2, 0, defaultReplyContent, defaultReplyMetadata]],
        'Wrong reply for original comment',
      );

      // test reply for the first reply
      expect(
        await ethosDiscussion.directRepliesInRange(ethosDiscussionAddress, 2, 0, 11),
      ).to.deep.equal(
        [
          [
            false,
            ethosDiscussionAddress,
            6,
            6,
            2,
            time6,
            0,
            '6 - reply to reply by COMMENTER_1',
            defaultReplyMetadata,
          ],
          [
            false,
            ethosDiscussionAddress,
            7,
            8,
            2,
            time8,
            0,
            '8 - reply to reply by OTHER_0',
            defaultReplyMetadata,
          ],
        ],
        'Wrong reply for the first reply',
      );
    });
  });

  describe('editReply', () => {
    it('should revert if sender not a profile', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,

        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,

        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      const t = await time.latest();
      await time.increase(1);

      // test reply for original comment
      expect(await ethosDiscussion.repliesById([0])).to.deep.equal(
        [[true, ethosReviewAddress, 4, 0, 0, t, 0, defaultReplyContent, defaultReplyMetadata]],
        'Wrong reply for original comment',
      );

      await expect(
        ethosDiscussion.connect(COMMENTER_1).editReply(0, editReplyContent, editReplyMetadata),
      )
        .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress')
        .withArgs(COMMENTER_1.address);
      // test reply for the first reply
    });

    it('should revert if reply does not exist', async () => {
      const {
        COMMENTER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,

        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,

        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      const t = await time.latest();
      await time.increase(1);

      // test reply for original comment
      expect(await ethosDiscussion.repliesById([0])).to.deep.equal(
        [[true, ethosReviewAddress, 4, 0, 0, t, 0, defaultReplyContent, defaultReplyMetadata]],
        'Wrong reply for original comment',
      );

      await expect(
        ethosDiscussion.connect(COMMENTER_0).editReply(1, editReplyContent, editReplyMetadata),
      )
        .to.be.revertedWithCustomError(ethosDiscussion, 'NoReplyFound')
        .withArgs(1);
      // test reply for the first reply
    });

    it('should revert if not author', async () => {
      const {
        COMMENTER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      const t = await time.latest();
      await time.increase(1);

      // test reply for original comment
      expect(await ethosDiscussion.repliesById([0])).to.deep.equal(
        [[true, ethosReviewAddress, 4, 0, 0, t, 0, defaultReplyContent, defaultReplyMetadata]],
        'Wrong reply for original comment',
      );

      await expect(
        ethosDiscussion.connect(REVIEW_CREATOR_0).editReply(0, editReplyContent, editReplyMetadata),
      ).to.be.revertedWithCustomError(ethosDiscussion, 'OnlyAuthorCanEdit');

      // test reply for the first reply
    });

    it('should correctly edit reply', async () => {
      const {
        COMMENTER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      const t = await time.latest();
      await time.increase(1);

      // test reply for original comment
      expect(await ethosDiscussion.repliesById([0])).to.deep.equal(
        [[true, ethosReviewAddress, 4, 0, 0, t, 0, defaultReplyContent, defaultReplyMetadata]],
        'Wrong reply for original comment',
      );

      await ethosDiscussion.connect(COMMENTER_0).editReply(0, editReplyContent, editReplyMetadata);
      // const t2 = await time.latest();
      // test reply for original comment
      expect(await ethosDiscussion.repliesById([0])).to.deep.equal(
        [[true, ethosReviewAddress, 4, 0, 0, t, 1, editReplyContent, editReplyMetadata]],
        'Wrong reply for edited comment',
      );
    });

    it('target exists for id', async () => {
      const {
        COMMENTER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      const falseResponse = await ethosDiscussion.targetExistsAndAllowedForId(0);

      expect(falseResponse.exist).to.be.equal(false);
      expect(falseResponse.allowed).to.be.equal(false);

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);

      const trueResponse = await ethosDiscussion.targetExistsAndAllowedForId(0);

      expect(trueResponse.exist).to.be.equal(true);
      expect(trueResponse.allowed).to.be.equal(true);
    });

    it('should revert when paused', async () => {
      const {
        COMMENTER_0,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosProfile,
        interactionControl,
        OWNER,
      } = await loadFixture(deployFixture);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      const falseResponse = await ethosDiscussion.targetExistsAndAllowedForId(0);

      expect(falseResponse.exist).to.be.equal(false);
      expect(falseResponse.allowed).to.be.equal(false);

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);

      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      await interactionControl.connect(OWNER).pauseContract(smartContractNames.discussion);

      await expect(
        ethosDiscussion.connect(COMMENTER_0).editReply(0, editReplyContent, editReplyMetadata),
      ).to.be.revertedWithCustomError(ethosDiscussion, 'EnforcedPause');
    });
  });

  describe('directReplyCount', () => {
    it('should enlarge replies array by target', async () => {
      const {
        COMMENTER_0,
        COMMENTER_1,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ethosReview,
        ethosReviewAddress,
        ethosDiscussion,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      // add reviews
      // 0
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosProfile.connect(OWNER).inviteAddress(REVIEW_CREATOR_0.address);
      await ethosProfile.connect(REVIEW_CREATOR_0).createProfile(1);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // 1
      params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' },
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // add replies for target index 0
      // 0
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_0.address);
      await ethosProfile.connect(COMMENTER_0).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      expect(await ethosDiscussion.replyCount()).to.equal(
        1,
        'Wrong replyCount for first reply on index 0',
      );
      expect(await ethosDiscussion.directReplyCount(ethosReviewAddress, 0)).to.equal(
        1,
        'Wrong directReplyCount for first reply on index 0',
      );

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(COMMENTER_1.address);
      await ethosProfile.connect(COMMENTER_1).createProfile(1);
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      expect(await ethosDiscussion.replyCount()).to.equal(
        2,
        'Wrong replyCount for second reply on index 0',
      );
      expect(await ethosDiscussion.directReplyCount(ethosReviewAddress, 0)).to.equal(
        2,
        'Wrong directReplyCount for second reply on index 0',
      );

      // 2
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(ethosReviewAddress, 0, defaultReplyContent, defaultReplyMetadata);
      expect(await ethosDiscussion.replyCount()).to.equal(
        3,
        'Wrong replyCount for third reply on index 0',
      );
      expect(await ethosDiscussion.directReplyCount(ethosReviewAddress, 0)).to.equal(
        3,
        'Wrong directReplyCount for third reply on index 0',
      );

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: ethers.parseEther('1') },
        );

      // add replies for target index 1
      // 0
      await ethosDiscussion
        .connect(COMMENTER_0)
        .addReply(ethosReviewAddress, 1, defaultReplyContent, defaultReplyMetadata);
      expect(await ethosDiscussion.replyCount()).to.equal(
        4,
        'Wrong replyCount for first reply on index 1',
      );
      expect(await ethosDiscussion.directReplyCount(ethosReviewAddress, 1)).to.equal(
        1,
        'Wrong directReplyCount for first reply on index 1',
      );

      // 1
      await ethosDiscussion
        .connect(COMMENTER_1)
        .addReply(ethosReviewAddress, 1, defaultReplyContent, defaultReplyMetadata);
      expect(await ethosDiscussion.replyCount()).to.equal(
        5,
        'Wrong replyCount for second reply on index 1',
      );
      expect(await ethosDiscussion.directReplyCount(ethosReviewAddress, 1)).to.equal(
        2,
        'Wrong directReplyCount for second reply on index 1',
      );
    });
  });
});
