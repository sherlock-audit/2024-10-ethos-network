import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { zeroAddress } from 'viem';
import { type EthosReview } from '../typechain-types/index.js';
import { common } from './utils/common.js';
import { smartContractNames } from './utils/mock.names.js';
import { inviteAndCreateProfile } from './utils/profileCreation.js';

const { ethers } = hre;

describe('EthosReview', () => {
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
      await inviteAndCreateProfile(ethosProfile, OWNER, WRONG_ADDRESS_0);

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
        .to.be.revertedWithCustomError(ethosReview, 'UnauthorizedEdit')
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
        .to.be.revertedWithCustomError(ethosReview, 'UnauthorizedEdit')
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
