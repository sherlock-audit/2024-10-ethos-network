import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { zeroAddress } from 'viem';
import { smartContractNames } from '../src';
import { type EthosReview } from '../typechain-types';
import { common } from './utils/common';
import { inviteAndCreateProfile } from './utils/profileCreation';

describe('EthosReview', () => {
  const Score = {
    Negative: 0,
    Neutral: 1,
    Positive: 2,
  };

  const ReviewsBy = {
    Author: 0,
    Subject: 1,
    AttestationHash: 2,
  };

  type AttestationDetails = {
    account: string;
    service: string;
  };
  const defaultComment = 'default comment';
  const defaultMetadata = JSON.stringify({ itemKey: 'item value' });

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

    // update Smart Contracts
    await contractAddressManager.updateContractAddressesForNames(
      [ethosAttestationAddress, ethosProfileAddress, ethosReviewAddress, interactionControlAddress],
      [
        smartContractNames.attestation,
        smartContractNames.profile,
        smartContractNames.review,
        smartContractNames.interactionControl,
      ],
    );

    await interactionControl.addControlledContractNames([
      smartContractNames.attestation,
      smartContractNames.profile,
      smartContractNames.review,
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
      signatureVerifier,
      interactionControl,
      ethosAttestation,
      ethosProfile,
      ethosReview,
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

  describe('upgradeable', () => {
    it('should fail if upgraded not by owner', async () => {
      const { ADMIN, ethosReview } = await loadFixture(deployFixture);

      const implementation = await ethers.deployContract('EthosReview', []);
      const implementationAddress = await implementation.getAddress();

      await expect(
        ethosReview.connect(ADMIN).upgradeToAndCall(implementationAddress, '0x'),
      ).to.be.revertedWithCustomError(ethosReview, 'AccessControlUnauthorizedAccount');
    });

    it('should fail if upgraded contract is zero address', async () => {
      const { OWNER, ethosReview } = await loadFixture(deployFixture);

      await expect(
        ethosReview.connect(OWNER).upgradeToAndCall(ethers.ZeroAddress, '0x'),
      ).to.be.revertedWithCustomError(ethosReview, 'ZeroAddress');
    });

    it('should upgrade to new implementation address', async () => {
      const { OWNER, ethosReview, provider } = await loadFixture(deployFixture);
      const proxyAddr = await ethosReview.getAddress();

      const implementation = await ethers.deployContract('EthosReview', []);
      const implementationAddress = await implementation.getAddress();
      await ethosReview.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);
    });

    it('should persist storage after upgrade', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        PAYMENT_TOKEN_0,
        OWNER,
        ethosProfile,
        provider,
      } = await loadFixture(deployFixture);

      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_0.address, ethers.parseEther('10'));
      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_1.address, ethers.parseEther('10'));

      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_0).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );
      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_1).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );

      const PAYMENT_TOKEN_0_ADDRESS = await PAYMENT_TOKEN_0.getAddress();

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, PAYMENT_TOKEN_0_ADDRESS, true, reviewPrice);

      // 0
      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      const proxyAddr = await ethosReview.getAddress();

      const implementation = await ethers.deployContract('EthosReviewMock', []);
      const implementationAddress = await implementation.getAddress();
      await ethosReview.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);

      const proxy = await ethers.getContractAt('EthosReviewMock', proxyAddr);
      const count = await proxy.reviewCount();
      expect(count).to.be.equal(1);
    });

    it('should upgrade and enable new storage', async () => {
      const { OWNER, ethosReview, provider } = await loadFixture(deployFixture);
      const proxyAddr = await ethosReview.getAddress();

      const implementation = await ethers.deployContract('EthosReviewMock', []);
      const implementationAddress = await implementation.getAddress();
      await ethosReview.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);

      const proxy = await ethers.getContractAt('EthosReviewMock', proxyAddr);
      await proxy.setTestValue(22);
      const testValue = await proxy.testValue();
      expect(testValue).to.equal(22);
    });

    it('should revert calling initialize a second time', async () => {
      const {
        OWNER,
        ethosReview,
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        contractAddressManager,
      } = await loadFixture(deployFixture);

      const review = await ethers.getContractFactory('EthosReviewMock');
      const implementation = await ethers.deployContract('EthosReviewMock', []);
      const implementationAddress = await implementation.getAddress();
      await expect(
        ethosReview
          .connect(OWNER)
          .upgradeToAndCall(
            implementationAddress,
            review.interface.encodeFunctionData('initialize', [
              OWNER.address,
              ADMIN.address,
              EXPECTED_SIGNER.address,
              await signatureVerifier.getAddress(),
              await contractAddressManager.getAddress(),
            ]),
          ),
      ).to.revertedWithCustomError(ethosReview, 'InvalidInitialization');
    });
  });

  describe('constructor', () => {
    it('should set correct params', async () => {
      const {
        OWNER,
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        ethosAttestation,
        ethosReview,
        contractAddressManager,
      } = await loadFixture(deployFixture);

      const OWNER_ROLE = await ethosAttestation.OWNER_ROLE();
      expect(await ethosReview.getRoleMember(OWNER_ROLE, 0)).to.equal(OWNER.address, 'Wrong owner');

      const ADMIN_ROLE = await ethosReview.ADMIN_ROLE();
      expect(await ethosReview.getRoleMember(ADMIN_ROLE, 0)).to.equal(ADMIN.address, 'Wrong admin');

      expect(await ethosReview.expectedSigner()).to.equal(
        EXPECTED_SIGNER.address,
        'Wrong expectedSigner',
      );

      expect(await ethosReview.signatureVerifier()).to.equal(
        await signatureVerifier.getAddress(),
        'Wrong signatureVerifier',
      );

      expect(await ethosReview.contractAddressManager()).to.equal(
        await contractAddressManager.getAddress(),
        'Wrong contractAddressManager',
      );
    });
  });

  describe('addReview', () => {
    it('should succeed on the base case with no preconfiguration', async () => {
      const { ethosReview, ethosProfile, REVIEW_CREATOR_0, OWNER } =
        await loadFixture(deployFixture);
      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            0,
            '0xD6d547791DF4c5f319F498dc2d706630aBE3e36f',
            '0x0000000000000000000000000000000000000000',
            'this is a comment',
            'this is metadata',
            { account: '', service: '' } satisfies AttestationDetails,
          ),
      ).to.not.be.reverted;
    });

    it('should fail if paused', async () => {
      const { ethosReview, interactionControl, OWNER, REVIEW_CREATOR_0, REVIEW_SUBJECT_0 } =
        await loadFixture(deployFixture);

      await interactionControl.connect(OWNER).pauseAll();

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
          ),
      ).to.be.revertedWithCustomError(ethosReview, 'EnforcedPause');
    });

    it('should fail if wrong score', async () => {
      const { ethosReview, REVIEW_CREATOR_0, REVIEW_SUBJECT_0 } = await loadFixture(deployFixture);

      const params = {
        score: 3,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
          ),
      ).to.be.revertedWithoutReason();

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            4,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
          ),
      ).to.be.revertedWithoutReason();
    });

    it('should fail if WrongPaymentToken, native coin is not supported as a payment', async () => {
      const { ethosReview, ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosProfile, OWNER } =
        await loadFixture(deployFixture);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      // disable native coin payment option
      await allowPaymentToken(
        ADMIN,
        ethosReview,
        ethers.ZeroAddress,
        false,
        ethers.parseEther('0'),
      );
      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
          ),
      )
        .to.be.revertedWithCustomError(ethosReview, 'WrongPaymentToken')
        .withArgs(ethers.ZeroAddress);
    });

    it('should fail if WrongPaymentToken, not supported ERC20 token sent as a payment', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        PAYMENT_TOKEN_0,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      const PAYMENT_TOKEN_0_ADDRESS = await PAYMENT_TOKEN_0.getAddress();

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
          ),
      )
        .to.be.revertedWithCustomError(ethosReview, 'WrongPaymentToken')
        .withArgs(PAYMENT_TOKEN_0_ADDRESS);
    });

    it('should not update contract balance if price == 0, for native coin', async () => {
      const { ethosReview, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ethosProfile, OWNER } =
        await loadFixture(deployFixture);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      const balanceBefore = await ethers.provider.getBalance(await ethosReview.getAddress());

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      const balanceAfter = await ethers.provider.getBalance(await ethosReview.getAddress());

      expect(balanceAfter).to.equal(balanceBefore, 'balance must be 0');
    });

    it('should not update contract balance if price == 0, for ERC20 token', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        ADMIN,
        PAYMENT_TOKEN_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const PAYMENT_TOKEN_0_ADDRESS = await PAYMENT_TOKEN_0.getAddress();

      await allowPaymentToken(
        ADMIN,
        ethosReview,
        PAYMENT_TOKEN_0_ADDRESS,
        true,
        ethers.parseEther('0'),
      );

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      const balanceBefore = await PAYMENT_TOKEN_0.balanceOf(await ethosReview.getAddress());

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      const balanceAfter = await PAYMENT_TOKEN_0.balanceOf(await ethosReview.getAddress());

      expect(balanceAfter).to.equal(balanceBefore, 'balance must be 0');
    });

    it('should fail if WrongPaymentAmount, nothing sent as value for native coin', async () => {
      const { ethosReview, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ADMIN, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      const paymentAmount = ethers.parseEther('1');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, paymentAmount);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      // move funds out
      const balanceOut =
        (await ethers.provider.getBalance(REVIEW_CREATOR_0.address)) - paymentAmount / BigInt('2');
      await REVIEW_CREATOR_0.sendTransaction({
        to: ADMIN.address,
        value: balanceOut,
      });

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
          ),
      )
        .to.be.revertedWithCustomError(ethosReview, 'WrongPaymentAmount')
        .withArgs(ethers.ZeroAddress, 0);
    });

    it('should transfer payment to the contract, for native coin', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ADMIN,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      // 0
      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      let balanceBefore = await ethers.provider.getBalance(await ethosReview.getAddress());

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      let balanceAfter = await ethers.provider.getBalance(await ethosReview.getAddress());

      expect(balanceAfter)
        .to.equal(balanceBefore + reviewPrice, 'wrong balance for 0')
        .to.equal(ethers.parseEther('1.23456789'), 'wrong balance for 0');

      // 1
      const params1 = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      balanceBefore = await ethers.provider.getBalance(await ethosReview.getAddress());

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);

      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params1.score,
          params1.subject,
          params1.paymentToken,
          params1.comment,
          params1.metadata,
          params1.attestationDetails,
          { value: reviewPrice },
        );

      balanceAfter = await ethers.provider.getBalance(await ethosReview.getAddress());

      expect(balanceAfter)
        .to.equal(balanceBefore + reviewPrice, 'wrong balance for 1')
        .to.equal(ethers.parseEther('2.46913578'), 'wrong balance for 1');
    });

    it('should fail if WrongPaymentAmount if ERC20 token should be payed, but native coin amount was also sent', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        ADMIN,
        PAYMENT_TOKEN_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_0.address, ethers.parseEther('10'));
      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_0).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );

      const PAYMENT_TOKEN_0_ADDRESS = await PAYMENT_TOKEN_0.getAddress();

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, PAYMENT_TOKEN_0_ADDRESS, true, reviewPrice);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
            { value: reviewPrice },
          ),
      )
        .to.be.revertedWithCustomError(ethosReview, 'WrongPaymentAmount')
        .withArgs(ethers.ZeroAddress, reviewPrice);
    });

    it('should fail if not enough allowance, for ERC20 token', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        ADMIN,
        PAYMENT_TOKEN_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_0.address, ethers.parseEther('10'));

      const PAYMENT_TOKEN_0_ADDRESS = await PAYMENT_TOKEN_0.getAddress();

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, PAYMENT_TOKEN_0_ADDRESS, true, reviewPrice);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
          ),
      )
        .to.be.revertedWithCustomError(PAYMENT_TOKEN_0, 'ERC20InsufficientAllowance')
        .withArgs(await ethosReview.getAddress(), 0, reviewPrice);
    });

    it('should fail if not enough balance, for ERC20 token', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        ADMIN,
        PAYMENT_TOKEN_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_0.address, ethers.parseEther('1'));
      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_0).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );

      const PAYMENT_TOKEN_0_ADDRESS = await PAYMENT_TOKEN_0.getAddress();

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, PAYMENT_TOKEN_0_ADDRESS, true, reviewPrice);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
          ),
      )
        .to.be.revertedWithCustomError(PAYMENT_TOKEN_0, 'ERC20InsufficientBalance')
        .withArgs(REVIEW_CREATOR_0.address, ethers.parseEther('1'), reviewPrice);
    });

    it('should transfer payment to the contract, for ERC20 token', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ADMIN,
        PAYMENT_TOKEN_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_0.address, ethers.parseEther('10'));
      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_1.address, ethers.parseEther('10'));

      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_0).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );
      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_1).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );

      const PAYMENT_TOKEN_0_ADDRESS = await PAYMENT_TOKEN_0.getAddress();

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, PAYMENT_TOKEN_0_ADDRESS, true, reviewPrice);

      // 0
      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      let balanceBefore = await PAYMENT_TOKEN_0.balanceOf(await ethosReview.getAddress());

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      let balanceAfter = await PAYMENT_TOKEN_0.balanceOf(await ethosReview.getAddress());

      expect(balanceAfter)
        .to.equal(balanceBefore + reviewPrice, 'wrong balance for 0')
        .to.equal(ethers.parseEther('1.23456789'), 'wrong balance for 0');

      // 1
      const params1 = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      balanceBefore = await PAYMENT_TOKEN_0.balanceOf(await ethosReview.getAddress());

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);

      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params1.score,
          params1.subject,
          params1.paymentToken,
          params1.comment,
          params1.metadata,
          params1.attestationDetails,
        );

      balanceAfter = await PAYMENT_TOKEN_0.balanceOf(await ethosReview.getAddress());

      expect(balanceAfter)
        .to.equal(balanceBefore + reviewPrice, 'wrong balance for 1')
        .to.equal(ethers.parseEther('2.46913578'), 'wrong balance for 1');
    });

    it('should fail if payment amount is greater than required', async () => {
      const { ethosReview, REVIEW_SUBJECT_0, REVIEW_CREATOR_0, ADMIN, ethosProfile, OWNER } =
        await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, zeroAddress, true, reviewPrice);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: zeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      const excessPayment = ethers.parseEther('2.0');
      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
            { value: excessPayment },
          ),
      )
        .to.be.revertedWithCustomError(ethosReview, 'WrongPaymentAmount')
        .withArgs(zeroAddress, excessPayment);
    });

    it('should fail if payment amount is less than required', async () => {
      const { ethosReview, REVIEW_SUBJECT_0, REVIEW_CREATOR_0, ADMIN, ethosProfile, OWNER } =
        await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, zeroAddress, true, reviewPrice);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: zeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      const insufficientPayment = ethers.parseEther('.2');
      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
            { value: insufficientPayment },
          ),
      )
        .to.be.revertedWithCustomError(ethosReview, 'WrongPaymentAmount')
        .withArgs(zeroAddress, insufficientPayment);
    });

    it('should fail if InvalidReviewDetails, both subject & attestationDetails are empty, nothing is set', async () => {
      const { ethosReview, REVIEW_CREATOR_0, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      const params = {
        score: Score.Positive,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
          ),
      )
        .to.be.revertedWithCustomError(ethosReview, 'InvalidReviewDetails')
        .withArgs('None set');
    });

    it('should fail if InvalidReviewDetails, both subject & attestationDetails are empty, account only is set', async () => {
      const { ethosReview, REVIEW_CREATOR_0, ACCOUNT_NAME_BEN, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      const params = {
        score: Score.Positive,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: ACCOUNT_NAME_BEN, service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
          ),
      )
        .to.be.revertedWithCustomError(ethosReview, 'InvalidReviewDetails')
        .withArgs('None set');
    });

    it('should fail if InvalidReviewDetails, both subject & attestationDetails are empty, service only is set', async () => {
      const { ethosReview, REVIEW_CREATOR_0, SERVICE_X, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      const params = {
        score: Score.Positive,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: SERVICE_X } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
          ),
      )
        .to.be.revertedWithCustomError(ethosReview, 'InvalidReviewDetails')
        .withArgs('None set');
    });

    it('should fail if InvalidReviewDetails, both subject & attestationDetails are set - subject & account only', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        ACCOUNT_NAME_BEN,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: ACCOUNT_NAME_BEN, service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
          ),
      )
        .to.be.revertedWithCustomError(ethosReview, 'InvalidReviewDetails')
        .withArgs('Both set');
    });

    it('should fail if InvalidReviewDetails, both subject & attestationDetails are set - subject & service only', async () => {
      const { ethosReview, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, SERVICE_X, ethosProfile, OWNER } =
        await loadFixture(deployFixture);

      // subject & service only
      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: SERVICE_X } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
          ),
      )
        .to.be.revertedWithCustomError(ethosReview, 'InvalidReviewDetails')
        .withArgs('Both set');
    });

    it('should fail if InvalidReviewDetails, both subject & attestationDetails are set - subject & account & service', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        ADMIN,
        REVIEW_SUBJECT_0,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, ethers.parseEther('0'));

      // subject & account & service
      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
          ),
      )
        .to.be.revertedWithCustomError(ethosReview, 'InvalidReviewDetails')
        .withArgs('Both set');
    });

    it('should fail if SelfReview, _subject == msg.sender', async () => {
      const { ethosReview, REVIEW_CREATOR_0, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      const params = {
        score: Score.Positive,
        subject: REVIEW_CREATOR_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
          ),
      )
        .to.be.revertedWithCustomError(ethosReview, 'SelfReview')
        .withArgs(REVIEW_CREATOR_0.address);
    });

    it('should set the author profile correctly', async () => {
      const { ethosReview, ethosProfile, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, OWNER } =
        await loadFixture(deployFixture);

      // Create a profile for REVIEW_CREATOR_0
      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      const profileId = await ethosProfile.profileIdByAddress(REVIEW_CREATOR_0.address);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          Score.Positive,
          REVIEW_SUBJECT_0.address,
          ethers.ZeroAddress,
          'Test comment',
          'Test metadata',
          { account: '', service: '' },
        );

      const review = await ethosReview.reviews(0);
      expect(review.authorProfileId).to.equal(profileId, 'Author profile ID not set correctly');
    });

    it('should set the subject profile to mock id if subject doesnt have a profile', async () => {
      const { ethosReview, ethosProfile, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, OWNER } =
        await loadFixture(deployFixture);

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          Score.Positive,
          REVIEW_SUBJECT_0.address,
          ethers.ZeroAddress,
          'Test comment',
          'Test metadata',
          { account: '', service: '' },
        );

      const review = await ethosReview.reviews(0);
      const reviewIds = await ethosReview.reviewIdsBySubjectAddress(REVIEW_SUBJECT_0.address);
      expect(review.reviewId).to.equal(reviewIds[0], 'Subject profile ID should be stored');
    });

    it('should set the subject profile to mock id for attestation based reviews', async () => {
      const {
        ethosReview,
        ethosProfile,
        ethosAttestation,
        REVIEW_CREATOR_0,
        OWNER,
        OTHER_0,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      } = await loadFixture(deployFixture);

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);
      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

      const randValue = '123';
      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );
      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          randValue,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          Score.Positive,
          ethers.ZeroAddress,
          ethers.ZeroAddress,
          'Test comment',
          'Test metadata',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
        );

      const review = await ethosReview.reviews(0);
      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        review.attestationDetails.service,
        review.attestationDetails.account,
      );
      const reviewsBySubjectHash =
        await ethosReview.reviewIdsBySubjectAttestationHash(attestationHash);
      expect(review.reviewId).to.equal(reviewsBySubjectHash[0]);
    });

    it('should set the subject profile to attestation id for existing attestation', async () => {
      const {
        ethosReview,
        ethosProfile,
        ethosAttestation,
        ACCOUNT_NAME_BEN,
        OTHER_0,
        SERVICE_X,
        EXPECTED_SIGNER,
        REVIEW_CREATOR_0,
        OWNER,
      } = await loadFixture(deployFixture);

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);
      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
        );

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          Score.Positive,
          ethers.ZeroAddress,
          ethers.ZeroAddress,
          'Test comment',
          'Test metadata',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
        );

      const review = await ethosReview.reviews(0);
      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        review.attestationDetails.service,
        review.attestationDetails.account,
      );
      expect(await ethosProfile.profileIdByAttestation(attestationHash)).to.equal(
        3,
        'Subject profile ID should be 3 for attestation based review',
      );
    });

    it('should set new review for correct id - pay with native coin', async () => {
      const { ethosReview, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, ADMIN, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      const createdTime = await time.latest();

      const review = await ethosReview.reviews(0);
      expect(review.archived).to.equal(false, 'wrong archived for 0');
      expect(review.score).to.equal(params.score, 'wrong score for 0');
      expect(review.author).to.equal(REVIEW_CREATOR_0.address, 'wrong author for 0');
      expect(review.subject).to.equal(params.subject, 'wrong subject for 0');
      expect(review.reviewId).to.equal(0, 'wrong reviewId for 0');
      expect(review.createdAt).to.equal(createdTime, 'wrong createdAt for 0');
      expect(review.comment).to.equal(params.comment, 'wrong comment for 0');
      expect(review.metadata).to.equal(params.metadata, 'wrong metadata for 0');
      expect(review.attestationDetails.account).to.equal(
        params.attestationDetails.account,
        'wrong account for 0',
      );
      expect(review.attestationDetails.service).to.equal(
        params.attestationDetails.service,
        'wrong service for 0',
      );
    });

    it('should set correct archived property for a new review, pay with native coin', async () => {
      const {
        ethosReview,
        ethosAttestation,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        OTHER_0,
        EXPECTED_SIGNER,
        ADMIN,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      // use subject
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      let review = await ethosReview.reviews(0);
      expect(review.archived).to.equal(false, 'wrong archived for 0');

      // use attestationDetails
      const commentForAttestationDetails = 'comment For Attestation Details';
      params = {
        score: Score.Negative,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: commentForAttestationDetails,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);
      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);
      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
        );
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      review = await ethosReview.reviews(1);
      expect(review.archived).to.equal(false, 'wrong archived for 1');
    });

    it('should set correct score for a new review, pay with native coin', async () => {
      const {
        ethosReview,
        ethosAttestation,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        EXPECTED_SIGNER,
        OTHER_0,
        ADMIN,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      // use subject
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      let review = await ethosReview.reviews(0);
      expect(review.score).to.equal(params.score, 'wrong score for 0');
      expect(review.score).to.equal(Score.Positive, 'wrong score for 0');

      // use attestationDetails
      const commentForAttestationDetails = 'comment For Attestation Details';
      params = {
        score: Score.Negative,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: commentForAttestationDetails,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);
      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
        );
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      review = await ethosReview.reviews(1);
      expect(review.score).to.equal(params.score, 'wrong score for 1');
      expect(review.score).to.equal(Score.Negative, 'wrong score for 1');
    });

    it('should set correct author for a new review, pay with native coin', async () => {
      const {
        ethosReview,
        ethosAttestation,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        EXPECTED_SIGNER,
        ADMIN,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      // use subject
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      let review = await ethosReview.reviews(0);
      expect(review.author).to.equal(REVIEW_CREATOR_0.address, 'wrong author for 0');

      // use attestationDetails
      const commentForAttestationDetails = 'comment For Attestation Details';
      params = {
        score: Score.Negative,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: commentForAttestationDetails,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);
      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);

      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
        );
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      review = await ethosReview.reviews(1);
      expect(review.author).to.equal(REVIEW_CREATOR_1.address, 'wrong author for 1');
    });

    it('should set correct subject for a new review, pay with native coin', async () => {
      const {
        ethosReview,
        ethosAttestation,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        EXPECTED_SIGNER,
        ADMIN,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      // use subject
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      let review = await ethosReview.reviews(0);
      expect(review.subject).to.equal(params.subject, 'wrong subject for 0');
      expect(review.subject).to.equal(REVIEW_SUBJECT_0.address, 'wrong subject for 0');

      // use attestationDetails
      const commentForAttestationDetails = 'comment For Attestation Details';
      params = {
        score: Score.Negative,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: commentForAttestationDetails,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);
      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);

      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
        );
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      review = await ethosReview.reviews(1);
      expect(review.subject).to.equal(params.subject, 'wrong subject for 1');
      expect(review.subject).to.equal(ethers.ZeroAddress, 'wrong subject for 1');
    });

    it('should set correct reviewId for a new review, pay with native coin', async () => {
      const {
        ethosReview,
        ethosAttestation,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        EXPECTED_SIGNER,
        ADMIN,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      // use subject
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      let review = await ethosReview.reviews(0);
      expect(review.reviewId).to.equal(0, 'wrong reviewId for 0');

      // use attestationDetails
      const commentForAttestationDetails = 'comment For Attestation Details';
      params = {
        score: Score.Negative,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: commentForAttestationDetails,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);
      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);

      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
        );
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      review = await ethosReview.reviews(1);
      expect(review.reviewId).to.equal(1, 'wrong reviewId for 1');
    });

    it('should set correct createdAt for a new review, pay with ERC20', async () => {
      const {
        ethosReview,
        ethosAttestation,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        EXPECTED_SIGNER,
        ADMIN,
        PAYMENT_TOKEN_0,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_0.address, ethers.parseEther('10'));
      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_1.address, ethers.parseEther('10'));

      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_0).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );
      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_1).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );

      const PAYMENT_TOKEN_0_ADDRESS = await PAYMENT_TOKEN_0.getAddress();

      const reviewPrice = ethers.parseEther('1.987654321');
      await allowPaymentToken(ADMIN, ethosReview, PAYMENT_TOKEN_0_ADDRESS, true, reviewPrice);

      // use subject
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      let createdTime = await time.latest();

      let review = await ethosReview.reviews(0);
      expect(review.createdAt).to.equal(createdTime, 'wrong createdAt for 0');

      // use attestationDetails
      const commentForAttestationDetails = 'comment For Attestation Details';
      params = {
        score: Score.Negative,
        subject: ethers.ZeroAddress,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: commentForAttestationDetails,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);
      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);

      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
        );
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      createdTime = await time.latest();

      review = await ethosReview.reviews(1);
      expect(review.createdAt).to.equal(createdTime, 'wrong createdAt for 1');
    });

    it('should set correct comment for a new review, pay with ERC20', async () => {
      const {
        ethosReview,
        ethosAttestation,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        EXPECTED_SIGNER,
        ADMIN,
        PAYMENT_TOKEN_0,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_0.address, ethers.parseEther('10'));
      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_1.address, ethers.parseEther('10'));

      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_0).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );
      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_1).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );

      const PAYMENT_TOKEN_0_ADDRESS = await PAYMENT_TOKEN_0.getAddress();

      const reviewPrice = ethers.parseEther('1.987654321');
      await allowPaymentToken(ADMIN, ethosReview, PAYMENT_TOKEN_0_ADDRESS, true, reviewPrice);

      // use subject
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      let review = await ethosReview.reviews(0);
      expect(review.comment).to.equal(params.comment, 'wrong comment for 0');
      expect(review.comment).to.equal(defaultComment, 'wrong comment for 0');

      // use attestationDetails
      const commentForAttestationDetails = 'comment For Attestation Details';
      params = {
        score: Score.Negative,
        subject: ethers.ZeroAddress,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: commentForAttestationDetails,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);
      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);

      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
        );
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      review = await ethosReview.reviews(1);
      expect(review.comment).to.equal(params.comment, 'wrong comment for 1');
      expect(review.comment).to.equal(commentForAttestationDetails, 'wrong comment for 1');
    });

    it('should set correct metadata for a new review, pay with ERC20', async () => {
      const {
        ethosReview,
        ethosAttestation,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        EXPECTED_SIGNER,
        ADMIN,
        PAYMENT_TOKEN_0,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_0.address, ethers.parseEther('10'));
      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_1.address, ethers.parseEther('10'));

      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_0).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );
      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_1).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );

      const PAYMENT_TOKEN_0_ADDRESS = await PAYMENT_TOKEN_0.getAddress();

      const reviewPrice = ethers.parseEther('1.987654321');
      await allowPaymentToken(ADMIN, ethosReview, PAYMENT_TOKEN_0_ADDRESS, true, reviewPrice);

      // use subject
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      let review = await ethosReview.reviews(0);
      expect(review.metadata).to.equal(params.metadata, 'wrong metadata for 0');
      expect(review.metadata).to.equal(defaultMetadata, 'wrong metadata for 0');

      // use attestationDetails
      const metadataUpdated = 'comment For Attestation Details';
      params = {
        score: Score.Negative,
        subject: ethers.ZeroAddress,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: defaultComment,
        metadata: metadataUpdated,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);
      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);

      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
        );
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      review = await ethosReview.reviews(1);
      expect(review.metadata).to.equal(params.metadata, 'wrong metadata for 1');
      expect(review.metadata).to.equal(metadataUpdated, 'wrong metadata for 1');
    });

    it('should set correct attestationDetails for a new review, pay with ERC20', async () => {
      const {
        ethosReview,
        ethosAttestation,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        EXPECTED_SIGNER,
        ADMIN,
        PAYMENT_TOKEN_0,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_0.address, ethers.parseEther('10'));
      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_1.address, ethers.parseEther('10'));

      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_0).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );
      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_1).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );

      const PAYMENT_TOKEN_0_ADDRESS = await PAYMENT_TOKEN_0.getAddress();

      const reviewPrice = ethers.parseEther('1.987654321');
      await allowPaymentToken(ADMIN, ethosReview, PAYMENT_TOKEN_0_ADDRESS, true, reviewPrice);

      // use subject
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      let review = await ethosReview.reviews(0);
      expect(review.attestationDetails.account).to.equal(
        params.attestationDetails.account,
        'wrong account for 0',
      );
      expect(review.attestationDetails.account).to.equal('', 'wrong account for 0');

      expect(review.attestationDetails.service).to.equal(
        params.attestationDetails.service,
        'wrong service for 0',
      );
      expect(review.attestationDetails.service).to.equal('', 'wrong service for 0');

      // use attestationDetails
      params = {
        score: Score.Negative,
        subject: ethers.ZeroAddress,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);
      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
        );
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      review = await ethosReview.reviews(1);

      expect(review.attestationDetails.account).to.equal(
        params.attestationDetails.account,
        'wrong account for 1',
      );
      expect(review.attestationDetails.account).to.equal(ACCOUNT_NAME_BEN, 'wrong account for 1');

      expect(review.attestationDetails.service).to.equal(
        params.attestationDetails.service,
        'wrong service for 1',
      );
      expect(review.attestationDetails.service).to.equal(SERVICE_X, 'wrong service for 1');
    });

    it('should push correct reviewId to reviewsByAuthor, multiple reviews for each reviewer', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        ADMIN,
        PAYMENT_TOKEN_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_0.address, ethers.parseEther('10'));
      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_1.address, ethers.parseEther('10'));

      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_0).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );
      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_1).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );

      const PAYMENT_TOKEN_0_ADDRESS = await PAYMENT_TOKEN_0.getAddress();

      const reviewPrice = ethers.parseEther('1.987654321');
      await allowPaymentToken(ADMIN, ethosReview, PAYMENT_TOKEN_0_ADDRESS, true, reviewPrice);

      // REVIEW_CREATOR_0 - review 0
      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        metadata: defaultMetadata,
        comment: defaultComment,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      const reviewCreator0ProfileId = await inviteAndCreateProfile(
        ethosProfile,
        OWNER,
        REVIEW_CREATOR_0,
      );

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
          ),
      ).not.to.be.reverted;

      expect(
        await ethosReview.numberOfReviewsBy(
          ReviewsBy.Author,
          reviewCreator0ProfileId,
          ethers.ZeroHash,
        ),
      ).to.equal(1);

      // REVIEW_CREATOR_0 - review 1
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      expect(
        await ethosReview.numberOfReviewsBy(
          ReviewsBy.Author,
          reviewCreator0ProfileId,
          ethers.ZeroHash,
        ),
      ).to.equal(2);

      // REVIEW_CREATOR_1 - review 0
      const reviewCreator1ProfileId = await inviteAndCreateProfile(
        ethosProfile,
        OWNER,
        REVIEW_CREATOR_1,
      );

      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      expect(
        await ethosReview.numberOfReviewsBy(
          ReviewsBy.Author,
          reviewCreator1ProfileId,
          ethers.ZeroHash,
        ),
      ).to.equal(1);

      // REVIEW_CREATOR_0 - review 2
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      expect(
        await ethosReview.numberOfReviewsBy(
          ReviewsBy.Author,
          reviewCreator0ProfileId,
          ethers.ZeroHash,
        ),
      ).to.equal(3);

      // REVIEW_CREATOR_1 - review 1
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      expect(
        await ethosReview.numberOfReviewsBy(
          ReviewsBy.Author,
          reviewCreator1ProfileId,
          ethers.ZeroHash,
        ),
      ).to.equal(2);

      // REVIEW_CREATOR_1 - review 2
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      expect(
        await ethosReview.numberOfReviewsBy(
          ReviewsBy.Author,
          reviewCreator1ProfileId,
          ethers.ZeroHash,
        ),
      ).to.equal(3);
    });

    it('should push correct attestatonHash to reviewIdsByAttestationHash, if _subject == address(0), pay with native coin', async () => {
      const {
        ethosReview,
        ethosAttestation,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        ADMIN,
        EXPECTED_SIGNER,
        ACCOUNT_NAME_BEN,
        ACCOUNT_NAME_IVAN,
        SERVICE_X,
        SERVICE_FB,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      // SERVICE_X & ACCOUNT_NAME_BEN - 0
      const params = {
        score: Score.Positive,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);
      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

      let signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
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
          { value: reviewPrice },
        );

      const attestationHashBenX = ethers.solidityPackedKeccak256(
        ['string', 'string'],
        [SERVICE_X, ACCOUNT_NAME_BEN],
      );

      expect(
        await ethosReview.numberOfReviewsBy(
          ReviewsBy.AttestationHash,
          ethers.ZeroAddress,
          attestationHashBenX,
        ),
      ).to.equal(1, 'wrong for SERVICE_X & ACCOUNT_NAME_BEN - 0');
      expect(
        (await ethosReview.reviewIdsBySubjectAttestationHash(attestationHashBenX)).at(0),
      ).to.equal('0', 'wrong for SERVICE_X & ACCOUNT_NAME_BEN - 0');

      // SERVICE_FB & ACCOUNT_NAME_IVAN - 0
      params.attestationDetails = {
        account: ACCOUNT_NAME_IVAN,
        service: SERVICE_FB,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);

      signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843267',
        ACCOUNT_NAME_IVAN,
        SERVICE_FB,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843267',
          { account: ACCOUNT_NAME_IVAN, service: SERVICE_FB },
          'test',
          signature,
        );
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      const attestationHashIvanFB = ethers.solidityPackedKeccak256(
        ['string', 'string'],
        [SERVICE_FB, ACCOUNT_NAME_IVAN],
      );

      expect(
        await ethosReview.numberOfReviewsBy(ReviewsBy.AttestationHash, 0, attestationHashIvanFB),
      ).to.equal(2, 'review count by attestation hash when subject is attestation');
      expect(
        (await ethosReview.reviewIdsBySubjectAttestationHash(attestationHashIvanFB)).at(1),
      ).to.equal('1', 'review ids by subject attestation hash when subject is attestation');

      // SERVICE_X & ACCOUNT_NAME_BEN - 1
      params.attestationDetails = {
        account: ACCOUNT_NAME_BEN,
        service: SERVICE_X,
      };

      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      expect(
        await ethosReview.numberOfReviewsBy(ReviewsBy.AttestationHash, 0, attestationHashBenX),
      ).to.equal(3, 'review count by attestation hash when subject is attestation');
      expect(
        (await ethosReview.reviewIdsBySubjectAttestationHash(attestationHashBenX)).at(0),
      ).to.equal('0', 'review ids by subject attestation hash when subject is attestation');
      expect(
        (await ethosReview.reviewIdsBySubjectAttestationHash(attestationHashBenX)).at(1),
      ).to.equal('1', 'review ids by subject attestation hash when subject is attestation');

      // SERVICE_FB & ACCOUNT_NAME_IVAN - 1
      params.attestationDetails = {
        account: ACCOUNT_NAME_IVAN,
        service: SERVICE_FB,
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
          { value: reviewPrice },
        );

      expect(
        await ethosReview.numberOfReviewsBy(
          ReviewsBy.AttestationHash,
          ethers.ZeroAddress,
          attestationHashIvanFB,
        ),
      ).to.equal(4, 'wrong for SERVICE_FB & ACCOUNT_NAME_IVAN - 1');
      expect(
        (await ethosReview.reviewIdsBySubjectAttestationHash(attestationHashIvanFB)).at(0),
      ).to.equal('0', 'wrong for SERVICE_FB & ACCOUNT_NAME_IVAN - 1');
      expect(
        (await ethosReview.reviewIdsBySubjectAttestationHash(attestationHashIvanFB)).at(1),
      ).to.equal('1', 'wrong for SERVICE_FB & ACCOUNT_NAME_IVAN - 1');
    });

    it('should push correct reviewId to reviewIdsBySubject, if _subject != address(0)', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        ADMIN,
        PAYMENT_TOKEN_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_0.address, ethers.parseEther('10'));
      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_1.address, ethers.parseEther('10'));

      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_0).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );
      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_1).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );

      const PAYMENT_TOKEN_0_ADDRESS = await PAYMENT_TOKEN_0.getAddress();

      const reviewPrice = ethers.parseEther('1.987654321');
      await allowPaymentToken(ADMIN, ethosReview, PAYMENT_TOKEN_0_ADDRESS, true, reviewPrice);

      // REVIEW_SUBJECT_0 - 0
      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: PAYMENT_TOKEN_0_ADDRESS,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      const reviewSubjectProfileId = await ethosProfile.profileIdByAddress(
        REVIEW_SUBJECT_0.address,
      );

      expect(
        await ethosReview.numberOfReviewsBy(
          ReviewsBy.Subject,
          reviewSubjectProfileId,
          ethers.ZeroHash,
        ),
      ).to.equal(1, 'wrong for REVIEW_SUBJECT_0 - 0');
      expect(await ethosReview.reviewIdsBySubjectProfileId(reviewSubjectProfileId, 0)).to.equal(
        '0',
        'wrong for REVIEW_SUBJECT_0 - 0',
      );

      // REVIEW_SUBJECT_1 - 0
      params.subject = REVIEW_SUBJECT_1.address;
      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);

      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      expect(
        await ethosReview.numberOfReviewsBy(
          ReviewsBy.Subject,
          reviewSubjectProfileId,
          ethers.ZeroHash,
        ),
      ).to.equal(1, 'wrong for REVIEW_SUBJECT_1 - 0');
      expect(
        (await ethosReview.reviewIdsBySubjectAddress(REVIEW_SUBJECT_1.address)).at(0),
      ).to.equal('1', 'wrong for REVIEW_SUBJECT_1 - 0');

      // REVIEW_SUBJECT_0 - 1
      params.subject = REVIEW_SUBJECT_0.address;

      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
        );

      expect(
        await ethosReview.numberOfReviewsBy(
          ReviewsBy.Subject,
          reviewSubjectProfileId,
          ethers.ZeroHash,
        ),
      ).to.equal(2, 'wrong for REVIEW_SUBJECT_0 - 1');
      expect(
        (await ethosReview.reviewIdsBySubjectAddress(REVIEW_SUBJECT_0.address)).at(0),
      ).to.equal('0', 'wrong for REVIEW_SUBJECT_0 - 1, must be 0');
      expect(
        (await ethosReview.reviewIdsBySubjectAddress(REVIEW_SUBJECT_0.address)).at(1),
      ).to.equal('2', 'wrong for REVIEW_SUBJECT_0 - 1, must be 2');
    });

    it('should increase reviewCount by one after multiple reviews, pay with native coin', async () => {
      const {
        ethosReview,
        ethosAttestation,
        OTHER_0,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        EXPECTED_SIGNER,
        ADMIN,
        ACCOUNT_NAME_BEN,
        ACCOUNT_NAME_IVAN,
        SERVICE_X,
        SERVICE_FB,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      // 0
      let params = {
        score: Score.Positive,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);
      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

      let signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
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
          { value: reviewPrice },
        );

      expect(await ethosReview.reviewCount()).to.equal(1, 'wrong for 0');

      // 1
      params = {
        score: Score.Negative,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_IVAN,
          service: SERVICE_FB,
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);

      signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_IVAN,
        SERVICE_FB,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_IVAN, service: SERVICE_FB },
          'test',
          signature,
        );
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      expect(await ethosReview.reviewCount()).to.equal(2, 'wrong for 1');
    });
  });

  describe('archiveReview', () => {
    it('should fail if paused', async () => {
      const { ethosReview, interactionControl, OWNER } = await loadFixture(deployFixture);

      await interactionControl.connect(OWNER).pauseAll();

      await expect(ethosReview.archiveReview(0)).to.be.revertedWithCustomError(
        ethosReview,
        'EnforcedPause',
      );
    });

    it('should fail if reviewId does not exist', async () => {
      const { ethosReview, ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: '',
          service: '',
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      // test
      await expect(ethosReview.archiveReview(1))
        .to.be.revertedWithCustomError(ethosReview, 'ReviewNotFound')
        .withArgs(1);
    });

    it('should fail if review is already archived', async () => {
      const { ethosReview, ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: '',
          service: '',
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      await ethosReview.connect(REVIEW_CREATOR_0).archiveReview(0);

      // test
      await expect(ethosReview.connect(REVIEW_CREATOR_0).archiveReview(0))
        .to.be.revertedWithCustomError(ethosReview, 'ReviewIsArchived')
        .withArgs(0);
    });

    it('should fail if caller is not the author', async () => {
      const {
        ethosReview,
        ADMIN,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        WRONG_ADDRESS_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: '',
          service: '',
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      // test
      await expect(ethosReview.connect(WRONG_ADDRESS_0).archiveReview(0))
        .to.be.revertedWithCustomError(ethosReview, 'UnauthorizedArchiving')
        .withArgs(0);
    });

    it('should set review as archived', async () => {
      const { ethosReview, ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: '',
          service: '',
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      let review = await ethosReview.reviews(0);
      expect(review.archived).to.equal(false, 'wrong before');

      await ethosReview.connect(REVIEW_CREATOR_0).archiveReview(0);

      review = await ethosReview.reviews(0);
      expect(review.archived).to.equal(true, 'wrong after');
    });

    it('should emit ReviewArchived event with correct params', async () => {
      const {
        ethosReview,
        ethosAttestation,
        OTHER_0,
        EXPECTED_SIGNER,
        ADMIN,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      // use subject
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: '',
          service: '',
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      await expect(ethosReview.connect(REVIEW_CREATOR_0).archiveReview(0))
        .to.emit(ethosReview, 'ReviewArchived')
        .withArgs(0, REVIEW_CREATOR_0.address, REVIEW_SUBJECT_0.address);

      // use attestationDetails
      const commentForAttestationDetails = 'comment For Attestation Details';
      params = {
        score: Score.Negative,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: commentForAttestationDetails,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };
      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);
      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
        );
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      await expect(ethosReview.connect(REVIEW_CREATOR_1).archiveReview(1))
        .to.emit(ethosReview, 'ReviewArchived')
        .withArgs(1, REVIEW_CREATOR_1.address, ethers.ZeroAddress);
    });
  });

  describe('restoreReview', () => {
    it('should fail if paused', async () => {
      const { ethosReview, interactionControl, OWNER } = await loadFixture(deployFixture);

      await interactionControl.connect(OWNER).pauseAll();

      await expect(ethosReview.restoreReview(0)).to.be.revertedWithCustomError(
        ethosReview,
        'EnforcedPause',
      );
    });

    it('should fail if reviewId does not exist', async () => {
      const { ethosReview, ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      // no review
      await expect(ethosReview.restoreReview(0))
        .to.be.revertedWithCustomError(ethosReview, 'ReviewNotFound')
        .withArgs(0);

      await expect(ethosReview.restoreReview(2))
        .to.be.revertedWithCustomError(ethosReview, 'ReviewNotFound')
        .withArgs(2);

      // non existent review
      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: '',
          service: '',
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      await expect(ethosReview.restoreReview(1))
        .to.be.revertedWithCustomError(ethosReview, 'ReviewNotFound')
        .withArgs(1);
    });

    it('should fail if caller is not the author', async () => {
      const {
        ethosReview,
        ADMIN,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        WRONG_ADDRESS_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: '',
          service: '',
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      await ethosReview.connect(REVIEW_CREATOR_0).archiveReview(0);

      await ethosProfile.connect(OWNER).inviteAddress(WRONG_ADDRESS_0.address);
      await ethosProfile.connect(WRONG_ADDRESS_0).createProfile(1);
      await expect(ethosReview.connect(WRONG_ADDRESS_0).restoreReview(0))
        .to.be.revertedWithCustomError(ethosReview, 'UnauthorizedArchiving')
        .withArgs(0);
    });

    it('should fail if review is not archived', async () => {
      const { ethosReview, ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      // not archived
      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: '',
          service: '',
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      await expect(ethosReview.connect(REVIEW_CREATOR_0).restoreReview(0))
        .to.be.revertedWithCustomError(ethosReview, 'ReviewNotArchived')
        .withArgs(0);
    });

    it('should set review.archived == false', async () => {
      const { ethosReview, ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: '',
          service: '',
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      await ethosReview.connect(REVIEW_CREATOR_0).archiveReview(0);

      let review = await ethosReview.reviews(0);
      expect(review.archived).to.equal(true, 'wrong before');

      await ethosReview.connect(REVIEW_CREATOR_0).restoreReview(0);

      review = await ethosReview.reviews(0);
      expect(review.archived).to.equal(false, 'wrong after');
    });

    it('should emit ReviewRestored event with correct params', async () => {
      const {
        ethosReview,
        ethosAttestation,
        OTHER_0,
        EXPECTED_SIGNER,
        ADMIN,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      // use subject
      let params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: '',
          service: '',
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      await ethosReview.connect(REVIEW_CREATOR_0).archiveReview(0);

      await expect(ethosReview.connect(REVIEW_CREATOR_0).restoreReview(0))
        .to.emit(ethosReview, 'ReviewRestored')
        .withArgs(0, REVIEW_CREATOR_0.address, REVIEW_SUBJECT_0.address);

      // use attestationDetails
      const commentForAttestationDetails = 'comment For Attestation Details';
      params = {
        score: Score.Negative,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: commentForAttestationDetails,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);
      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
        );
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      await ethosReview.connect(REVIEW_CREATOR_1).archiveReview(1);

      await expect(ethosReview.connect(REVIEW_CREATOR_1).restoreReview(1))
        .to.emit(ethosReview, 'ReviewRestored')
        .withArgs(1, REVIEW_CREATOR_1.address, ethers.ZeroAddress);
    });
  });

  describe('reviewsByAuthorInRange', () => {
    it('should return empty if no reviews', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        ADMIN,
        REVIEW_SUBJECT_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);
      const reviewCreator1profileId = await inviteAndCreateProfile(
        ethosProfile,
        OWNER,
        REVIEW_CREATOR_1,
      );

      expect(await ethosReview.reviewsByAuthorInRange(reviewCreator1profileId, 0, 2)).to.deep.equal(
        [],
        'should be empty before',
      );

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
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
          { value: reviewPrice },
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
          { value: reviewPrice },
        );

      expect(await ethosReview.reviewsByAuthorInRange(reviewCreator1profileId, 0, 2)).to.deep.equal(
        [],
        'should be empty after',
      );
    });

    it('should return empty if maxLength == 0', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        ADMIN,
        REVIEW_SUBJECT_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);
      const reviewCreator1profileId = await inviteAndCreateProfile(
        ethosProfile,
        OWNER,
        REVIEW_CREATOR_1,
      );

      expect(await ethosReview.reviewsByAuthorInRange(reviewCreator1profileId, 0, 2)).to.deep.equal(
        [],
        'should be empty before',
      );

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
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
          { value: reviewPrice },
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
          { value: reviewPrice },
        );

      // 0
      expect(
        await ethosReview.reviewsByAuthorInRange(reviewCreator1profileId, 0, 0),
      ).to.be.deep.equal([], 'Wrong for 0');

      // 1
      expect(
        await ethosReview.reviewsByAuthorInRange(REVIEW_CREATOR_0.address, 0, 0),
      ).to.be.deep.equal([], 'Wrong for 1');
    });

    it('should return empty if fromIdx >= reviews', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        ADMIN,
        REVIEW_SUBJECT_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);
      const reviewCreator1profileId = await inviteAndCreateProfile(
        ethosProfile,
        OWNER,
        REVIEW_CREATOR_1,
      );

      expect(await ethosReview.reviewsByAuthorInRange(reviewCreator1profileId, 0, 2)).to.deep.equal(
        [],
        'should be empty before',
      );

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
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
          { value: reviewPrice },
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
          { value: reviewPrice },
        );

      // 0
      expect(
        await ethosReview.reviewsByAuthorInRange(reviewCreator1profileId, 1, 1),
      ).to.be.deep.equal([], 'Wrong for 0');

      // 1
      expect(
        await ethosReview.reviewsByAuthorInRange(REVIEW_CREATOR_0.address, 10, 1),
      ).to.be.deep.equal([], 'Wrong for 1');
    });

    it('should return correct reviews if requested length <= available length, fromIdx == 0, single author', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        ADMIN,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        OTHER_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const params0 = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      const reviewCreator0ProfileId = await inviteAndCreateProfile(
        ethosProfile,
        OWNER,
        REVIEW_CREATOR_0,
      );

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params0.score,
          params0.subject,
          params0.paymentToken,
          params0.comment,
          params0.metadata,
          params0.attestationDetails,
          { value: reviewPrice },
        );

      const comment1 = 'comment 1';
      const metadata1 = 'metadata 1';
      const params1 = {
        score: Score.Negative,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment1,
        metadata: metadata1,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params1.score,
          params1.subject,
          params1.paymentToken,
          params1.comment,
          params1.metadata,
          params1.attestationDetails,
          { value: reviewPrice },
        );

      await ethosReview.connect(REVIEW_CREATOR_0).archiveReview(1);

      const comment2 = 'comment 2222222';
      const params2 = {
        score: Score.Negative,
        subject: OTHER_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment2,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params2.score,
          params2.subject,
          params2.paymentToken,
          params2.comment,
          params2.metadata,
          params2.attestationDetails,
          { value: reviewPrice },
        );

      expect(await ethosReview.reviewsByAuthorInRange(reviewCreator0ProfileId, 0, 0)).to.deep.equal(
        [],
        'wrong for 0, 0',
      );

      // test 0, 1
      let res = await ethosReview.reviewsByAuthorInRange(reviewCreator0ProfileId, 0, 1);
      expect(res.length).to.equal(1, 'wrong length for 0, 1');

      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for 0, 1');
      expect(res[0].score).to.equal(params0.score, 'wrong res[0] score for 0, 1');
      expect(res[0].score).to.equal(Score.Positive, 'wrong res[0] score for 0, 1');
      expect(res[0].subject).to.equal(params0.subject, 'wrong res[0] subject for 0, 1');
      expect(res[0].subject).to.equal(REVIEW_SUBJECT_0.address, 'wrong res[0] subject for 0, 1');
      expect(res[0].comment).to.equal(params0.comment, 'wrong res[0] comment for 0, 1');
      expect(res[0].comment).to.equal(defaultComment, 'wrong res[0] comment for 0, 1');
      expect(res[0].metadata).to.equal(params0.metadata, 'wrong res[0] metadata for 0, 1');
      expect(res[0].metadata).to.equal(defaultMetadata, 'wrong res[0] metadata for 0, 1');
      expect(res[0].attestationDetails.account).to.equal(
        params0.attestationDetails.account,
        'wrong res[0] account for 0, 1',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params0.attestationDetails.service,
        'wrong res[0] service for 0, 1',
      );

      // test 0, 2
      // res[0]
      res = await ethosReview.reviewsByAuthorInRange(reviewCreator0ProfileId, 0, 2);
      expect(res.length).to.equal(2, 'wrong length for 0, 2');

      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for 0, 2');
      expect(res[0].score).to.equal(params0.score, 'wrong res[0] score for 0, 2');
      expect(res[0].score).to.equal(Score.Positive, 'wrong res[0] score for 0, 2');
      expect(res[0].subject).to.equal(params0.subject, 'wrong res[0] subject for 0, 2');
      expect(res[0].subject).to.equal(REVIEW_SUBJECT_0.address, 'wrong res[0] subject for 0, 2');
      expect(res[0].comment).to.equal(params0.comment, 'wrong res[0] comment for 0, 2');
      expect(res[0].comment).to.equal(defaultComment, 'wrong res[0] comment for 0, 2');
      expect(res[0].metadata).to.equal(params0.metadata, 'wrong res[0] metadata for 0, 2');
      expect(res[0].metadata).to.equal(defaultMetadata, 'wrong res[0] metadata for 0, 2');
      expect(res[0].attestationDetails.account).to.equal(
        params0.attestationDetails.account,
        'wrong res[0] account for 0, 2',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params0.attestationDetails.service,
        'wrong res[0] service for 0, 2',
      );

      // res[1]
      expect(res[1].archived).to.equal(true, 'wrong res[1] archived for 0, 2');
      expect(res[1].score).to.equal(params1.score, 'wrong res[1] score for 0, 2');
      expect(res[1].score).to.equal(Score.Negative, 'wrong res[1] score for 0, 2');
      expect(res[1].subject).to.equal(params1.subject, 'wrong res[1] subject for 0, 2');
      expect(res[1].subject).to.equal(REVIEW_SUBJECT_1.address, 'wrong res[1] subject for 0, 2');
      expect(res[1].comment).to.equal(params1.comment, 'wrong res[1] comment for 0, 2');
      expect(res[1].comment).to.equal(comment1, 'wrong res[1] comment for 0, 2');
      expect(res[1].metadata).to.equal(params1.metadata, 'wrong res[1] metadata for 0, 2');
      expect(res[1].metadata).to.equal(metadata1, 'wrong res[1] metadata for 0, 2');
      expect(res[1].attestationDetails.account).to.equal(
        params1.attestationDetails.account,
        'wrong res[1] account for 0, 2',
      );
      expect(res[1].attestationDetails.service).to.equal(
        params1.attestationDetails.service,
        'wrong res[1] service for 0, 2',
      );

      // test 0, 3
      // res[0]
      res = await ethosReview.reviewsByAuthorInRange(reviewCreator0ProfileId, 0, 3);
      expect(res.length).to.equal(3, 'wrong length for 0, 3');

      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for 0, 3');
      expect(res[0].score).to.equal(params0.score, 'wrong res[0] score for 0, 3');
      expect(res[0].score).to.equal(Score.Positive, 'wrong res[0] score for 0, 3');
      expect(res[0].subject).to.equal(params0.subject, 'wrong res[0] subject for 0, 3');
      expect(res[0].subject).to.equal(REVIEW_SUBJECT_0.address, 'wrong res[0] subject for 0, 3');
      expect(res[0].comment).to.equal(params0.comment, 'wrong res[0] comment for 0, 3');
      expect(res[0].comment).to.equal(defaultComment, 'wrong res[0] comment for 0, 3');
      expect(res[0].metadata).to.equal(params0.metadata, 'wrong res[0] metadata for 0, 3');
      expect(res[0].metadata).to.equal(defaultMetadata, 'wrong res[0] metadata for 0, 3');
      expect(res[0].attestationDetails.account).to.equal(
        params0.attestationDetails.account,
        'wrong res[0] account for 0, 3',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params0.attestationDetails.service,
        'wrong res[0] service for 0, 3',
      );

      // res[1]
      expect(res[1].archived).to.equal(true, 'wrong res[1] archived for 0, 3');
      expect(res[1].score).to.equal(params1.score, 'wrong res[1] score for 0, 3');
      expect(res[1].score).to.equal(Score.Negative, 'wrong res[1] score for 0, 3');
      expect(res[1].subject).to.equal(params1.subject, 'wrong res[1] subject for 0, 3');
      expect(res[1].subject).to.equal(REVIEW_SUBJECT_1.address, 'wrong res[1] subject for 0, 3');
      expect(res[1].comment).to.equal(params1.comment, 'wrong res[1] comment for 0, 3');
      expect(res[1].comment).to.equal(comment1, 'wrong res[1] comment for 0, 3');
      expect(res[1].metadata).to.equal(params1.metadata, 'wrong res[1] metadata for 0, 3');
      expect(res[1].metadata).to.equal(metadata1, 'wrong res[1] metadata for 0, 3');
      expect(res[1].attestationDetails.account).to.equal(
        params1.attestationDetails.account,
        'wrong res[1] account for 0, 3',
      );
      expect(res[1].attestationDetails.service).to.equal(
        params1.attestationDetails.service,
        'wrong res[1] service for 0, 3',
      );

      // res[2]
      expect(res[2].archived).to.equal(false, 'wrong res[2] archived for 0, 3');
      expect(res[2].score).to.equal(params2.score, 'wrong res[2] score for 0, 3');
      expect(res[2].score).to.equal(Score.Negative, 'wrong res[2] score for 0, 3');
      expect(res[2].subject).to.equal(params2.subject, 'wrong res[2] subject for 0, 3');
      expect(res[2].subject).to.equal(OTHER_0.address, 'wrong res[2] subject for 0, 3');
      expect(res[2].comment).to.equal(params2.comment, 'wrong res[2] comment for 0, 3');
      expect(res[2].comment).to.equal(comment2, 'wrong res[2] comment for 0, 3');
      expect(res[2].metadata).to.equal(params2.metadata, 'wrong res[2] metadata for 0, 3');
      expect(res[2].metadata).to.equal(defaultMetadata, 'wrong res[2] metadata for 0, 3');
      expect(res[2].attestationDetails.account).to.equal(
        params2.attestationDetails.account,
        'wrong res[2] account for 0, 3',
      );
      expect(res[2].attestationDetails.service).to.equal(
        params2.attestationDetails.service,
        'wrong res[2] service for 0, 3',
      );
    });

    it('should return correct reviews if requested length <= available length, fromIdx == custom number, multiple authors', async () => {
      const {
        ethosReview,
        ADMIN,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        OTHER_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const params0 = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      const reviewCreator0ProfileId = await inviteAndCreateProfile(
        ethosProfile,
        OWNER,
        REVIEW_CREATOR_0,
      );

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params0.score,
          params0.subject,
          params0.paymentToken,
          params0.comment,
          params0.metadata,
          params0.attestationDetails,
          { value: reviewPrice },
        );

      const comment1 = 'comment 1';
      const metadata1 = 'metadata 1';
      const params1 = {
        score: Score.Negative,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment1,
        metadata: metadata1,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      const reviewCreator1profileId = await inviteAndCreateProfile(
        ethosProfile,
        OWNER,
        REVIEW_CREATOR_1,
      );

      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params1.score,
          params1.subject,
          params1.paymentToken,
          params1.comment,
          params1.metadata,
          params1.attestationDetails,
          { value: reviewPrice },
        );

      await ethosReview.connect(REVIEW_CREATOR_1).archiveReview(1);

      const comment2 = 'comment 2222222';
      const metadata2 = 'metadata 2222222';
      const params2 = {
        score: Score.Negative,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment2,
        metadata: metadata2,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

      await ethosReview
        .connect(OTHER_0)
        .addReview(
          params2.score,
          params2.subject,
          params2.paymentToken,
          params2.comment,
          params2.metadata,
          params2.attestationDetails,
          { value: reviewPrice },
        );

      const comment3 = 'comment three';
      const metadata3 = 'metadata three';
      const params3 = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment3,
        metadata: metadata3,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(OTHER_0)
        .addReview(
          params3.score,
          params3.subject,
          params3.paymentToken,
          params3.comment,
          params3.metadata,
          params3.attestationDetails,
          { value: reviewPrice },
        );

      const comment4 = 'comment 44444';
      const metadata4 = 'metadata 44444';
      const params4 = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment4,
        metadata: metadata4,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params4.score,
          params4.subject,
          params4.paymentToken,
          params4.comment,
          params4.metadata,
          params4.attestationDetails,
          { value: reviewPrice },
        );

      const comment5 = 'comment 5';
      const metadata5 = 'metadata 5';
      const params5 = {
        score: Score.Neutral,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment5,
        metadata: metadata5,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params5.score,
          params5.subject,
          params5.paymentToken,
          params5.comment,
          params5.metadata,
          params5.attestationDetails,
          { value: reviewPrice },
        );

      const comment6 = 'comment 6';
      const metadata6 = 'metadata 6';
      const params6 = {
        score: Score.Negative,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment6,
        metadata: metadata6,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params6.score,
          params6.subject,
          params6.paymentToken,
          params6.comment,
          params6.metadata,
          params6.attestationDetails,
          { value: reviewPrice },
        );

      expect(await ethosReview.reviewsByAuthorInRange(reviewCreator0ProfileId, 0, 0)).to.deep.equal(
        [],
        'wrong for 0, 0',
      );

      // REVIEW_CREATOR_0
      // test 0, 1
      let res = await ethosReview.reviewsByAuthorInRange(reviewCreator0ProfileId, 0, 1);
      expect(res.length).to.equal(1, 'wrong length for 0, 1');

      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for 0, 1');
      expect(res[0].score).to.equal(params0.score, 'wrong res[0] score for 0, 1');
      expect(res[0].score).to.equal(Score.Positive, 'wrong res[0] score for 0, 1');
      expect(res[0].subject).to.equal(params0.subject, 'wrong res[0] subject for 0, 1');
      expect(res[0].subject).to.equal(REVIEW_SUBJECT_0.address, 'wrong res[0] subject for 0, 1');
      expect(res[0].comment).to.equal(params0.comment, 'wrong res[0] comment for 0, 1');
      expect(res[0].comment).to.equal(defaultComment, 'wrong res[0] comment for 0, 1');
      expect(res[0].metadata).to.equal(params0.metadata, 'wrong res[0] metadata for 0, 1');
      expect(res[0].metadata).to.equal(defaultMetadata, 'wrong res[0] metadata for 0, 1');
      expect(res[0].attestationDetails.account).to.equal(
        params0.attestationDetails.account,
        'wrong res[0] account for 0, 1',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params0.attestationDetails.service,
        'wrong res[0] service for 0, 1',
      );

      // REVIEW_CREATOR_1
      // test 0, 2
      res = await ethosReview.reviewsByAuthorInRange(reviewCreator1profileId, 1, 2);
      expect(res.length).to.equal(2, 'wrong length for 0, 2');

      // res[0]
      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for 1, 2');
      expect(res[0].score).to.equal(params5.score, 'wrong res[0] score for 1, 2');
      expect(res[0].score).to.equal(Score.Neutral, 'wrong res[0] score for 1, 2');
      expect(res[0].subject).to.equal(params5.subject, 'wrong res[0] subject for 1, 2');
      expect(res[0].subject).to.equal(REVIEW_SUBJECT_1.address, 'wrong res[0] subject for 1, 2');
      expect(res[0].comment).to.equal(params5.comment, 'wrong res[0] comment for 1, 2');
      expect(res[0].comment).to.equal(comment5, 'wrong res[0] comment for 1, 2');
      expect(res[0].metadata).to.equal(params5.metadata, 'wrong res[0] metadata for 1, 2');
      expect(res[0].metadata).to.equal(metadata5, 'wrong res[0] metadata for 1, 2');
      expect(res[0].attestationDetails.account).to.equal(
        params5.attestationDetails.account,
        'wrong res[0] account for 1, 2',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params5.attestationDetails.service,
        'wrong res[0] service for 1, 2',
      );

      // res[1]
      expect(res[1].archived).to.equal(false, 'wrong res[1] archived for 1, 2');
      expect(res[1].score).to.equal(params6.score, 'wrong res[1] score for 1, 2');
      expect(res[1].score).to.equal(Score.Negative, 'wrong res[1] score for 1, 2');
      expect(res[1].subject).to.equal(params6.subject, 'wrong res[1] subject for 1, 2');
      expect(res[1].subject).to.equal(REVIEW_SUBJECT_1.address, 'wrong res10] subject for 1, 2');
      expect(res[1].comment).to.equal(params6.comment, 'wrong res[1] comment for 1, 2');
      expect(res[1].comment).to.equal(comment6, 'wrong res[1] comment for 1, 2');
      expect(res[1].metadata).to.equal(params6.metadata, 'wrong res[1] metadata for 1, 2');
      expect(res[1].metadata).to.equal(metadata6, 'wrong res[1] metadata for 1, 2');
      expect(res[1].attestationDetails.account).to.equal(
        params6.attestationDetails.account,
        'wrong res[1] account for 1, 2',
      );
      expect(res[1].attestationDetails.service).to.equal(
        params6.attestationDetails.service,
        'wrong res[1] service for 1, 2',
      );

      // OTHER_0

      // test 0, 2
      // res[0]
      res = await ethosReview.reviewsByAuthorInRange(other0profileId, 0, 2);
      expect(res.length).to.equal(2, 'wrong length for 0, 2');

      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for 0, 2');
      expect(res[0].score).to.equal(params2.score, 'wrong res[0] score for 0, 2');
      expect(res[0].score).to.equal(Score.Negative, 'wrong res[0] score for 0, 2');
      expect(res[0].subject).to.equal(params2.subject, 'wrong res[0] subject for 0, 2');
      expect(res[0].subject).to.equal(REVIEW_SUBJECT_0.address, 'wrong res[0] subject for 0, 2');
      expect(res[0].comment).to.equal(params2.comment, 'wrong res[0] comment for 0, 2');
      expect(res[0].comment).to.equal(comment2, 'wrong res[0] comment for 0, 2');
      expect(res[0].metadata).to.equal(params2.metadata, 'wrong res[0] metadata for 0, 2');
      expect(res[0].metadata).to.equal(metadata2, 'wrong res[0] metadata for 0, 2');
      expect(res[0].attestationDetails.account).to.equal(
        params2.attestationDetails.account,
        'wrong res[0] account for 0, 2',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params2.attestationDetails.service,
        'wrong res[0] service for 0, 2',
      );

      // res[1]
      expect(res[1].archived).to.equal(false, 'wrong res[1] archived for 0, 2');
      expect(res[1].score).to.equal(params3.score, 'wrong res[1] score for 0, 2');
      expect(res[1].score).to.equal(Score.Positive, 'wrong res[1] score for 0, 2');
      expect(res[1].subject).to.equal(params3.subject, 'wrong res[1] subject for 0, 2');
      expect(res[1].subject).to.equal(REVIEW_SUBJECT_0.address, 'wrong res[1] subject for 0, 2');
      expect(res[1].comment).to.equal(params3.comment, 'wrong res[1] comment for 0, 2');
      expect(res[1].comment).to.equal(comment3, 'wrong res[1] comment for 0, 2');
      expect(res[1].metadata).to.equal(params3.metadata, 'wrong res[1] metadata for 0, 2');
      expect(res[1].metadata).to.equal(metadata3, 'wrong res[1] metadata for 0, 2');
      expect(res[1].attestationDetails.account).to.equal(
        params3.attestationDetails.account,
        'wrong res[1] account for 0, 2',
      );
      expect(res[1].attestationDetails.service).to.equal(
        params3.attestationDetails.service,
        'wrong res[1] service for 0, 2',
      );

      // test 1, 1
      res = await ethosReview.reviewsByAuthorInRange(other0profileId, 1, 1);
      expect(res.length).to.equal(1, 'wrong length for 1, 1');

      // res[0]
      expect(res[0].archived).to.equal(false, 'wrong res[1] archived for 1, 1');
      expect(res[0].score).to.equal(params3.score, 'wrong res[1] score for 1, 1');
      expect(res[0].score).to.equal(Score.Positive, 'wrong res[1] score for 1, 1');
      expect(res[0].subject).to.equal(params3.subject, 'wrong res[1] subject for 1, 1');
      expect(res[0].subject).to.equal(REVIEW_SUBJECT_0.address, 'wrong res[1] subject for 1, 1');
      expect(res[0].comment).to.equal(params3.comment, 'wrong res[1] comment for 1, 1');
      expect(res[0].comment).to.equal(comment3, 'wrong res[1] comment for 1, 1');
      expect(res[0].metadata).to.equal(params3.metadata, 'wrong res[1] metadata for 1, 1');
      expect(res[0].metadata).to.equal(metadata3, 'wrong res[1] metadata for 1, 1');
      expect(res[0].attestationDetails.account).to.equal(
        params3.attestationDetails.account,
        'wrong res[0] account for 1, 1',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params3.attestationDetails.service,
        'wrong res[0] service for 1, 1',
      );
    });

    it('should return all reviews if requested length > available length, fromIdx starts from 0 and more', async () => {
      const {
        ethosReview,
        ADMIN,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        OTHER_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const params0 = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      const reviewCreator0ProfileId = await inviteAndCreateProfile(
        ethosProfile,
        OWNER,
        REVIEW_CREATOR_0,
      );

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params0.score,
          params0.subject,
          params0.paymentToken,
          params0.comment,
          params0.metadata,
          params0.attestationDetails,
          { value: reviewPrice },
        );

      const comment1 = 'comment 1';
      const metadata1 = 'metadata 1';
      const params1 = {
        score: Score.Negative,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment1,
        metadata: metadata1,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      const reviewCreator1profileId = await inviteAndCreateProfile(
        ethosProfile,
        OWNER,
        REVIEW_CREATOR_1,
      );

      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params1.score,
          params1.subject,
          params1.paymentToken,
          params1.comment,
          params1.metadata,
          params1.attestationDetails,
          { value: reviewPrice },
        );

      await ethosReview.connect(REVIEW_CREATOR_1).archiveReview(1);

      const comment2 = 'comment 2222222';
      const metadata2 = 'metadata 2222222';
      const params2 = {
        score: Score.Negative,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment2,
        metadata: metadata2,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

      await ethosReview
        .connect(OTHER_0)
        .addReview(
          params2.score,
          params2.subject,
          params2.paymentToken,
          params2.comment,
          params2.metadata,
          params2.attestationDetails,
          { value: reviewPrice },
        );

      const comment3 = 'comment three';
      const metadata3 = 'metadata three';
      const params3 = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment3,
        metadata: metadata3,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(OTHER_0)
        .addReview(
          params3.score,
          params3.subject,
          params3.paymentToken,
          params3.comment,
          params3.metadata,
          params3.attestationDetails,
          { value: reviewPrice },
        );

      const comment4 = 'comment 44444';
      const metadata4 = 'metadata 44444';
      const params4 = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment4,
        metadata: metadata4,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params4.score,
          params4.subject,
          params4.paymentToken,
          params4.comment,
          params4.metadata,
          params4.attestationDetails,
          { value: reviewPrice },
        );

      const comment5 = 'comment 5';
      const metadata5 = 'metadata 5';
      const params5 = {
        score: Score.Neutral,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment5,
        metadata: metadata5,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params5.score,
          params5.subject,
          params5.paymentToken,
          params5.comment,
          params5.metadata,
          params5.attestationDetails,
          { value: reviewPrice },
        );

      const comment6 = 'comment 6';
      const metadata6 = 'metadata 6';
      const params6 = {
        score: Score.Negative,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment6,
        metadata: metadata6,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params6.score,
          params6.subject,
          params6.paymentToken,
          params6.comment,
          params6.metadata,
          params6.attestationDetails,
          { value: reviewPrice },
        );

      expect(await ethosReview.reviewsByAuthorInRange(reviewCreator0ProfileId, 0, 0)).to.deep.equal(
        [],
        'wrong for 0, 0',
      );

      // REVIEW_CREATOR_0
      let res = await ethosReview.reviewsByAuthorInRange(reviewCreator0ProfileId, 0, 3);
      expect(res.length).to.equal(2, 'wrong length for 0, 2');

      // res[0]
      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for REVIEW_CREATOR_0');
      expect(res[0].score).to.equal(params0.score, 'wrong res[0] score for REVIEW_CREATOR_0');
      expect(res[0].score).to.equal(Score.Positive, 'wrong res[0] score for REVIEW_CREATOR_0');
      expect(res[0].subject).to.equal(params0.subject, 'wrong res[0] subject for REVIEW_CREATOR_0');
      expect(res[0].subject).to.equal(
        REVIEW_SUBJECT_0.address,
        'wrong res[0] subject for REVIEW_CREATOR_0',
      );
      expect(res[0].comment).to.equal(params0.comment, 'wrong res[0] comment for REVIEW_CREATOR_0');
      expect(res[0].comment).to.equal(defaultComment, 'wrong res[0] comment for REVIEW_CREATOR_0');
      expect(res[0].metadata).to.equal(
        params0.metadata,
        'wrong res[0] metadata for REVIEW_CREATOR_0',
      );
      expect(res[0].metadata).to.equal(
        defaultMetadata,
        'wrong res[0] metadata for REVIEW_CREATOR_0',
      );
      expect(res[0].attestationDetails.account).to.equal(
        params0.attestationDetails.account,
        'wrong res[0] account for REVIEW_CREATOR_0',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params0.attestationDetails.service,
        'wrong res[0] service for REVIEW_CREATOR_0',
      );

      // res[1]
      expect(res[1].archived).to.equal(false, 'wrong res[1] archived for REVIEW_CREATOR_0');
      expect(res[1].score).to.equal(params4.score, 'wrong res[1] score for REVIEW_CREATOR_0');
      expect(res[1].score).to.equal(Score.Positive, 'wrong res[1] score for REVIEW_CREATOR_0');
      expect(res[1].subject).to.equal(params4.subject, 'wrong res[1] subject for REVIEW_CREATOR_0');
      expect(res[1].subject).to.equal(
        REVIEW_SUBJECT_1.address,
        'wrong res[1] subject for REVIEW_CREATOR_0',
      );
      expect(res[1].comment).to.equal(params4.comment, 'wrong res[1] comment for REVIEW_CREATOR_0');
      expect(res[1].comment).to.equal(comment4, 'wrong res[1] comment for REVIEW_CREATOR_0');
      expect(res[1].metadata).to.equal(
        params4.metadata,
        'wrong res[1] metadata for REVIEW_CREATOR_0',
      );
      expect(res[1].metadata).to.equal(metadata4, 'wrong res[1] metadata for REVIEW_CREATOR_0');
      expect(res[1].attestationDetails.account).to.equal(
        params4.attestationDetails.account,
        'wrong res[1] account for REVIEW_CREATOR_0',
      );
      expect(res[1].attestationDetails.service).to.equal(
        params4.attestationDetails.service,
        'wrong res[1] service for REVIEW_CREATOR_0',
      );

      // REVIEW_CREATOR_1
      res = await ethosReview.reviewsByAuthorInRange(reviewCreator1profileId, 0, 11);
      expect(res.length).to.equal(3, 'wrong length for REVIEW_CREATOR_1');

      expect(res[0].archived).to.equal(true, 'wrong res[0] archived for REVIEW_CREATOR_1');
      expect(res[0].score).to.equal(params1.score, 'wrong res[0] score for REVIEW_CREATOR_1');
      expect(res[0].score).to.equal(Score.Negative, 'wrong res[0] score for REVIEW_CREATOR_1');
      expect(res[0].subject).to.equal(params1.subject, 'wrong res[0] subject for REVIEW_CREATOR_1');
      expect(res[0].subject).to.equal(
        REVIEW_SUBJECT_1.address,
        'wrong res[0] subject for REVIEW_CREATOR_1',
      );
      expect(res[0].comment).to.equal(params1.comment, 'wrong res[0] comment for REVIEW_CREATOR_1');
      expect(res[0].comment).to.equal(comment1, 'wrong res[0] comment for REVIEW_CREATOR_1');
      expect(res[0].metadata).to.equal(
        params1.metadata,
        'wrong res[0] metadata for REVIEW_CREATOR_1',
      );
      expect(res[0].metadata).to.equal(metadata1, 'wrong res[0] metadata for REVIEW_CREATOR_1');
      expect(res[0].attestationDetails.account).to.equal(
        params1.attestationDetails.account,
        'wrong res[0] account for REVIEW_CREATOR_1',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params1.attestationDetails.service,
        'wrong res[0] service for REVIEW_CREATOR_1',
      );

      // res[1]
      expect(res[1].archived).to.equal(false, 'wrong res[1] archived for REVIEW_CREATOR_1');
      expect(res[1].score).to.equal(params5.score, 'wrong res[1] score for REVIEW_CREATOR_1');
      expect(res[1].score).to.equal(Score.Neutral, 'wrong res[1] score for REVIEW_CREATOR_1');
      expect(res[1].subject).to.equal(params5.subject, 'wrong res[1] subject for REVIEW_CREATOR_1');
      expect(res[1].subject).to.equal(
        REVIEW_SUBJECT_1.address,
        'wrong res[1] subject for REVIEW_CREATOR_1',
      );
      expect(res[1].comment).to.equal(params5.comment, 'wrong res[1] comment for REVIEW_CREATOR_1');
      expect(res[1].comment).to.equal(comment5, 'wrong res[1] comment for REVIEW_CREATOR_1');
      expect(res[1].metadata).to.equal(
        params5.metadata,
        'wrong res[1] metadata for REVIEW_CREATOR_1',
      );
      expect(res[1].metadata).to.equal(metadata5, 'wrong res[1] metadata for REVIEW_CREATOR_1');
      expect(res[1].attestationDetails.account).to.equal(
        params5.attestationDetails.account,
        'wrong res[1] account for REVIEW_CREATOR_1',
      );
      expect(res[1].attestationDetails.service).to.equal(
        params5.attestationDetails.service,
        'wrong res[1] service for REVIEW_CREATOR_1',
      );

      // res[2]
      expect(res[2].archived).to.equal(false, 'wrong res[1] archived for REVIEW_CREATOR_1');
      expect(res[2].score).to.equal(params6.score, 'wrong res[1] score for REVIEW_CREATOR_1');
      expect(res[2].score).to.equal(Score.Negative, 'wrong res[1] score for REVIEW_CREATOR_1');
      expect(res[2].subject).to.equal(params6.subject, 'wrong res[1] subject for REVIEW_CREATOR_1');
      expect(res[2].subject).to.equal(
        REVIEW_SUBJECT_1.address,
        'wrong res[1] subject for REVIEW_CREATOR_1',
      );
      expect(res[2].comment).to.equal(params6.comment, 'wrong res[1] comment for REVIEW_CREATOR_1');
      expect(res[2].comment).to.equal(comment6, 'wrong res[1] comment for REVIEW_CREATOR_1');
      expect(res[2].metadata).to.equal(
        params6.metadata,
        'wrong res[1] metadata for REVIEW_CREATOR_1',
      );
      expect(res[2].metadata).to.equal(metadata6, 'wrong res[1] metadata for REVIEW_CREATOR_1');
      expect(res[2].attestationDetails.account).to.equal(
        params6.attestationDetails.account,
        'wrong res[2] account for REVIEW_CREATOR_1',
      );
      expect(res[2].attestationDetails.service).to.equal(
        params6.attestationDetails.service,
        'wrong res[2] service for REVIEW_CREATOR_1',
      );

      // OTHER_0
      res = await ethosReview.reviewsByAuthorInRange(other0profileId, 0, 1);
      expect(res.length).to.equal(1, 'wrong length for OTHER_0');

      // res[0]
      res = await ethosReview.reviewsByAuthorInRange(other0profileId, 0, 2);
      expect(res.length).to.equal(2, 'wrong length for OTHER_0');

      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for OTHER_0');
      expect(res[0].score).to.equal(params2.score, 'wrong res[0] score for OTHER_0');
      expect(res[0].score).to.equal(Score.Negative, 'wrong res[0] score for OTHER_0');
      expect(res[0].subject).to.equal(params2.subject, 'wrong res[0] subject for OTHER_0');
      expect(res[0].subject).to.equal(REVIEW_SUBJECT_0.address, 'wrong res[0] subject for OTHER_0');
      expect(res[0].comment).to.equal(params2.comment, 'wrong res[0] comment for OTHER_0');
      expect(res[0].comment).to.equal(comment2, 'wrong res[0] comment for OTHER_0');
      expect(res[0].metadata).to.equal(params2.metadata, 'wrong res[0] metadata for OTHER_0');
      expect(res[0].metadata).to.equal(metadata2, 'wrong res[0] metadata for OTHER_0');
      expect(res[0].attestationDetails.account).to.equal(
        params2.attestationDetails.account,
        'wrong res[0] account for OTHER_0',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params2.attestationDetails.service,
        'wrong res[0] service for OTHER_0',
      );

      // res[1]
      expect(res[1].archived).to.equal(false, 'wrong res[1] archived for OTHER_0');
      expect(res[1].score).to.equal(params3.score, 'wrong res[1] score for OTHER_0');
      expect(res[1].score).to.equal(Score.Positive, 'wrong res[1] score for OTHER_0');
      expect(res[1].subject).to.equal(params3.subject, 'wrong res[1] subject for OTHER_0');
      expect(res[1].subject).to.equal(REVIEW_SUBJECT_0.address, 'wrong res[1] subject for OTHER_0');
      expect(res[1].comment).to.equal(params3.comment, 'wrong res[1] comment for OTHER_0');
      expect(res[1].comment).to.equal(comment3, 'wrong res[1] comment for OTHER_0');
      expect(res[1].metadata).to.equal(params3.metadata, 'wrong res[1] metadata for OTHER_0');
      expect(res[1].metadata).to.equal(metadata3, 'wrong res[1] metadata for OTHER_0');
      expect(res[1].attestationDetails.account).to.equal(
        params3.attestationDetails.account,
        'wrong res[1] account for OTHER_0',
      );
      expect(res[1].attestationDetails.service).to.equal(
        params3.attestationDetails.service,
        'wrong res[1] service for OTHER_0',
      );
    });
  });

  describe('reviewsBySubjectInRange', () => {
    it('should return empty if no reviews', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        ADMIN,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      expect(
        await ethosReview.reviewsBySubjectInRange(REVIEW_SUBJECT_0.address, 0, 2),
      ).to.deep.equal([], 'should be empty before');

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
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
          { value: reviewPrice },
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
          { value: reviewPrice },
        );

      expect(
        await ethosReview.reviewsBySubjectInRange(REVIEW_SUBJECT_0.address, 0, 2),
      ).to.deep.equal([], 'should be empty after');
    });

    it('should return empty if maxLength == 0', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        ADMIN,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      expect(
        await ethosReview.reviewsBySubjectInRange(REVIEW_SUBJECT_0.address, 0, 0),
      ).to.deep.equal([], 'should be empty before');

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
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
          { value: reviewPrice },
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
          { value: reviewPrice },
        );

      // 0
      expect(
        await ethosReview.reviewsBySubjectInRange(REVIEW_SUBJECT_0.address, 0, 0),
      ).to.deep.equal([], 'should be empty for 0');

      // 1
      expect(
        await ethosReview.reviewsBySubjectInRange(REVIEW_SUBJECT_1.address, 0, 0),
      ).to.deep.equal([], 'should be empty for 1');
    });

    it('should return empty if fromIdx >= reviews', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        ADMIN,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      expect(
        await ethosReview.reviewsBySubjectInRange(REVIEW_SUBJECT_0.address, 1, 1),
      ).to.deep.equal([], 'should be empty before');

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
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
          { value: reviewPrice },
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
          { value: reviewPrice },
        );

      // 0
      expect(
        await ethosReview.reviewsBySubjectInRange(REVIEW_SUBJECT_0.address, 2, 6),
      ).to.deep.equal([], 'should be empty for 0');

      // 1
      expect(
        await ethosReview.reviewsBySubjectInRange(REVIEW_SUBJECT_1.address, 3, 4),
      ).to.deep.equal([], 'should be empty for 1');
    });

    it('should return correct reviews if requested length <= available length, fromIdx == 0, single subject', async () => {
      const {
        ethosReview,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        ADMIN,
        REVIEW_SUBJECT_1,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const params0 = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      const reviewCreator0ProfileId = await inviteAndCreateProfile(
        ethosProfile,
        OWNER,
        REVIEW_CREATOR_0,
      );

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params0.score,
          params0.subject,
          params0.paymentToken,
          params0.comment,
          params0.metadata,
          params0.attestationDetails,
          { value: reviewPrice },
        );

      const comment1 = 'comment 1';
      const metadata1 = 'metadata 1';
      const params1 = {
        score: Score.Negative,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment1,
        metadata: metadata1,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params1.score,
          params1.subject,
          params1.paymentToken,
          params1.comment,
          params1.metadata,
          params1.attestationDetails,
          { value: reviewPrice },
        );

      await ethosReview.connect(REVIEW_CREATOR_0).archiveReview(1);

      const comment2 = 'comment 2222222';
      const metadata2 = 'metadata 2222222';
      const params2 = {
        score: Score.Negative,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment2,
        metadata: metadata2,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);

      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params2.score,
          params2.subject,
          params2.paymentToken,
          params2.comment,
          params2.metadata,
          params2.attestationDetails,
          { value: reviewPrice },
        );

      expect(
        await ethosReview.reviewsBySubjectInRange(reviewCreator0ProfileId, 0, 0),
      ).to.deep.equal([], 'wrong for 0, 0');
      const reviewSubject1profileId = await ethosProfile.profileIdByAddress(
        REVIEW_SUBJECT_1.address,
      );

      // test 0, 1
      let res = await ethosReview.reviewsBySubjectInRange(reviewSubject1profileId, 0, 1);
      expect(res.length).to.equal(1, 'wrong length for 0, 1');
      expect(res[0].archived).to.equal(false, 'wrong archived for 0, 1');
      expect(res[0].score).to.equal(params0.score, 'wrong score for 0, 1');
      expect(res[0].score).to.equal(Score.Positive, 'wrong score for 0, 1');
      expect(res[0].subject).to.equal(params0.subject, 'wrong subject for 0, 1');
      expect(res[0].subject).to.equal(REVIEW_SUBJECT_1.address, 'wrong subject for 0, 1');
      expect(res[0].comment).to.equal(params0.comment, 'wrong comment for 0, 1');
      expect(res[0].comment).to.equal(defaultComment, 'wrong comment for 0, 1');
      expect(res[0].metadata).to.equal(params0.metadata, 'wrong metadata for 0, 1');
      expect(res[0].metadata).to.equal(defaultMetadata, 'wrong metadata for 0, 1');
      expect(res[0].attestationDetails.account).to.equal(
        params0.attestationDetails.account,
        'wrong account for 0, 1',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params0.attestationDetails.service,
        'wrong service for 0, 1',
      );

      // test 0, 2
      // res[0]
      res = await ethosReview.reviewsBySubjectInRange(reviewSubject1profileId, 0, 2);
      expect(res.length).to.equal(2, 'wrong length for 0, 2');
      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for 0, 2');
      expect(res[0].score).to.equal(params0.score, 'wrong res[0] score for 0, 2');
      expect(res[0].score).to.equal(Score.Positive, 'wrong res[0] score for 0, 2');
      expect(res[0].subject).to.equal(params0.subject, 'wrong res[0] subject for 0, 2');
      expect(res[0].subject).to.equal(REVIEW_SUBJECT_1.address, 'wrong res[0] subject for 0, 2');
      expect(res[0].comment).to.equal(params0.comment, 'wrong res[0] comment for 0, 2');
      expect(res[0].comment).to.equal(defaultComment, 'wrong res[0] comment for 0, 2');
      expect(res[0].metadata).to.equal(params0.metadata, 'wrong res[0] metadata for 0, 2');
      expect(res[0].metadata).to.equal(defaultMetadata, 'wrong res[0] metadata for 0, 2');
      expect(res[0].attestationDetails.account).to.equal(
        params0.attestationDetails.account,
        'wrong res[0] account for 0, 2',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params0.attestationDetails.service,
        'wrong res[0] service for 0, 2',
      );

      // res[1]
      expect(res[1].archived).to.equal(true, 'wrong res[1] archived for 0, 2');
      expect(res[1].score).to.equal(params1.score, 'wrong res[1] score for 0, 2');
      expect(res[1].score).to.equal(Score.Negative, 'wrong res[1] score for 0, 2');
      expect(res[1].subject).to.equal(params1.subject, 'wrong res[1] subject for 0, 2');
      expect(res[1].subject).to.equal(REVIEW_SUBJECT_1.address, 'wrong res[1] subject for 0, 2');
      expect(res[1].comment).to.equal(params1.comment, 'wrong res[1] comment for 0, 2');
      expect(res[1].comment).to.equal(comment1, 'wrong res[1] comment for 0, 2');
      expect(res[1].metadata).to.equal(params1.metadata, 'wrong res[1] metadata for 0, 2');
      expect(res[1].metadata).to.equal(metadata1, 'wrong res[1] metadata for 0, 2');
      expect(res[1].attestationDetails.account).to.equal(
        params1.attestationDetails.account,
        'wrong res[1] account for 0, 2',
      );
      expect(res[1].attestationDetails.service).to.equal(
        params1.attestationDetails.service,
        'wrong res[1] service for 0, 2',
      );

      // test 0, 3
      // res[0]
      res = await ethosReview.reviewsBySubjectInRange(reviewSubject1profileId, 0, 3);
      expect(res.length).to.equal(3, 'wrong length for 0, 3');
      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for 0, 3');
      expect(res[0].score).to.equal(params0.score, 'wrong res[0] score for 0, 3');
      expect(res[0].score).to.equal(Score.Positive, 'wrong res[0] score for 0, 3');
      expect(res[0].subject).to.equal(params0.subject, 'wrong res[0] subject for 0, 3');
      expect(res[0].subject).to.equal(REVIEW_SUBJECT_1.address, 'wrong res[0] subject for 0, 3');
      expect(res[0].comment).to.equal(params0.comment, 'wrong res[0] comment for 0, 3');
      expect(res[0].comment).to.equal(defaultComment, 'wrong res[0] comment for 0, 3');
      expect(res[0].metadata).to.equal(params0.metadata, 'wrong res[0] metadata for 0, 3');
      expect(res[0].metadata).to.equal(defaultMetadata, 'wrong res[0] metadata for 0, 3');
      expect(res[0].attestationDetails.account).to.equal(
        params0.attestationDetails.account,
        'wrong res[0] account for 0, 3',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params0.attestationDetails.service,
        'wrong res[0] service for 0, 3',
      );

      // res[1]
      expect(res[1].archived).to.equal(true, 'wrong res[1] archived for 0, 3');
      expect(res[1].score).to.equal(params1.score, 'wrong res[1] score for 0, 3');
      expect(res[1].score).to.equal(Score.Negative, 'wrong res[1] score for 0, 3');
      expect(res[1].subject).to.equal(params1.subject, 'wrong res[1] subject for 0, 3');
      expect(res[1].subject).to.equal(REVIEW_SUBJECT_1.address, 'wrong res[1] subject for 0, 3');
      expect(res[1].comment).to.equal(params1.comment, 'wrong res[1] comment for 0, 3');
      expect(res[1].comment).to.equal(comment1, 'wrong res[1] comment for 0, 3');
      expect(res[1].metadata).to.equal(params1.metadata, 'wrong res[1] metadata for 0, 3');
      expect(res[1].metadata).to.equal(metadata1, 'wrong res[1] metadata for 0, 3');
      expect(res[1].attestationDetails.account).to.equal(
        params1.attestationDetails.account,
        'wrong res[1] account for 0, 3',
      );
      expect(res[1].attestationDetails.service).to.equal(
        params1.attestationDetails.service,
        'wrong res[1] service for 0, 3',
      );

      // res[2]
      expect(res[2].archived).to.equal(false, 'wrong res[2] archived for 0, 3');
      expect(res[2].score).to.equal(params2.score, 'wrong res[2] score for 0, 3');
      expect(res[2].score).to.equal(Score.Negative, 'wrong res[2] score for 0, 3');
      expect(res[2].subject).to.equal(params2.subject, 'wrong res[2] subject for 0, 3');
      expect(res[2].subject).to.equal(REVIEW_SUBJECT_1.address, 'wrong res[2] subject for 0, 3');
      expect(res[2].comment).to.equal(params2.comment, 'wrong res[2] comment for 0, 3');
      expect(res[2].comment).to.equal(comment2, 'wrong res[2] comment for 0, 3');
      expect(res[2].metadata).to.equal(params2.metadata, 'wrong res[2] metadata for 0, 3');
      expect(res[2].metadata).to.equal(metadata2, 'wrong res[2] metadata for 0, 3');
      expect(res[2].attestationDetails.account).to.equal(
        params2.attestationDetails.account,
        'wrong res[2] account for 0, 3',
      );
      expect(res[2].attestationDetails.service).to.equal(
        params2.attestationDetails.service,
        'wrong res[2] service for 0, 3',
      );
    });

    it('should return correct reviews if requested length <= available length, fromIdx == custom number, multiple subjects', async () => {
      const {
        ethosReview,
        ADMIN,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        OTHER_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const params0 = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params0.score,
          params0.subject,
          params0.paymentToken,
          params0.comment,
          params0.metadata,
          params0.attestationDetails,
          { value: reviewPrice },
        );

      const comment1 = 'comment 1';
      const metadata1 = 'metadata 1';
      const params1 = {
        score: Score.Negative,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment1,
        metadata: metadata1,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);

      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params1.score,
          params1.subject,
          params1.paymentToken,
          params1.comment,
          params1.metadata,
          params1.attestationDetails,
          { value: reviewPrice },
        );

      await ethosReview.connect(REVIEW_CREATOR_1).archiveReview(1);

      const comment2 = 'comment 2222222';
      const metadata2 = 'metadata 2222222';
      const params2 = {
        score: Score.Negative,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment2,
        metadata: metadata2,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

      await ethosReview
        .connect(OTHER_0)
        .addReview(
          params2.score,
          params2.subject,
          params2.paymentToken,
          params2.comment,
          params2.metadata,
          params2.attestationDetails,
          { value: reviewPrice },
        );

      const comment3 = 'comment three';
      const metadata3 = 'metadata three';
      const params3 = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment3,
        metadata: metadata3,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(OTHER_0)
        .addReview(
          params3.score,
          params3.subject,
          params3.paymentToken,
          params3.comment,
          params3.metadata,
          params3.attestationDetails,
          { value: reviewPrice },
        );
      await ethosReview.connect(OTHER_0).archiveReview(3);

      const comment4 = 'comment 44444';
      const metadata4 = 'metadata 44444';
      const params4 = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment4,
        metadata: metadata4,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params4.score,
          params4.subject,
          params4.paymentToken,
          params4.comment,
          params4.metadata,
          params4.attestationDetails,
          { value: reviewPrice },
        );

      const comment5 = 'comment 5';
      const metadata5 = 'metadata 5';
      const params5 = {
        score: Score.Neutral,
        subject: OTHER_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment5,
        metadata: metadata5,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params5.score,
          params5.subject,
          params5.paymentToken,
          params5.comment,
          params5.metadata,
          params5.attestationDetails,
          { value: reviewPrice },
        );

      expect(
        await ethosReview.reviewsBySubjectInRange(REVIEW_CREATOR_0.address, 0, 0),
      ).to.deep.equal([], 'wrong for 0, 0');

      // REVIEW_SUBJECT_0
      // test 1, 1
      const reviewSubject0profileId = await ethosProfile.profileIdByAddress(
        REVIEW_SUBJECT_0.address,
      );
      let res = await ethosReview.reviewsBySubjectInRange(reviewSubject0profileId, 1, 1);
      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for 1, 1');
      expect(res[0].score).to.equal(params2.score, 'wrong res[0] score for 1, 1');
      expect(res[0].score).to.equal(Score.Negative, 'wrong res[0] score for 1, 1');
      expect(res[0].subject).to.equal(params2.subject, 'wrong res[0] subject for 1, 1');
      expect(res[0].subject).to.equal(REVIEW_SUBJECT_0.address, 'wrong res[0] subject for 1, 1');
      expect(res[0].comment).to.equal(params2.comment, 'wrong res[0] comment for 1, 1');
      expect(res[0].comment).to.equal(comment2, 'wrong res[0] comment for 1, 1');
      expect(res[0].metadata).to.equal(params2.metadata, 'wrong res[0] metadata for 1, 1');
      expect(res[0].metadata).to.equal(metadata2, 'wrong res[0] metadata for 1, 1');
      expect(res[0].attestationDetails.account).to.equal(
        params2.attestationDetails.account,
        'wrong res[0] account for 1, 1',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params2.attestationDetails.service,
        'wrong res[0] service for 1, 1',
      );

      // test 2, 1
      res = await ethosReview.reviewsBySubjectInRange(reviewSubject0profileId, 2, 1);
      expect(res[0].archived).to.equal(true, 'wrong res[0] archived for 2, 1');
      expect(res[0].score).to.equal(params3.score, 'wrong res[0] score for 2, 1');
      expect(res[0].score).to.equal(Score.Positive, 'wrong res[0] score for 2, 1');
      expect(res[0].subject).to.equal(params3.subject, 'wrong res[0] subject for 2, 1');
      expect(res[0].subject).to.equal(REVIEW_SUBJECT_0.address, 'wrong res[0] subject for 2, 1');
      expect(res[0].comment).to.equal(params3.comment, 'wrong res[0] comment for 2, 1');
      expect(res[0].comment).to.equal(comment3, 'wrong res[0] comment for 2, 1');
      expect(res[0].metadata).to.equal(params3.metadata, 'wrong res[0] metadata for 2, 1');
      expect(res[0].metadata).to.equal(metadata3, 'wrong res[0] metadata for 2, 1');
      expect(res[0].attestationDetails.account).to.equal(
        params3.attestationDetails.account,
        'wrong res[0] account for 2, 1',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params3.attestationDetails.service,
        'wrong res[0] service for 2, 1',
      );

      // test 1, 2
      res = await ethosReview.reviewsBySubjectInRange(reviewSubject0profileId, 1, 2);

      // res[0]
      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for 1, 2');
      expect(res[0].score).to.equal(params2.score, 'wrong res[0] score for 1, 2');
      expect(res[0].score).to.equal(Score.Negative, 'wrong res[0] score for 1, 2');
      expect(res[0].subject).to.equal(params2.subject, 'wrong res[0] subject for 1, 2');
      expect(res[0].subject).to.equal(REVIEW_SUBJECT_0.address, 'wrong res[0] subject for 1, 2');
      expect(res[0].comment).to.equal(params2.comment, 'wrong res[0] comment for 1, 2');
      expect(res[0].comment).to.equal(comment2, 'wrong res[0] comment for 1, 2');
      expect(res[0].metadata).to.equal(params2.metadata, 'wrong res[0] metadata for 1, 2');
      expect(res[0].metadata).to.equal(metadata2, 'wrong res[0] metadata for 1, 2');
      expect(res[0].attestationDetails.account).to.equal(
        params2.attestationDetails.account,
        'wrong res[0] account for 1, 2',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params2.attestationDetails.service,
        'wrong res[1] service for 1, 2',
      );

      // res[1]
      expect(res[1].archived).to.equal(true, 'wrong res[1] archived for 1, 2');
      expect(res[1].score).to.equal(params3.score, 'wrong res[1] score for 1, 2');
      expect(res[1].score).to.equal(Score.Positive, 'wrong res[1] score for 1, 2');
      expect(res[1].subject).to.equal(params3.subject, 'wrong res[1] subject for 1, 2');
      expect(res[1].subject).to.equal(REVIEW_SUBJECT_0.address, 'wrong res[1] subject for 1, 2');
      expect(res[1].comment).to.equal(params3.comment, 'wrong res[1] comment for 1, 2');
      expect(res[1].comment).to.equal(comment3, 'wrong res[1] comment for 1, 2');
      expect(res[1].metadata).to.equal(params3.metadata, 'wrong res[1] metadata for 1, 2');
      expect(res[1].metadata).to.equal(metadata3, 'wrong res[1] metadata for 1, 2');
      expect(res[1].attestationDetails.account).to.equal(
        params3.attestationDetails.account,
        'wrong res[1] account for 1, 2',
      );
      expect(res[1].attestationDetails.service).to.equal(
        params3.attestationDetails.service,
        'wrong res[1] service for 1, 2',
      );

      // REVIEW_SUBJECT_1
      // test 1, 2
      const reviewSubject1profileId = await ethosProfile.profileIdByAddress(
        REVIEW_SUBJECT_1.address,
      );
      res = await ethosReview.reviewsBySubjectInRange(reviewSubject1profileId, 1, 2);

      // res[0]
      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for 1, 2');
      expect(res[0].score).to.equal(params4.score, 'wrong res[0] score for 1, 2');
      expect(res[0].score).to.equal(Score.Positive, 'wrong res[0] score for 1, 2');
      expect(res[0].subject).to.equal(params4.subject, 'wrong res[0] subject for 1, 2');
      expect(res[0].subject).to.equal(REVIEW_SUBJECT_1.address, 'wrong res[0] subject for 1, 2');
      expect(res[0].comment).to.equal(params4.comment, 'wrong res[0] comment for 1, 2');
      expect(res[0].comment).to.equal(comment4, 'wrong res[0] comment for 1, 2');
      expect(res[0].metadata).to.equal(params4.metadata, 'wrong res[0] metadata for 1, 2');
      expect(res[0].metadata).to.equal(metadata4, 'wrong res[0] metadata for 1, 2');
      expect(res[0].attestationDetails.account).to.equal(
        params4.attestationDetails.account,
        'wrong res[0] account for 1, 2',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params4.attestationDetails.service,
        'wrong res[0] service for 1, 2',
      );
    });

    it('should return all reviews if requested length > available length, fromIdx starts from 0 and more', async () => {
      const {
        ethosReview,
        ADMIN,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        REVIEW_SUBJECT_0,
        REVIEW_SUBJECT_1,
        OTHER_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const params0 = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      const reviewCreator0profileId = await inviteAndCreateProfile(
        ethosProfile,
        OWNER,
        REVIEW_CREATOR_0,
      );

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params0.score,
          params0.subject,
          params0.paymentToken,
          params0.comment,
          params0.metadata,
          params0.attestationDetails,
          { value: reviewPrice },
        );

      const comment1 = 'comment 1';
      const metadata1 = 'metadata 1';
      const params1 = {
        score: Score.Negative,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment1,
        metadata: metadata1,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);

      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params1.score,
          params1.subject,
          params1.paymentToken,
          params1.comment,
          params1.metadata,
          params1.attestationDetails,
          { value: reviewPrice },
        );

      await ethosReview.connect(REVIEW_CREATOR_1).archiveReview(1);

      const comment2 = 'comment 2222222';
      const metadata2 = 'metadata 2222222';
      const params2 = {
        score: Score.Negative,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment2,
        metadata: metadata2,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };

      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

      await ethosReview
        .connect(OTHER_0)
        .addReview(
          params2.score,
          params2.subject,
          params2.paymentToken,
          params2.comment,
          params2.metadata,
          params2.attestationDetails,
          { value: reviewPrice },
        );

      const comment3 = 'comment three';
      const metadata3 = 'metadata three';
      const params3 = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment3,
        metadata: metadata3,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(OTHER_0)
        .addReview(
          params3.score,
          params3.subject,
          params3.paymentToken,
          params3.comment,
          params3.metadata,
          params3.attestationDetails,
          { value: reviewPrice },
        );
      await ethosReview.connect(OTHER_0).archiveReview(3);

      const comment4 = 'comment 44444';
      const metadata4 = 'metadata 44444';
      const params4 = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_1.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment4,
        metadata: metadata4,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params4.score,
          params4.subject,
          params4.paymentToken,
          params4.comment,
          params4.metadata,
          params4.attestationDetails,
          { value: reviewPrice },
        );

      const comment5 = 'comment 5';
      const metadata5 = 'metadata 5';
      const params5 = {
        score: Score.Neutral,
        subject: OTHER_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: comment5,
        metadata: metadata5,
        attestationDetails: { account: '', service: '' } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params5.score,
          params5.subject,
          params5.paymentToken,
          params5.comment,
          params5.metadata,
          params5.attestationDetails,
          { value: reviewPrice },
        );

      expect(
        await ethosReview.reviewsBySubjectInRange(reviewCreator0profileId, 0, 0),
      ).to.deep.equal([], 'wrong for 0, 0');

      // REVIEW_SUBJECT_0
      const reviewSubject0profileId = await ethosProfile.profileIdByAddress(
        REVIEW_SUBJECT_0.address,
      );
      let res = await ethosReview.reviewsBySubjectInRange(reviewSubject0profileId, 0, 11);

      // res[0]
      res = await ethosReview.reviewsBySubjectInRange(reviewSubject0profileId, 0, 3);
      expect(res.length).to.equal(3, 'wrong length for REVIEW_SUBJECT_0');
      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for REVIEW_SUBJECT_0');
      expect(res[0].score).to.equal(params0.score, 'wrong res[0] score for REVIEW_SUBJECT_0');
      expect(res[0].score).to.equal(Score.Positive, 'wrong res[0] score for REVIEW_SUBJECT_0');
      expect(res[0].subject).to.equal(params0.subject, 'wrong res[0] subject for REVIEW_SUBJECT_0');
      expect(res[0].subject).to.equal(
        REVIEW_SUBJECT_0.address,
        'wrong res[0] subject for REVIEW_SUBJECT_0',
      );
      expect(res[0].comment).to.equal(params0.comment, 'wrong res[0] comment for REVIEW_SUBJECT_0');
      expect(res[0].comment).to.equal(defaultComment, 'wrong res[0] comment for REVIEW_SUBJECT_0');
      expect(res[0].metadata).to.equal(
        params0.metadata,
        'wrong res[0] metadata for REVIEW_SUBJECT_0',
      );
      expect(res[0].metadata).to.equal(
        defaultMetadata,
        'wrong res[0] metadata for REVIEW_SUBJECT_0',
      );
      expect(res[0].attestationDetails.account).to.equal(
        params0.attestationDetails.account,
        'wrong res[0] account for REVIEW_SUBJECT_0',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params0.attestationDetails.service,
        'wrong res[0] service for REVIEW_SUBJECT_0',
      );

      // res[1]
      expect(res[1].archived).to.equal(false, 'wrong res[1] archived for REVIEW_SUBJECT_0');
      expect(res[1].score).to.equal(params2.score, 'wrong res[1] score for REVIEW_SUBJECT_0');
      expect(res[1].score).to.equal(Score.Negative, 'wrong res[1] score for REVIEW_SUBJECT_0');
      expect(res[1].subject).to.equal(params2.subject, 'wrong res[1] subject for REVIEW_SUBJECT_0');
      expect(res[1].subject).to.equal(
        REVIEW_SUBJECT_0.address,
        'wrong res[1] subject for REVIEW_SUBJECT_0',
      );
      expect(res[1].comment).to.equal(params2.comment, 'wrong res[1] comment for REVIEW_SUBJECT_0');
      expect(res[1].comment).to.equal(comment2, 'wrong res[1] comment for REVIEW_SUBJECT_0');
      expect(res[1].metadata).to.equal(
        params2.metadata,
        'wrong res[1] metadata for REVIEW_SUBJECT_0',
      );
      expect(res[1].metadata).to.equal(metadata2, 'wrong res[1] metadata for REVIEW_SUBJECT_0');
      expect(res[1].attestationDetails.account).to.equal(
        params2.attestationDetails.account,
        'wrong res[1] account for REVIEW_SUBJECT_0',
      );
      expect(res[1].attestationDetails.service).to.equal(
        params2.attestationDetails.service,
        'wrong res[1] service for REVIEW_SUBJECT_0',
      );

      // res[2]
      expect(res[2].archived).to.equal(true, 'wrong res[2] archived for REVIEW_SUBJECT_0');
      expect(res[2].score).to.equal(params3.score, 'wrong res[2] score for REVIEW_SUBJECT_0');
      expect(res[2].score).to.equal(Score.Positive, 'wrong res[2] score for REVIEW_SUBJECT_0');
      expect(res[2].subject).to.equal(params3.subject, 'wrong res[2] subject for REVIEW_SUBJECT_0');
      expect(res[2].subject).to.equal(
        REVIEW_SUBJECT_0.address,
        'wrong res[2] subject for REVIEW_SUBJECT_0',
      );
      expect(res[2].comment).to.equal(params3.comment, 'wrong res[2] comment for REVIEW_SUBJECT_0');
      expect(res[2].comment).to.equal(comment3, 'wrong res[2] comment for REVIEW_SUBJECT_0');
      expect(res[2].metadata).to.equal(
        params3.metadata,
        'wrong res[2] metadata for REVIEW_SUBJECT_0',
      );
      expect(res[2].metadata).to.equal(metadata3, 'wrong res[2] metadata for REVIEW_SUBJECT_0');
      expect(res[2].attestationDetails.account).to.equal(
        params3.attestationDetails.account,
        'wrong res[2] account for REVIEW_SUBJECT_0',
      );
      expect(res[2].attestationDetails.service).to.equal(
        params3.attestationDetails.service,
        'wrong res[2] service for REVIEW_SUBJECT_0',
      );

      // REVIEW_SUBJECT_1
      const reviewSubject1profileId = await ethosProfile.profileIdByAddress(
        REVIEW_SUBJECT_1.address,
      );
      res = await ethosReview.reviewsBySubjectInRange(reviewSubject1profileId, 0, 3);

      // res[0]
      expect(res.length).to.equal(2, 'wrong length for REVIEW_SUBJECT_1');
      expect(res[0].archived).to.equal(true, 'wrong res[0] archived for REVIEW_SUBJECT_1');
      expect(res[0].score).to.equal(params1.score, 'wrong res[0] score for REVIEW_SUBJECT_1');
      expect(res[0].score).to.equal(Score.Negative, 'wrong res[0] score for REVIEW_SUBJECT_1');
      expect(res[0].subject).to.equal(params1.subject, 'wrong res[0] subject for REVIEW_SUBJECT_1');
      expect(res[0].subject).to.equal(
        REVIEW_SUBJECT_1.address,
        'wrong res[0] subject for REVIEW_SUBJECT_1',
      );
      expect(res[0].comment).to.equal(params1.comment, 'wrong res[0] comment for REVIEW_SUBJECT_1');
      expect(res[0].comment).to.equal(comment1, 'wrong res[0] comment for REVIEW_SUBJECT_1');
      expect(res[0].metadata).to.equal(
        params1.metadata,
        'wrong res[0] metadata for REVIEW_SUBJECT_1',
      );
      expect(res[0].metadata).to.equal(metadata1, 'wrong res[0] metadata for REVIEW_SUBJECT_1');
      expect(res[0].attestationDetails.account).to.equal(
        params1.attestationDetails.account,
        'wrong res[0] account for REVIEW_SUBJECT_1',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params1.attestationDetails.service,
        'wrong res[0] service for REVIEW_SUBJECT_1',
      );

      // res[1]
      expect(res[1].archived).to.equal(false, 'wrong res[1] archived for REVIEW_SUBJECT_1');
      expect(res[1].score).to.equal(params4.score, 'wrong res[1] score for REVIEW_SUBJECT_1');
      expect(res[1].score).to.equal(Score.Positive, 'wrong res[1] score for REVIEW_SUBJECT_1');
      expect(res[1].subject).to.equal(params4.subject, 'wrong res[1] subject for REVIEW_SUBJECT_1');
      expect(res[1].subject).to.equal(
        REVIEW_SUBJECT_1.address,
        'wrong res[1] subject for REVIEW_SUBJECT_1',
      );
      expect(res[1].comment).to.equal(params4.comment, 'wrong res[1] comment for REVIEW_SUBJECT_1');
      expect(res[1].comment).to.equal(comment4, 'wrong res[1] comment for REVIEW_SUBJECT_1');
      expect(res[1].metadata).to.equal(
        params4.metadata,
        'wrong res[1] metadata for REVIEW_SUBJECT_1',
      );
      expect(res[1].metadata).to.equal(metadata4, 'wrong res[1] metadata for REVIEW_SUBJECT_1');
      expect(res[1].attestationDetails.account).to.equal(
        params4.attestationDetails.account,
        'wrong res[1] account for REVIEW_SUBJECT_1',
      );
      expect(res[1].attestationDetails.service).to.equal(
        params4.attestationDetails.service,
        'wrong res[1] service for REVIEW_SUBJECT_1',
      );

      // OTHER_0
      res = await ethosReview.reviewsBySubjectInRange(other0profileId, 0, 1234);
      expect(res.length).to.equal(1, 'wrong length for OTHER_0');
      expect(res[0].archived).to.equal(false, 'wrong archived for OTHER_0');
      expect(res[0].score).to.equal(params5.score, 'wrong score for OTHER_0');
      expect(res[0].score).to.equal(Score.Neutral, 'wrong score for OTHER_0');
      expect(res[0].subject).to.equal(params5.subject, 'wrong subject for OTHER_0');
      expect(res[0].subject).to.equal(OTHER_0.address, 'wrong subject for OTHER_0');
      expect(res[0].comment).to.equal(params5.comment, 'wrong comment for OTHER_0');
      expect(res[0].comment).to.equal(comment5, 'wrong comment for OTHER_0');
      expect(res[0].metadata).to.equal(params5.metadata, 'wrong metadata for OTHER_0');
      expect(res[0].metadata).to.equal(metadata5, 'wrong metadata for OTHER_0');
      expect(res[0].attestationDetails.account).to.equal(
        params5.attestationDetails.account,
        'wrong account for OTHER_0',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params5.attestationDetails.service,
        'wrong service for OTHER_0',
      );
    });
  });

  describe('reviewsByAttestationHashInRange', () => {
    it('should return empty if no reviews', async () => {
      const {
        ethosReview,
        ethosAttestation,
        OTHER_0,
        EXPECTED_SIGNER,
        REVIEW_CREATOR_0,
        ADMIN,
        SERVICE_X,
        SERVICE_FB,
        ACCOUNT_NAME_BEN,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_FB,
        ACCOUNT_NAME_BEN,
      );

      expect(
        await ethosReview.reviewsByAttestationHashInRange(attestationHash, 0, 2),
      ).to.deep.equal([], 'should be empty before');

      const params = {
        score: Score.Positive,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);
      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
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
          { value: reviewPrice },
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
          { value: reviewPrice },
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
          { value: reviewPrice },
        );

      expect(
        await ethosReview.reviewsByAttestationHashInRange(attestationHash, 0, 2),
      ).to.deep.equal([], 'should be empty after');
    });

    it('should return empty if maxLength == 0', async () => {
      const {
        ethosReview,
        ethosAttestation,
        OTHER_0,
        EXPECTED_SIGNER,
        REVIEW_CREATOR_0,
        ADMIN,
        SERVICE_X,
        SERVICE_FB,
        ACCOUNT_NAME_BEN,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_FB,
        ACCOUNT_NAME_BEN,
      );

      expect(
        await ethosReview.reviewsByAttestationHashInRange(attestationHash, 0, 2),
      ).to.deep.equal([], 'should be empty before');

      const params = {
        score: Score.Positive,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);
      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
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
          { value: reviewPrice },
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
          { value: reviewPrice },
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
          { value: reviewPrice },
        );

      // 0
      expect(
        await ethosReview.reviewsByAttestationHashInRange(attestationHash, 0, 0),
      ).to.be.deep.equal([], 'Wrong for 0');

      // 1
      const attestationHashCorrect = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );
      expect(
        await ethosReview.reviewsByAttestationHashInRange(attestationHashCorrect, 1, 0),
      ).to.be.deep.equal([], 'Wrong for 1');
    });

    it('should return empty if fromIdx >= reviews', async () => {
      const {
        ethosReview,
        ethosAttestation,
        OTHER_0,
        EXPECTED_SIGNER,
        REVIEW_CREATOR_0,
        ADMIN,
        SERVICE_X,
        SERVICE_FB,
        ACCOUNT_NAME_BEN,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_FB,
        ACCOUNT_NAME_BEN,
      );

      expect(
        await ethosReview.reviewsByAttestationHashInRange(attestationHash, 0, 2),
      ).to.deep.equal([], 'should be empty before');

      const params = {
        score: Score.Positive,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);
      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
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
          { value: reviewPrice },
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
          { value: reviewPrice },
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
          { value: reviewPrice },
        );

      // 0
      expect(
        await ethosReview.reviewsByAttestationHashInRange(attestationHash, 2, 1),
      ).to.be.deep.equal([], 'Wrong for 0');

      // 1
      const attestationHashCorrect = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );
      expect(
        await ethosReview.reviewsByAttestationHashInRange(attestationHashCorrect, 10, 1),
      ).to.be.deep.equal([], 'Wrong for 1');
    });

    it('should return correct reviews if requested length <= available length, fromIdx == 0, single attestationHash', async () => {
      const {
        ethosReview,
        ethosAttestation,
        OTHER_0,
        EXPECTED_SIGNER,
        REVIEW_CREATOR_0,
        REVIEW_CREATOR_1,
        ADMIN,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const params0 = {
        score: Score.Positive,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);
      const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        '120843257',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        'test',
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          '120843257',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          'test',
          signature,
        );
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params0.score,
          params0.subject,
          params0.paymentToken,
          params0.comment,
          params0.metadata,
          params0.attestationDetails,
          { value: reviewPrice },
        );

      const comment1 = 'comment 1';
      const metadata1 = 'metadata 1';
      const params1 = {
        score: Score.Negative,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: comment1,
        metadata: metadata1,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };
      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params1.score,
          params1.subject,
          params1.paymentToken,
          params1.comment,
          params1.metadata,
          params1.attestationDetails,
          { value: reviewPrice },
        );

      await ethosReview.connect(REVIEW_CREATOR_0).archiveReview(1);

      const comment2 = 'comment 2222222';
      const metadata2 = 'metadata 2222222';
      const params2 = {
        score: Score.Negative,
        subject: ethers.ZeroAddress,
        paymentToken: ethers.ZeroAddress,
        comment: comment2,
        metadata: metadata2,
        attestationDetails: {
          account: ACCOUNT_NAME_BEN,
          service: SERVICE_X,
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);

      await ethosReview
        .connect(REVIEW_CREATOR_1)
        .addReview(
          params2.score,
          params2.subject,
          params2.paymentToken,
          params2.comment,
          params2.metadata,
          params2.attestationDetails,
          { value: reviewPrice },
        );

      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      // test 0, 1
      let res = await ethosReview.reviewsByAttestationHashInRange(attestationHash, 0, 1);
      expect(res.length).to.equal(1, 'wrong length for 0, 1');

      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for 0, 1');
      expect(res[0].score).to.equal(params0.score, 'wrong res[0] score for 0, 1');
      expect(res[0].score).to.equal(Score.Positive, 'wrong res[0] score for 0, 1');
      expect(res[0].subject).to.equal(params0.subject, 'wrong res[0] subject for 0, 1');
      expect(res[0].subject).to.equal(ethers.ZeroAddress, 'wrong res[0] subject for 0, 1');
      expect(res[0].comment).to.equal(params0.comment, 'wrong res[0] comment for 0, 1');
      expect(res[0].comment).to.equal(defaultComment, 'wrong res[0] comment for 0, 1');
      expect(res[0].metadata).to.equal(params0.metadata, 'wrong res[0] metadata for 0, 1');
      expect(res[0].metadata).to.equal(defaultMetadata, 'wrong res[0] metadata for 0, 1');
      expect(res[0].attestationDetails.account).to.equal(
        params0.attestationDetails.account,
        'wrong res[0] account for 0, 1',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params0.attestationDetails.service,
        'wrong res[0] service for 0, 1',
      );

      // test 0, 2
      // res[0]
      res = await ethosReview.reviewsByAttestationHashInRange(attestationHash, 0, 2);
      expect(res.length).to.equal(2, 'wrong length for 0, 2');

      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for 0, 2');
      expect(res[0].score).to.equal(params0.score, 'wrong res[0] score for 0, 2');
      expect(res[0].score).to.equal(Score.Positive, 'wrong res[0] score for 0, 2');
      expect(res[0].subject).to.equal(params0.subject, 'wrong res[0] subject for 0, 2');
      expect(res[0].subject).to.equal(ethers.ZeroAddress, 'wrong res[0] subject for 0, 2');
      expect(res[0].comment).to.equal(params0.comment, 'wrong res[0] comment for 0, 2');
      expect(res[0].comment).to.equal(defaultComment, 'wrong res[0] comment for 0, 2');
      expect(res[0].metadata).to.equal(params0.metadata, 'wrong res[0] metadata for 0, 2');
      expect(res[0].metadata).to.equal(defaultMetadata, 'wrong res[0] metadata for 0, 2');
      expect(res[0].attestationDetails.account).to.equal(
        params0.attestationDetails.account,
        'wrong res[0] account for 0, 2',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params0.attestationDetails.service,
        'wrong res[0] service for 0, 2',
      );

      // res[1]
      expect(res[1].archived).to.equal(true, 'wrong res[1] archived for 0, 2');
      expect(res[1].score).to.equal(params1.score, 'wrong res[1] score for 0, 2');
      expect(res[1].score).to.equal(Score.Negative, 'wrong res[1] score for 0, 2');
      expect(res[1].subject).to.equal(params1.subject, 'wrong res[1] subject for 0, 2');
      expect(res[1].subject).to.equal(ethers.ZeroAddress, 'wrong res[1] subject for 0, 2');
      expect(res[1].comment).to.equal(params1.comment, 'wrong res[1] comment for 0, 2');
      expect(res[1].comment).to.equal(comment1, 'wrong res[1] comment for 0, 2');
      expect(res[1].metadata).to.equal(params1.metadata, 'wrong res[1] metadata for 0, 2');
      expect(res[1].metadata).to.equal(metadata1, 'wrong res[1] metadata for 0, 2');
      expect(res[1].attestationDetails.account).to.equal(
        params1.attestationDetails.account,
        'wrong res[1] account for 0, 2',
      );
      expect(res[1].attestationDetails.service).to.equal(
        params1.attestationDetails.service,
        'wrong res[1] service for 0, 2',
      );

      // test 0, 3
      // res[0]
      res = await ethosReview.reviewsByAttestationHashInRange(attestationHash, 0, 3);
      expect(res.length).to.equal(3, 'wrong length for 0, 3');

      expect(res[0].archived).to.equal(false, 'wrong res[0] archived for 0, 3');
      expect(res[0].score).to.equal(params0.score, 'wrong res[0] score for 0, 3');
      expect(res[0].score).to.equal(Score.Positive, 'wrong res[0] score for 0, 3');
      expect(res[0].subject).to.equal(params0.subject, 'wrong res[0] subject for 0, 3');
      expect(res[0].subject).to.equal(ethers.ZeroAddress, 'wrong res[0] subject for 0, 3');
      expect(res[0].comment).to.equal(params0.comment, 'wrong res[0] comment for 0, 3');
      expect(res[0].comment).to.equal(defaultComment, 'wrong res[0] comment for 0, 3');
      expect(res[0].metadata).to.equal(params0.metadata, 'wrong res[0] metadata for 0, 3');
      expect(res[0].metadata).to.equal(defaultMetadata, 'wrong res[0] metadata for 0, 3');
      expect(res[0].attestationDetails.account).to.equal(
        params0.attestationDetails.account,
        'wrong res[0] account for 0, 3',
      );
      expect(res[0].attestationDetails.service).to.equal(
        params0.attestationDetails.service,
        'wrong res[0] service for 0, 3',
      );

      // res[1]
      expect(res[1].archived).to.equal(true, 'wrong res[1] archived for 0, 3');
      expect(res[1].score).to.equal(params1.score, 'wrong res[1] score for 0, 3');
      expect(res[1].score).to.equal(Score.Negative, 'wrong res[1] score for 0, 3');
      expect(res[1].subject).to.equal(params1.subject, 'wrong res[1] subject for 0, 3');
      expect(res[1].subject).to.equal(ethers.ZeroAddress, 'wrong res[1] subject for 0, 3');
      expect(res[1].comment).to.equal(params1.comment, 'wrong res[1] comment for 0, 3');
      expect(res[1].comment).to.equal(comment1, 'wrong res[1] comment for 0, 3');
      expect(res[1].metadata).to.equal(params1.metadata, 'wrong res[1] metadata for 0, 3');
      expect(res[1].metadata).to.equal(metadata1, 'wrong res[1] metadata for 0, 3');
      expect(res[1].attestationDetails.account).to.equal(
        params1.attestationDetails.account,
        'wrong res[1] account for 0, 3',
      );
      expect(res[1].attestationDetails.service).to.equal(
        params1.attestationDetails.service,
        'wrong res[1] service for 0, 3',
      );

      // res[2]
      expect(res[2].archived).to.equal(false, 'wrong res[2] archived for 0, 3');
      expect(res[2].score).to.equal(params2.score, 'wrong res[2] score for 0, 3');
      expect(res[2].score).to.equal(Score.Negative, 'wrong res[2] score for 0, 3');
      expect(res[2].subject).to.equal(params2.subject, 'wrong res[2] subject for 0, 3');
      expect(res[2].subject).to.equal(ethers.ZeroAddress, 'wrong res[2] subject for 0, 3');
      expect(res[2].comment).to.equal(params2.comment, 'wrong res[2] comment for 0, 3');
      expect(res[2].comment).to.equal(comment2, 'wrong res[2] comment for 0, 3');
      expect(res[2].metadata).to.equal(params2.metadata, 'wrong res[2] metadata for 0, 3');
      expect(res[2].metadata).to.equal(metadata2, 'wrong res[2] metadata for 0, 3');
      expect(res[2].attestationDetails.account).to.equal(
        params2.attestationDetails.account,
        'wrong res[2] account for 0, 3',
      );
      expect(res[2].attestationDetails.service).to.equal(
        params2.attestationDetails.service,
        'wrong res[2] service for 0, 3',
      );
    });
  });

  describe('numberOfReviewsBy', () => {
    describe('ReviewsBy.Author', () => {
      it('should return 0 if no reviews at all', async () => {
        const { ethosReview, REVIEW_CREATOR_0 } = await loadFixture(deployFixture);

        expect(
          await ethosReview.numberOfReviewsBy(
            ReviewsBy.Author,
            REVIEW_CREATOR_0.address,
            ethers.ZeroHash,
          ),
        ).to.equal(0, 'wrong number of reviews');
      });

      it('should return correct number each time after multiple reviews', async () => {
        const {
          ethosReview,
          REVIEW_CREATOR_0,
          REVIEW_CREATOR_1,
          REVIEW_SUBJECT_0,
          ADMIN,
          OWNER,
          ethosProfile,
        } = await loadFixture(deployFixture);

        const reviewPrice = ethers.parseEther('1.23456789');
        await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

        // 0
        let params = {
          score: Score.Positive,
          subject: REVIEW_SUBJECT_0,
          paymentToken: ethers.ZeroAddress,
          comment: defaultComment,
          metadata: defaultMetadata,
          attestationDetails: {
            account: '',
            service: '',
          } satisfies AttestationDetails,
        };

        const profileId = await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

        await ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
            { value: reviewPrice },
          );

        // const ReviewsBy = {
        //   Author: 0,
        //   Subject: 1,
        //   AttestationHash: 2,
        // };

        expect(
          await ethosReview.numberOfReviewsBy(ReviewsBy.Author, profileId, ethers.ZeroHash),
        ).to.equal(1, 'wrong number of reviews for REVIEW_CREATOR_0, 0');

        const profileId2 = await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_1);
        expect(
          await ethosReview.numberOfReviewsBy(ReviewsBy.Author, profileId2, ethers.ZeroHash),
        ).to.equal(0, 'wrong number of reviews for REVIEW_CREATOR_1, 0');

        // 1
        params = {
          score: Score.Positive,
          subject: REVIEW_SUBJECT_0,
          paymentToken: ethers.ZeroAddress,
          comment: defaultComment,
          metadata: defaultMetadata,
          attestationDetails: {
            account: '',
            service: '',
          } satisfies AttestationDetails,
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
            { value: reviewPrice },
          );

        expect(
          await ethosReview.numberOfReviewsBy(ReviewsBy.Author, profileId, ethers.ZeroHash),
        ).to.equal(2, 'wrong number of reviews for REVIEW_CREATOR_0, 1');
        expect(
          await ethosReview.numberOfReviewsBy(ReviewsBy.Author, profileId2, ethers.ZeroHash),
        ).to.equal(0, 'wrong number of reviews for REVIEW_CREATOR_1, 1');

        // 2
        params = {
          score: Score.Positive,
          subject: REVIEW_SUBJECT_0,
          paymentToken: ethers.ZeroAddress,
          comment: defaultComment,
          metadata: defaultMetadata,
          attestationDetails: {
            account: '',
            service: '',
          } satisfies AttestationDetails,
        };

        await ethosReview
          .connect(REVIEW_CREATOR_1)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
            { value: reviewPrice },
          );

        expect(
          await ethosReview.numberOfReviewsBy(ReviewsBy.Author, profileId, ethers.ZeroHash),
        ).to.equal(2, 'wrong number of reviews for REVIEW_CREATOR_0, 2');
        expect(
          await ethosReview.numberOfReviewsBy(ReviewsBy.Author, profileId2, ethers.ZeroHash),
        ).to.equal(1, 'wrong number of reviews for REVIEW_CREATOR_1, 2');
      });
    });

    describe('ReviewsBy.Subject', () => {
      it('should return 0 if no reviews at all', async () => {
        const { ethosReview, ethosProfile, REVIEW_SUBJECT_0 } = await loadFixture(deployFixture);
        const profileId = await ethosProfile.profileIdByAddress(REVIEW_SUBJECT_0.address);
        expect(
          await ethosReview.numberOfReviewsBy(ReviewsBy.Subject, profileId, ethers.ZeroHash),
        ).to.equal(0, 'wrong number of reviews');
      });

      it('should return correct number each time after multiple reviews', async () => {
        const {
          ethosReview,
          REVIEW_CREATOR_0,
          REVIEW_SUBJECT_0,
          REVIEW_SUBJECT_1,
          ADMIN,
          OWNER,
          ethosProfile,
        } = await loadFixture(deployFixture);

        const reviewPrice = ethers.parseEther('1.23456789');
        await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

        // 0
        let params = {
          score: Score.Positive,
          subject: REVIEW_SUBJECT_0,
          paymentToken: ethers.ZeroAddress,
          comment: defaultComment,
          metadata: defaultMetadata,
          attestationDetails: {
            account: '',
            service: '',
          } satisfies AttestationDetails,
        };

        await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

        await ethosReview
          .connect(REVIEW_CREATOR_0)
          .addReview(
            params.score,
            params.subject,
            params.paymentToken,
            params.comment,
            params.metadata,
            params.attestationDetails,
            { value: reviewPrice },
          );

        expect(await ethosReview.numberOfReviewsBy(ReviewsBy.Subject, 3, ethers.ZeroHash)).to.equal(
          1,
          'wrong number of reviews for REVIEW_SUBJECT_0, 0',
        );
        expect(await ethosReview.numberOfReviewsBy(ReviewsBy.Subject, 4, ethers.ZeroHash)).to.equal(
          0,
          'wrong number of reviews for REVIEW_SUBJECT_1, 0',
        );

        // 1
        params = {
          score: Score.Positive,
          subject: REVIEW_SUBJECT_0,
          paymentToken: ethers.ZeroAddress,
          comment: defaultComment,
          metadata: defaultMetadata,
          attestationDetails: {
            account: '',
            service: '',
          } satisfies AttestationDetails,
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
            { value: reviewPrice },
          );

        expect(await ethosReview.numberOfReviewsBy(ReviewsBy.Subject, 3, ethers.ZeroHash)).to.equal(
          2,
          'wrong number of reviews for REVIEW_SUBJECT_0, 1',
        );
        expect(await ethosReview.numberOfReviewsBy(ReviewsBy.Subject, 4, ethers.ZeroHash)).to.equal(
          0,
          'wrong number of reviews for REVIEW_SUBJECT_1, 1',
        );

        // 2
        params = {
          score: Score.Positive,
          subject: REVIEW_SUBJECT_1,
          paymentToken: ethers.ZeroAddress,
          comment: defaultComment,
          metadata: defaultMetadata,
          attestationDetails: {
            account: '',
            service: '',
          } satisfies AttestationDetails,
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
            { value: reviewPrice },
          );

        expect(await ethosReview.numberOfReviewsBy(ReviewsBy.Subject, 3, ethers.ZeroHash)).to.equal(
          2,
          'wrong number of reviews for REVIEW_SUBJECT_0, 2',
        );
        expect(await ethosReview.numberOfReviewsBy(ReviewsBy.Subject, 4, ethers.ZeroHash)).to.equal(
          1,
          'wrong number of reviews for REVIEW_SUBJECT_1, 2',
        );
      });
    });

    describe('ReviewsBy.AttestationHash', () => {
      it('should return 0 if no reviews at all', async () => {
        const { ethosReview, ethosAttestation, SERVICE_X, ACCOUNT_NAME_BEN } =
          await loadFixture(deployFixture);

        const attestationHash = await ethosAttestation.getServiceAndAccountHash(
          SERVICE_X,
          ACCOUNT_NAME_BEN,
        );

        expect(
          await ethosReview.numberOfReviewsBy(
            ReviewsBy.AttestationHash,
            ethers.ZeroAddress,
            attestationHash,
          ),
        ).to.equal(0, 'wrong number of reviews');
      });

      it('should return correct number each time after multiple reviews', async () => {
        const {
          ethosReview,
          ethosAttestation,
          OTHER_0,
          EXPECTED_SIGNER,
          REVIEW_CREATOR_0,
          SERVICE_X,
          SERVICE_FB,
          ACCOUNT_NAME_BEN,
          ACCOUNT_NAME_IVAN,
          ADMIN,
          OWNER,
          ethosProfile,
        } = await loadFixture(deployFixture);

        const reviewPrice = ethers.parseEther('1.23456789');
        await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

        const attestationHashBenX = await ethosAttestation.getServiceAndAccountHash(
          SERVICE_X,
          ACCOUNT_NAME_BEN,
        );
        const attestationHashIvanFB = await ethosAttestation.getServiceAndAccountHash(
          SERVICE_FB,
          ACCOUNT_NAME_IVAN,
        );

        // 0
        let params = {
          score: Score.Positive,
          subject: ethers.ZeroAddress,
          paymentToken: ethers.ZeroAddress,
          comment: defaultComment,
          metadata: defaultMetadata,
          attestationDetails: {
            account: ACCOUNT_NAME_BEN,
            service: SERVICE_X,
          } satisfies AttestationDetails,
        };

        await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);
        const other0profileId = await inviteAndCreateProfile(ethosProfile, OWNER, OTHER_0);

        let signature = await common.signatureForCreateAttestation(
          other0profileId,
          '120843257',
          ACCOUNT_NAME_BEN,
          SERVICE_X,
          'test',
          EXPECTED_SIGNER,
        );

        await ethosAttestation
          .connect(OTHER_0)
          .createAttestation(
            other0profileId,
            '120843257',
            { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
            'test',
            signature,
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
            { value: reviewPrice },
          );

        expect(
          await ethosReview.numberOfReviewsBy(
            ReviewsBy.AttestationHash,
            ethers.ZeroAddress,
            attestationHashBenX,
          ),
        ).to.equal(1, 'wrong number of reviews for attestationHashBenX, 0');
        expect(
          await ethosReview.numberOfReviewsBy(
            ReviewsBy.AttestationHash,
            ethers.ZeroAddress,
            attestationHashIvanFB,
          ),
        ).to.equal(0, 'wrong number of reviews for attestationHashIvanFB, 0');

        // 1
        params = {
          score: Score.Positive,
          subject: ethers.ZeroAddress,
          paymentToken: ethers.ZeroAddress,
          comment: defaultComment,
          metadata: defaultMetadata,
          attestationDetails: {
            account: ACCOUNT_NAME_BEN,
            service: SERVICE_X,
          } satisfies AttestationDetails,
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
            { value: reviewPrice },
          );

        expect(
          await ethosReview.numberOfReviewsBy(
            ReviewsBy.AttestationHash,
            ethers.ZeroAddress,
            attestationHashBenX,
          ),
        ).to.equal(2, 'wrong number of reviews for attestationHashBenX, 1');
        expect(
          await ethosReview.numberOfReviewsBy(
            ReviewsBy.AttestationHash,
            ethers.ZeroAddress,
            attestationHashIvanFB,
          ),
        ).to.equal(0, 'wrong number of reviews for attestationHashIvanFB, 1');

        // 2
        params = {
          score: Score.Positive,
          subject: ethers.ZeroAddress,
          paymentToken: ethers.ZeroAddress,
          comment: defaultComment,
          metadata: defaultMetadata,
          attestationDetails: {
            account: ACCOUNT_NAME_IVAN,
            service: SERVICE_FB,
          } satisfies AttestationDetails,
        };

        signature = await common.signatureForCreateAttestation(
          other0profileId,
          '120843257',
          ACCOUNT_NAME_IVAN,
          SERVICE_FB,
          'test',
          EXPECTED_SIGNER,
        );

        await ethosAttestation
          .connect(OTHER_0)
          .createAttestation(
            other0profileId,
            '120843257',
            { account: ACCOUNT_NAME_IVAN, service: SERVICE_FB },
            'test',
            signature,
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
            { value: reviewPrice },
          );
        // All the attestation hashes get linked to the profile of the attestation creator ( OTHER_0)
        expect(
          await ethosReview.numberOfReviewsBy(
            ReviewsBy.AttestationHash,
            ethers.ZeroAddress,
            attestationHashBenX,
          ),
        ).to.equal(3, 'wrong number of reviews for attestationHashBenX, 2');
        expect(
          await ethosReview.numberOfReviewsBy(
            ReviewsBy.AttestationHash,
            ethers.ZeroAddress,
            attestationHashIvanFB,
          ),
        ).to.equal(3, 'wrong number of reviews for attestationHashIvanFB, 2');
      });
    });
  });

  describe('setReviewPrice', () => {
    it('should fail if not admin', async () => {
      const { ethosReview, REVIEW_CREATOR_0, PAYMENT_TOKEN_0 } = await loadFixture(deployFixture);

      await expect(
        ethosReview
          .connect(REVIEW_CREATOR_0)
          .setReviewPrice(true, await PAYMENT_TOKEN_0.getAddress(), ethers.parseEther('1')),
      )
        .to.be.revertedWithCustomError(ethosReview, 'AccessControlUnauthorizedAccount')
        .withArgs(REVIEW_CREATOR_0.address, await ethosReview.ADMIN_ROLE());
    });

    it('should set review price multiple times', async () => {
      const { ethosReview, ADMIN, PAYMENT_TOKEN_0 } = await loadFixture(deployFixture);

      const price0 = ethers.parseEther('1');
      await ethosReview
        .connect(ADMIN)
        .setReviewPrice(true, await PAYMENT_TOKEN_0.getAddress(), price0);

      expect((await ethosReview.reviewPrice(await PAYMENT_TOKEN_0.getAddress())).price).to.equal(
        price0,
        'wrong price for PAYMENT_TOKEN_0, 0',
      );
      expect((await ethosReview.reviewPrice(ethers.ZeroAddress)).price).to.equal(
        0,
        'wrong price for ZeroAddress, 2',
      );

      const price1 = ethers.parseEther('2');
      await ethosReview
        .connect(ADMIN)
        .setReviewPrice(true, await PAYMENT_TOKEN_0.getAddress(), price1);

      expect((await ethosReview.reviewPrice(await PAYMENT_TOKEN_0.getAddress())).price).to.equal(
        price1,
        'wrong price for PAYMENT_TOKEN_0, 1',
      );
      expect((await ethosReview.reviewPrice(ethers.ZeroAddress)).price).to.equal(
        0,
        'wrong price for ZeroAddress, 2',
      );

      const price2 = ethers.parseEther('3');
      await ethosReview.connect(ADMIN).setReviewPrice(true, ethers.ZeroAddress, price2);

      expect((await ethosReview.reviewPrice(await PAYMENT_TOKEN_0.getAddress())).price).to.equal(
        price1,
        'wrong price for PAYMENT_TOKEN_0, 2',
      );
      expect((await ethosReview.reviewPrice(ethers.ZeroAddress)).price).to.equal(
        price2,
        'wrong price for ZeroAddress, 2',
      );
    });

    it('should delete token data', async () => {
      const { ethosReview, ADMIN, PAYMENT_TOKEN_0 } = await loadFixture(deployFixture);

      const price0 = ethers.parseEther('1');
      await ethosReview
        .connect(ADMIN)
        .setReviewPrice(true, await PAYMENT_TOKEN_0.getAddress(), price0);

      expect((await ethosReview.reviewPrice(await PAYMENT_TOKEN_0.getAddress())).price).to.equal(
        price0,
        'wrong price for PAYMENT_TOKEN_0, 0',
      );

      await ethosReview.connect(ADMIN).setReviewPrice(false, await PAYMENT_TOKEN_0.getAddress(), 0);

      expect((await ethosReview.reviewPrice(await PAYMENT_TOKEN_0.getAddress())).price).to.equal(
        0,
        'wrong price for PAYMENT_TOKEN_0, 1',
      );
    });

    it('should transfer correct amount after price change for native coin', async () => {
      const { ethosReview, ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      // 0
      const price0 = ethers.parseEther('1.23456789');
      await ethosReview.connect(ADMIN).setReviewPrice(true, ethers.ZeroAddress, price0);

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview.connect(REVIEW_CREATOR_0).addReview(
        Score.Positive,
        REVIEW_SUBJECT_0,
        ethers.ZeroAddress,
        defaultComment,
        defaultMetadata,
        {
          account: '',
          service: '',
        },
        { value: price0 },
      );

      let balanceAfter = await ethers.provider.getBalance(await ethosReview.getAddress());

      expect(balanceAfter).to.equal(price0, 'wrong balance after price change, 0');

      // 1
      const price1 = ethers.parseEther('2.3456789');
      await ethosReview.connect(ADMIN).setReviewPrice(true, ethers.ZeroAddress, price1);

      await ethosReview.connect(REVIEW_CREATOR_0).addReview(
        Score.Positive,
        REVIEW_SUBJECT_0,
        ethers.ZeroAddress,
        defaultComment,
        defaultMetadata,
        {
          account: '',
          service: '',
        },
        { value: price1 },
      );

      balanceAfter = await ethers.provider.getBalance(await ethosReview.getAddress());

      expect(balanceAfter).to.equal(price0 + price1, 'wrong balance after price change, 1');
    });

    it('should transfer correct amount after price change for ERC20 token', async () => {
      const {
        ethosReview,
        ADMIN,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        PAYMENT_TOKEN_0,
        OWNER,
        ethosProfile,
      } = await loadFixture(deployFixture);

      await PAYMENT_TOKEN_0.mint(await REVIEW_CREATOR_0.getAddress(), ethers.parseEther('1000'));
      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_0).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );

      // 0
      const price0 = ethers.parseEther('1.23456789');
      await ethosReview
        .connect(ADMIN)
        .setReviewPrice(true, await PAYMENT_TOKEN_0.getAddress(), price0);

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          Score.Positive,
          REVIEW_SUBJECT_0,
          await PAYMENT_TOKEN_0.getAddress(),
          defaultComment,
          defaultMetadata,
          {
            account: '',
            service: '',
          },
        );

      let balanceAfter = await PAYMENT_TOKEN_0.balanceOf(await ethosReview.getAddress());

      expect(balanceAfter).to.equal(price0, 'wrong balance after price change, 0');

      // 1
      const price1 = ethers.parseEther('2.3456789');
      await ethosReview
        .connect(ADMIN)
        .setReviewPrice(true, await PAYMENT_TOKEN_0.getAddress(), price1);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          Score.Positive,
          REVIEW_SUBJECT_0,
          await PAYMENT_TOKEN_0.getAddress(),
          defaultComment,
          defaultMetadata,
          {
            account: '',
            service: '',
          },
        );

      balanceAfter = await PAYMENT_TOKEN_0.balanceOf(await ethosReview.getAddress());

      expect(balanceAfter).to.equal(price0 + price1, 'wrong balance after price change, 1');
    });
  });

  describe('withdrawFunds', () => {
    it('should fail if not owner', async () => {
      const { ethosReview, WRONG_ADDRESS_0 } = await loadFixture(deployFixture);

      await expect(ethosReview.connect(WRONG_ADDRESS_0).withdrawFunds(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(ethosReview, 'AccessControlUnauthorizedAccount')
        .withArgs(WRONG_ADDRESS_0.address, await ethosReview.OWNER_ROLE());
    });

    it('should increase receiver with correct amount for native coin', async () => {
      const { ethosReview, ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      // 0
      const price0 = ethers.parseEther('1.23456789');
      await ethosReview.connect(ADMIN).setReviewPrice(true, ethers.ZeroAddress, price0);

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview.connect(REVIEW_CREATOR_0).addReview(
        Score.Positive,
        REVIEW_SUBJECT_0,
        ethers.ZeroAddress,
        defaultComment,
        defaultMetadata,
        {
          account: '',
          service: '',
        },
        { value: price0 },
      );

      const balanceBefore = await ethers.provider.getBalance(OWNER.address);

      const receipt = await (
        await ethosReview.connect(OWNER).withdrawFunds(ethers.ZeroAddress)
      ).wait();

      if (!receipt) throw new Error('No receipt');

      const gasPrice = receipt.gasPrice;
      const gasUsed = receipt.gasUsed;
      const etherUsed = gasUsed * gasPrice;

      const balanceAfter = await ethers.provider.getBalance(OWNER.address);

      expect(balanceBefore + price0 - etherUsed).to.equal(
        balanceAfter,
        'wrong balance after withdraw',
      );
    });

    it('should set contract balance to 0 for native coin', async () => {
      const { ethosReview, ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      const price0 = ethers.parseEther('1.23456789');
      await ethosReview.connect(ADMIN).setReviewPrice(true, ethers.ZeroAddress, price0);

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview.connect(REVIEW_CREATOR_0).addReview(
        Score.Positive,
        REVIEW_SUBJECT_0,
        ethers.ZeroAddress,
        defaultComment,
        defaultMetadata,
        {
          account: '',
          service: '',
        },
        { value: price0 },
      );

      await ethosReview.connect(OWNER).withdrawFunds(ethers.ZeroAddress);

      expect(await ethers.provider.getBalance(await ethosReview.getAddress())).to.equal(
        0,
        'wrong balance after withdraw',
      );
    });

    it('should increase receiver with correct amount for ERC20 token', async () => {
      const {
        ethosReview,
        OWNER,
        ADMIN,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        PAYMENT_TOKEN_0,
        ethosProfile,
      } = await loadFixture(deployFixture);

      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_0.address, ethers.parseEther('1000'));
      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_0).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );

      const price0 = ethers.parseEther('1.23456789');
      await ethosReview
        .connect(ADMIN)
        .setReviewPrice(true, await PAYMENT_TOKEN_0.getAddress(), price0);

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          Score.Positive,
          REVIEW_SUBJECT_0,
          await PAYMENT_TOKEN_0.getAddress(),
          defaultComment,
          defaultMetadata,
          {
            account: '',
            service: '',
          },
        );

      const balanceBefore = await PAYMENT_TOKEN_0.balanceOf(OWNER.address);

      await ethosReview.connect(OWNER).withdrawFunds(await PAYMENT_TOKEN_0.getAddress());

      const balanceAfter = await PAYMENT_TOKEN_0.balanceOf(OWNER.address);

      expect(balanceBefore + price0).to.equal(balanceAfter, 'wrong balance after withdraw');
    });

    it('should set contract balance to 0 for ERC20 token', async () => {
      const {
        ethosReview,
        OWNER,
        ADMIN,
        REVIEW_CREATOR_0,
        REVIEW_SUBJECT_0,
        PAYMENT_TOKEN_0,
        ethosProfile,
      } = await loadFixture(deployFixture);

      await PAYMENT_TOKEN_0.mint(REVIEW_CREATOR_0.address, ethers.parseEther('1000'));
      await PAYMENT_TOKEN_0.connect(REVIEW_CREATOR_0).approve(
        await ethosReview.getAddress(),
        ethers.MaxUint256,
      );

      const price0 = ethers.parseEther('1.23456789');
      await ethosReview
        .connect(ADMIN)
        .setReviewPrice(true, await PAYMENT_TOKEN_0.getAddress(), price0);

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          Score.Positive,
          REVIEW_SUBJECT_0,
          await PAYMENT_TOKEN_0.getAddress(),
          defaultComment,
          defaultMetadata,
          {
            account: '',
            service: '',
          },
        );

      await ethosReview.connect(OWNER).withdrawFunds(await PAYMENT_TOKEN_0.getAddress());

      expect(await PAYMENT_TOKEN_0.balanceOf(await ethosReview.getAddress())).to.equal(
        0,
        'wrong balance after withdraw',
      );
    });
  });

  describe('targetExistsAndAllowedForId', () => {
    it('should return (true, true) if target exists and allowed for id', async () => {
      const { ethosReview, ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      const price = ethers.parseEther('1.23456789');
      await ethosReview.connect(ADMIN).setReviewPrice(true, ethers.ZeroAddress, price);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: '',
          service: '',
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: price },
        );

      const res = await ethosReview.targetExistsAndAllowedForId(0);

      expect(res[0]).to.equal(true, 'wrong res[0]');
      expect(res[1]).to.equal(true, 'wrong res[1]');
    });

    it('should return (true, true) if target exists but id is archived', async () => {
      const { ethosReview, ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      const price = ethers.parseEther('1.23456789');
      await ethosReview.connect(ADMIN).setReviewPrice(true, ethers.ZeroAddress, price);

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: '',
          service: '',
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: price },
        );

      await ethosReview.connect(REVIEW_CREATOR_0).archiveReview(0);

      const res = await ethosReview.targetExistsAndAllowedForId(0);

      expect(res[0]).to.equal(true, 'wrong res[0]');
      expect(res[1]).to.equal(true, 'wrong res[1]');
    });

    it('should return (false, false) if target does not exist', async () => {
      const { ethosReview, ADMIN, REVIEW_CREATOR_0, REVIEW_SUBJECT_0, OWNER, ethosProfile } =
        await loadFixture(deployFixture);

      const price = ethers.parseEther('1.23456789');
      await ethosReview.connect(ADMIN).setReviewPrice(true, ethers.ZeroAddress, price);

      let res = await ethosReview.targetExistsAndAllowedForId(1);

      expect(res[0]).to.equal(false, 'wrong res[0] before');
      expect(res[1]).to.equal(false, 'wrong res[1] before');

      const params = {
        score: Score.Positive,
        subject: REVIEW_SUBJECT_0,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: '',
          service: '',
        } satisfies AttestationDetails,
      };

      await inviteAndCreateProfile(ethosProfile, OWNER, REVIEW_CREATOR_0);

      await ethosReview
        .connect(REVIEW_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: price },
        );

      await ethosReview.connect(REVIEW_CREATOR_0).archiveReview(0);

      res = await ethosReview.targetExistsAndAllowedForId(1);

      expect(res[0]).to.equal(false, 'wrong res[0] after');
      expect(res[1]).to.equal(false, 'wrong res[1] after');
    });
  });
});
