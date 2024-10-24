import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { smartContractNames } from '../src';

describe('EthosVouch', () => {
  const DEFAULT_COMMENT = 'default comment';
  const DEFAULT_METADATA = '{ "someKey": "someValue" }';
  const DEFAULT_VOUCH_AMOUNT = { value: ethers.parseEther('0.0001') };

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
      PROFILE_CREATOR_0,
      PROFILE_CREATOR_1,
      REVIEW_CREATOR_0,
      REVIEW_CREATOR_1,
      REVIEW_SUBJECT_0,
      REVIEW_SUBJECT_1,
      VOTER_0,
      VOTER_1,
      VOUCHER_0,
      VOUCHER_1,
      FEE_PROTOCOL_ACC,
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

    const weth9 = await ethers.deployContract('WETH9', []);

    const vouch = await ethers.getContractFactory('EthosVouch');
    const vouchImplementation = await ethers.deployContract('EthosVouch', []);
    const vouchImpAddress = await vouchImplementation.getAddress();
    const ethosVouchProxy = await ERC1967Proxy.deploy(
      vouchImpAddress,
      vouch.interface.encodeFunctionData('initialize', [
        OWNER.address,
        ADMIN.address,
        EXPECTED_SIGNER.address,
        signatureVerifierAddress,
        contractAddressManagerAddress,
        await weth9.getAddress(),
      ]),
    );

    await ethosVouchProxy.waitForDeployment();
    const ethosVouchAddress = await ethosVouchProxy.getAddress();
    const ethosVouch = await ethers.getContractAt('EthosVouch', ethosVouchAddress);

    const feeProtocolAddress = await FEE_PROTOCOL_ACC.getAddress();

    const entryfeeProtocolBasisPoint = 100n; // 1%
    const entryfeeDonationBasisPoint = 100n; // 1%
    const entryfeeVouchersPoolBasisPoint = 300n; // 3%
    const exitFeeBasisPoint = 100n; // 1%

    const vaultManager = await ethers.getContractFactory('EthosVaultManager');
    const vaultManagerImplementation = await ethers.deployContract('EthosVaultManager', []);

    const ethosVaultManagerImpAddress = await vaultManagerImplementation.getAddress();
    const ethosVaultManagerProxy = await ERC1967Proxy.deploy(
      ethosVaultManagerImpAddress,
      vaultManager.interface.encodeFunctionData('initialize', [
        OWNER.address,
        ADMIN.address,
        EXPECTED_SIGNER.address,
        signatureVerifierAddress,
        contractAddressManagerAddress,
        feeProtocolAddress,
        entryfeeProtocolBasisPoint,
        entryfeeDonationBasisPoint,
        entryfeeVouchersPoolBasisPoint,
        exitFeeBasisPoint,
      ]),
    );

    await ethosVaultManagerProxy.waitForDeployment();
    const ethosVaultManagerAddress = await ethosVaultManagerProxy.getAddress();
    const ethosVaultManager = await ethers.getContractAt(
      'EthosVaultManager',
      ethosVaultManagerAddress,
    );

    const ethosVaultFactory = await ethers.deployContract('EthosVaultFactory', []);
    const ethosVaultFactoryAddress = await ethosVaultFactory.getAddress();

    const ethosEscrow = await ethers.deployContract('EthosEscrow', [contractAddressManagerAddress]);
    const ethosEscrowAddress = await ethosEscrow.getAddress();
    const slash = await ethers.getContractFactory('EthosSlashPenalty');
    const slashImplementation = await ethers.deployContract('EthosSlashPenalty', []);
    const slashImpAddress = await slashImplementation.getAddress();
    const ethosSlashPenaltyProxy = await ERC1967Proxy.deploy(
      slashImpAddress,
      slash.interface.encodeFunctionData('initialize', [
        OWNER.address,
        ADMIN.address,
        EXPECTED_SIGNER.address,
        signatureVerifierAddress,
        contractAddressManagerAddress,
      ]),
    );

    await ethosSlashPenaltyProxy.waitForDeployment();
    const ethosSlashPenaltyAddress = await ethosSlashPenaltyProxy.getAddress();

    const rejectContract = await ethers.deployContract('RejectETHReceiver');
    const rejectETHAddr = await rejectContract.getAddress();

    // update Smart Contracts

    await contractAddressManager.updateContractAddressesForNames(
      [
        ethosAttestationAddress,
        ethosProfileAddress,
        ethosReviewAddress,
        ethosVoteAddress,
        ethosVouchAddress,
        interactionControlAddress,
        ethosVaultManagerAddress,
        ethosVaultFactoryAddress,
        ethosSlashPenaltyAddress,
        ethosEscrowAddress,
      ],
      [
        smartContractNames.attestation,
        smartContractNames.profile,
        smartContractNames.review,
        smartContractNames.vote,
        smartContractNames.vouch,
        smartContractNames.interactionControl,
        smartContractNames.vaultManager,
        smartContractNames.vaultFactory,
        smartContractNames.slashPenalty,
        smartContractNames.escrow,
      ],
    );

    await interactionControl.addControlledContractNames([
      smartContractNames.attestation,
      smartContractNames.profile,
      smartContractNames.review,
      smartContractNames.vote,
      smartContractNames.vouch,
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

    await PAYMENT_TOKEN_0.mint(VOUCHER_0.address, ethers.parseEther('10'));
    await PAYMENT_TOKEN_0.mint(VOUCHER_1.address, ethers.parseEther('10'));
    await PAYMENT_TOKEN_0.mint(OTHER_0.address, ethers.parseEther('10'));
    await PAYMENT_TOKEN_0.connect(VOUCHER_0).approve(
      await ethosVouch.getAddress(),
      ethers.MaxUint256,
    );
    await PAYMENT_TOKEN_0.connect(VOUCHER_1).approve(
      await ethosVouch.getAddress(),
      ethers.MaxUint256,
    );
    await PAYMENT_TOKEN_0.connect(OTHER_0).approve(
      await ethosVouch.getAddress(),
      ethers.MaxUint256,
    );
    const PAYMENT_TOKEN_1 = await ethers.deployContract('PaymentToken', [
      'PAYMENT TOKEN NAME 1',
      'PTN 1',
    ]);
    await PAYMENT_TOKEN_1.mint(VOUCHER_0.address, ethers.parseEther('10'));
    await PAYMENT_TOKEN_1.mint(VOUCHER_1.address, ethers.parseEther('10'));
    await PAYMENT_TOKEN_1.connect(VOUCHER_0).approve(
      await ethosVouch.getAddress(),
      ethers.MaxUint256,
    );
    await PAYMENT_TOKEN_1.connect(VOUCHER_1).approve(
      await ethosVouch.getAddress(),
      ethers.MaxUint256,
    );
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
      PROFILE_CREATOR_0,
      PROFILE_CREATOR_1,
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

      PAYMENT_TOKEN_1,
      VOTER_0,
      VOTER_1,
      VOUCHER_0,
      VOUCHER_1,
      signatureVerifier,
      interactionControl,
      ethosAttestation,
      ethosProfile,
      ethosReview,
      ethosVote,
      ethosVouch,
      ethosVaultManager,
      contractAddressManager,
      weth9,
      rejectETHAddr,
      ERC1967Proxy,
      provider,
    };
  }

  describe('upgradeable', () => {
    it('should fail if upgraded not by owner', async () => {
      const { ADMIN, ethosVouch } = await loadFixture(deployFixture);

      const implementation = await ethers.deployContract('EthosVouch', []);
      const implementationAddress = await implementation.getAddress();

      await expect(
        ethosVouch.connect(ADMIN).upgradeToAndCall(implementationAddress, '0x'),
      ).to.be.revertedWithCustomError(ethosVouch, 'AccessControlUnauthorizedAccount');
    });

    it('should fail if upgraded contract is zero address', async () => {
      const { OWNER, ethosVouch } = await loadFixture(deployFixture);

      await expect(
        ethosVouch.connect(OWNER).upgradeToAndCall(ethers.ZeroAddress, '0x'),
      ).to.be.revertedWithCustomError(ethosVouch, 'ZeroAddress');
    });

    it('should upgrade to new implementation address', async () => {
      const { OWNER, ethosVouch, provider } = await loadFixture(deployFixture);
      const proxyAddr = await ethosVouch.getAddress();

      const implementation = await ethers.deployContract('EthosVouch', []);
      const implementationAddress = await implementation.getAddress();
      await ethosVouch.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);
    });

    it('should persist storage after upgrade', async () => {
      const { ethosVouch, OWNER, provider } = await loadFixture(deployFixture);

      const proxyAddr = await ethosVouch.getAddress();

      const implementation = await ethers.deployContract('EthosVouchMock', []);
      const implementationAddress = await implementation.getAddress();
      await ethosVouch.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);
    });

    it('should upgrade and enable new storage', async () => {
      const { OWNER, ethosVouch, provider } = await loadFixture(deployFixture);
      const proxyAddr = await ethosVouch.getAddress();

      const implementation = await ethers.deployContract('EthosVouchMock', []);
      const implementationAddress = await implementation.getAddress();
      await ethosVouch.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);

      const proxy = await ethers.getContractAt('EthosVouchMock', proxyAddr);
      await proxy.setTestValue(22);
      const testValue = await proxy.testValue();
      expect(testValue).to.equal(22);
    });

    it('should revert calling initialize a second time', async () => {
      const {
        OWNER,
        ethosVouch,
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        contractAddressManager,
      } = await loadFixture(deployFixture);

      const Vouch = await ethers.getContractFactory('EthosVouchMock');
      const implementation = await ethers.deployContract('EthosVouchMock', []);
      const implementationAddress = await implementation.getAddress();
      await expect(
        ethosVouch
          .connect(OWNER)
          .upgradeToAndCall(
            implementationAddress,
            Vouch.interface.encodeFunctionData('initialize', [
              OWNER.address,
              ADMIN.address,
              EXPECTED_SIGNER.address,
              await signatureVerifier.getAddress(),
              await contractAddressManager.getAddress(),
              ADMIN.address,
            ]),
          ),
      ).to.revertedWithCustomError(ethosVouch, 'InvalidInitialization');
    });
  });

  describe('constructor', () => {
    it('should set correct initial params', async () => {
      const {
        OWNER,
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        ethosVouch,
        contractAddressManager,
      } = await loadFixture(deployFixture);

      const OWNER_ROLE = await ethosVouch.OWNER_ROLE();
      expect(await ethosVouch.getRoleMember(OWNER_ROLE, 0)).to.equal(OWNER.address, 'Wrong owner');

      const ADMIN_ROLE = await ethosVouch.ADMIN_ROLE();
      expect(await ethosVouch.getRoleMember(ADMIN_ROLE, 0)).to.equal(ADMIN.address, 'Wrong admin');

      expect(await ethosVouch.expectedSigner()).to.equal(
        EXPECTED_SIGNER.address,
        'Wrong expectedSigner',
      );

      expect(await ethosVouch.signatureVerifier()).to.equal(
        await signatureVerifier.getAddress(),
        'Wrong signatureVerifier',
      );

      expect(await ethosVouch.unhealthyResponsePeriod()).to.equal(
        time.duration.hours(24),
        'Wrong unhealthyResponsePeriod',
      );

      expect(await ethosVouch.contractAddressManager()).to.equal(
        await contractAddressManager.getAddress(),
        'Wrong contractAddressManager',
      );
    });

    describe('updateUnhealthyResponsePeriod', () => {
      it('should fail if not an admin', async () => {
        const { ethosVouch, OTHER_0 } = await loadFixture(deployFixture);

        await expect(ethosVouch.connect(OTHER_0).updateUnhealthyResponsePeriod(100))
          .to.be.revertedWithCustomError(ethosVouch, 'AccessControlUnauthorizedAccount')
          .withArgs(OTHER_0.address, await ethosVouch.ADMIN_ROLE());
      });

      it('should set correct unhealthyResponsePeriod', async () => {
        const { ethosVouch, ADMIN } = await loadFixture(deployFixture);

        await ethosVouch.connect(ADMIN).updateUnhealthyResponsePeriod(100);
        expect(await ethosVouch.unhealthyResponsePeriod()).to.equal(
          100,
          'Wrong unhealthyResponsePeriod, 0',
        );

        await ethosVouch.connect(ADMIN).updateUnhealthyResponsePeriod(ethers.parseEther('1'));
        expect(await ethosVouch.unhealthyResponsePeriod()).to.equal(
          ethers.parseEther('1'),
          'Wrong unhealthyResponsePeriod, 1',
        );

        await ethosVouch.connect(ADMIN).updateUnhealthyResponsePeriod(0);
        expect(await ethosVouch.unhealthyResponsePeriod()).to.equal(
          0,
          'Wrong unhealthyResponsePeriod, 2',
        );
      });
    });

    describe('vouchByProfileId', () => {
      it('should fail if no profile', async () => {
        const { ethosVouch, VOUCHER_0, ethosProfile, OWNER } = await loadFixture(deployFixture);

        await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
        await ethosProfile.connect(VOUCHER_0).createProfile(1);

        await expect(
          ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(3, DEFAULT_COMMENT, DEFAULT_METADATA, DEFAULT_VOUCH_AMOUNT),
        )
          .to.be.revertedWithCustomError(ethosVouch, 'InvalidEthosProfileForVouch')
          .withArgs(3);
      });

      it('should fail if profile is archived', async () => {
        const {
          ethosVouch,
          PROFILE_CREATOR_0,
          PROFILE_CREATOR_1,
          OTHER_0,
          VOUCHER_0,

          ethosProfile,
          OWNER,
        } = await loadFixture(deployFixture);

        await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
        await ethosProfile.connect(VOUCHER_0).createProfile(1);

        // create a profile
        await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
        await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
        await ethosProfile.connect(PROFILE_CREATOR_0).archiveProfile();

        await expect(
          ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(3, DEFAULT_COMMENT, DEFAULT_METADATA, DEFAULT_VOUCH_AMOUNT),
        )
          .to.be.revertedWithCustomError(ethosVouch, 'InvalidEthosProfileForVouch')
          .withArgs(3);

        // test more profiles
        await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
        await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
        await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
        await ethosProfile.connect(OTHER_0).createProfile(1);
        await ethosProfile.connect(OTHER_0).archiveProfile();

        await expect(
          ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(5, DEFAULT_COMMENT, DEFAULT_METADATA, DEFAULT_VOUCH_AMOUNT),
        )
          .to.be.revertedWithCustomError(ethosVouch, 'InvalidEthosProfileForVouch')
          .withArgs(5);
      });

      it('should fail if no profile for the author', async () => {
        const { ethosVouch, PROFILE_CREATOR_0, VOUCHER_0, ethosProfile, OWNER } =
          await loadFixture(deployFixture);

        // create a profile
        await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
        await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

        await expect(
          ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(1, DEFAULT_COMMENT, DEFAULT_METADATA, DEFAULT_VOUCH_AMOUNT),
        )
          .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress')
          .withArgs(await VOUCHER_0.getAddress());
      });

      it('should fail AlreadyVouched for profile index 0', async () => {
        const { ethosVouch, PROFILE_CREATOR_0, VOUCHER_0, ethosProfile, OWNER } =
          await loadFixture(deployFixture);

        const PAYMENT_AMOUNT = ethers.parseEther('0.01');

        // create a profile
        await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
        await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
        await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
        await ethosProfile.connect(VOUCHER_0).createProfile(1);

        await ethosVouch.connect(VOUCHER_0).vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, {
          value: PAYMENT_AMOUNT,
        });

        await expect(
          ethosVouch.connect(VOUCHER_0).vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, {
            value: PAYMENT_AMOUNT,
          }),
        )
          .to.be.revertedWithCustomError(ethosVouch, 'AlreadyVouched')
          .withArgs(3, 2);
      });

      it('should fail AlreadyVouched for profile index 1', async () => {
        const { ethosVouch, PROFILE_CREATOR_0, VOUCHER_0, ethosProfile, OWNER } =
          await loadFixture(deployFixture);

        const PAYMENT_AMOUNT = ethers.parseEther('0.01');

        // create a profile
        await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
        await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
        await ethosProfile.connect(VOUCHER_0).createProfile(1);
        await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

        await ethosVouch.connect(VOUCHER_0).vouchByProfileId(3, DEFAULT_COMMENT, DEFAULT_METADATA, {
          value: PAYMENT_AMOUNT,
        });

        await expect(
          ethosVouch.connect(VOUCHER_0).vouchByProfileId(3, DEFAULT_COMMENT, DEFAULT_METADATA, {
            value: PAYMENT_AMOUNT,
          }),
        )
          .to.be.revertedWithCustomError(ethosVouch, 'AlreadyVouched')
          .withArgs(2, 3);
      });

      it('should fail if SelfVouch for profile index 0', async () => {
        const { ethosVouch, PROFILE_CREATOR_0, ethosProfile, OWNER } =
          await loadFixture(deployFixture);

        // create a profile
        await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
        await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

        await expect(
          ethosVouch
            .connect(PROFILE_CREATOR_0)
            .vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, DEFAULT_VOUCH_AMOUNT),
        )
          .to.be.revertedWithCustomError(ethosVouch, 'SelfVouch')
          .withArgs(2, 2);
      });

      it('should fail if SelfVouch for profile index 2', async () => {
        const {
          ethosVouch,
          PROFILE_CREATOR_0,
          PROFILE_CREATOR_1,
          OTHER_0,
          OTHER_1,

          ethosProfile,
          OWNER,
        } = await loadFixture(deployFixture);

        // create multiple profiles
        await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
        await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
        await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
        await ethosProfile.connect(OWNER).inviteAddress(OTHER_1.address);
        await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
        await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
        await ethosProfile.connect(OTHER_0).createProfile(1);
        await ethosProfile.connect(OTHER_1).createProfile(1);

        await expect(
          ethosVouch
            .connect(OTHER_0)
            .vouchByProfileId(4, DEFAULT_COMMENT, DEFAULT_METADATA, DEFAULT_VOUCH_AMOUNT),
        )
          .to.be.revertedWithCustomError(ethosVouch, 'SelfVouch')
          .withArgs(4, 4);
      });

      it('should push correct id to vouchIdsByAuthor for multiple vouches for native coin', async () => {
        const {
          ethosVouch,
          PROFILE_CREATOR_0,
          PROFILE_CREATOR_1,
          VOUCHER_0,
          VOUCHER_1,
          ethosProfile,
          OWNER,
        } = await loadFixture(deployFixture);

        let PAYMENT_AMOUNT = ethers.parseEther('0.0123');

        // create a profile
        await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
        await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
        await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
        await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_1.address);
        await ethosProfile.connect(VOUCHER_0).createProfile(1);
        await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
        await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
        await ethosProfile.connect(VOUCHER_1).createProfile(1);

        // 0
        await ethosVouch.connect(VOUCHER_0).vouchByProfileId(3, DEFAULT_COMMENT, DEFAULT_METADATA, {
          value: PAYMENT_AMOUNT,
        });

        let vouches = await ethosVouch.vouchesByAuthorInRange(2, 0, 1);
        expect(vouches[0].vouchId).to.equal(0, 'Wrong vouchId, 0');

        // 1
        PAYMENT_AMOUNT = ethers.parseEther('0.0123456');

        await ethosVouch.connect(VOUCHER_0).vouchByProfileId(4, DEFAULT_COMMENT, DEFAULT_METADATA, {
          value: PAYMENT_AMOUNT,
        });

        vouches = await ethosVouch.vouchesByAuthorInRange(2, 0, 2);
        expect(vouches[1].vouchId).to.equal(1, 'Wrong vouchId, 1');

        // 2
        PAYMENT_AMOUNT = ethers.parseEther('0.0123456789');

        await ethosVouch.connect(VOUCHER_0).vouchByProfileId(5, DEFAULT_COMMENT, DEFAULT_METADATA, {
          value: PAYMENT_AMOUNT,
        });

        vouches = await ethosVouch.vouchesByAuthorInRange(2, 0, 110);
        expect(vouches[2].vouchId).to.equal(2, 'Wrong vouchId, 2');
      });

      it('should increase vouchCount', async () => {
        const {
          ethosVouch,
          PROFILE_CREATOR_0,
          PROFILE_CREATOR_1,
          VOUCHER_0,
          VOUCHER_1,
          ethosProfile,
          OWNER,
        } = await loadFixture(deployFixture);

        // create a profile
        await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
        await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
        await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
        await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_1.address);
        await ethosProfile.connect(VOUCHER_0).createProfile(1);
        await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
        await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
        await ethosProfile.connect(VOUCHER_1).createProfile(1);

        // 0
        await ethosVouch.connect(VOUCHER_0).vouchByProfileId(3, DEFAULT_COMMENT, DEFAULT_METADATA, {
          value: ethers.parseEther('0.0123'),
        });

        expect(await ethosVouch.vouchCount()).to.equal(1, 'Wrong vouchCount, 0');

        // 1
        await ethosVouch.connect(VOUCHER_1).vouchByProfileId(4, DEFAULT_COMMENT, DEFAULT_METADATA, {
          value: ethers.parseEther('0.0234'),
        });

        expect(await ethosVouch.vouchCount()).to.equal(2, 'Wrong vouchCount, 1');
      });
    });

    describe('vouchByAddress', () => {
      it('should revert if vouching for a profile that does not exist', async () => {
        const { ethosVouch, ethosProfile, ADMIN, VOUCHER_0, PROFILE_CREATOR_0, OWNER } =
          await loadFixture(deployFixture);

        await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
        await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);

        await ethosProfile.connect(VOUCHER_0).createProfile(1);

        // 0
        await expect(
          ethosVouch
            .connect(VOUCHER_0)
            .vouchByAddress(
              await PROFILE_CREATOR_0.getAddress(),
              DEFAULT_COMMENT,
              DEFAULT_METADATA,
            ),
        )
          .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress')
          .withArgs(await PROFILE_CREATOR_0.getAddress());

        // 1
        await expect(
          ethosVouch
            .connect(VOUCHER_0)
            .vouchByAddress(await ADMIN.getAddress(), DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.01'),
            }),
        )
          .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress')
          .withArgs(await ADMIN.getAddress());

        // 2
        await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

        await expect(
          ethosVouch
            .connect(VOUCHER_0)
            .vouchByAddress(
              await PROFILE_CREATOR_0.getAddress(),
              DEFAULT_COMMENT,
              DEFAULT_METADATA,
              { value: ethers.parseEther('0.01') },
            ),
        ).not.to.be.reverted;
      });

      it('should revert if vouching for zero address', async () => {
        const { ethosVouch, ethosProfile, VOUCHER_0, PROFILE_CREATOR_0, OWNER } =
          await loadFixture(deployFixture);

        await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
        await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);

        await ethosProfile.connect(VOUCHER_0).createProfile(1);

        // 0
        await expect(
          ethosVouch
            .connect(VOUCHER_0)
            .vouchByAddress(ethers.ZeroAddress, DEFAULT_COMMENT, DEFAULT_METADATA),
        ).to.be.revertedWithCustomError(ethosVouch, 'ZeroAddress');
      });

      describe('unvouch', () => {
        it('should revert if VouchNotFound', async () => {
          const { ethosVouch, VOUCHER_0, ethosProfile, OWNER } = await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);

          await expect(ethosVouch.connect(VOUCHER_0).unvouch(0))
            .to.be.revertedWithCustomError(ethosVouch, 'VouchNotFound')
            .withArgs(0);

          await expect(ethosVouch.connect(VOUCHER_0).unvouch(11))
            .to.be.revertedWithCustomError(ethosVouch, 'VouchNotFound')
            .withArgs(11);
        });

        it('should revert if NotVoterForVouch', async () => {
          const {
            ethosVouch,
            VOUCHER_0,
            VOUCHER_1,
            PROFILE_CREATOR_0,
            PROFILE_CREATOR_1,
            OTHER_0,
            ethosProfile,
            OWNER,
          } = await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_1.address);
          await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(VOUCHER_1).createProfile(1);
          await ethosProfile.connect(OTHER_0).createProfile(1);

          // 0
          await ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(5, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          await expect(ethosVouch.connect(VOUCHER_1).unvouch(0))
            .to.be.revertedWithCustomError(ethosVouch, 'NotAuthorForVouch')
            .withArgs(0, 5);

          await expect(ethosVouch.connect(OTHER_0).unvouch(0))
            .to.be.revertedWithCustomError(ethosVouch, 'NotAuthorForVouch')
            .withArgs(0, 6);

          // 1
          await ethosVouch
            .connect(VOUCHER_1)
            .vouchByProfileId(3, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123456'),
            });

          await expect(ethosVouch.connect(VOUCHER_0).unvouch(1))
            .to.be.revertedWithCustomError(ethosVouch, 'NotAuthorForVouch')
            .withArgs(1, 4);

          await expect(ethosVouch.connect(OTHER_0).unvouch(1))
            .to.be.revertedWithCustomError(ethosVouch, 'NotAuthorForVouch')
            .withArgs(1, 6);
        });

        it('should revert if AlreadyUnvouched', async () => {
          const { ethosVouch, VOUCHER_0, PROFILE_CREATOR_0, ethosProfile, OWNER } =
            await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);

          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);

          await ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(1, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          await ethosVouch.connect(VOUCHER_0).unvouch(0);

          await expect(ethosVouch.connect(VOUCHER_0).unvouch(0))
            .to.be.revertedWithCustomError(ethosVouch, 'AlreadyUnvouched')
            .withArgs(0);
        });

        it('should set archived to true', async () => {
          const { ethosVouch, VOUCHER_0, PROFILE_CREATOR_0, ethosProfile, OWNER } =
            await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);

          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

          await ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(3, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          expect((await ethosVouch.vouches(0)).archived).to.equal(false, 'Wrong archived before');

          await ethosVouch.connect(VOUCHER_0).unvouch(0);

          expect((await ethosVouch.vouches(0)).archived).to.equal(true, 'Wrong archived after');
        });

        it('should set unvouchedAt to correct time', async () => {
          const { ethosVouch, VOUCHER_0, PROFILE_CREATOR_0, ethosProfile, OWNER } =
            await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

          await ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(3, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          await ethosVouch.connect(VOUCHER_0).unvouch(0);
          const unvouchedTime = await time.latest();

          expect((await ethosVouch.vouches(0)).activityCheckpoints.unvouchedAt).to.equal(
            unvouchedTime,
            'Wrong unvouchedAt',
          );
        });
      });

      describe('markUnhealthy', () => {
        it('Should revert if VouchNotFound', async () => {
          const { ethosVouch, ethosProfile, VOUCHER_0, PROFILE_CREATOR_0, OWNER } =
            await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

          await expect(ethosVouch.connect(VOUCHER_0).markUnhealthy(0))
            .to.be.revertedWithCustomError(ethosVouch, 'VouchNotFound')
            .withArgs(0);

          await expect(ethosVouch.connect(VOUCHER_0).markUnhealthy(11))
            .to.be.revertedWithCustomError(ethosVouch, 'VouchNotFound')
            .withArgs(11);
        });

        it('Should revert if CannotMarkVouchAsUnhealthy, unhealthyResponsePeriod has passed', async () => {
          const { ethosVouch, VOUCHER_0, PROFILE_CREATOR_0, ethosProfile, OWNER } =
            await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

          await ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(3, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          await ethosVouch.connect(VOUCHER_0).unvouch(0);

          await time.increase(100);

          await time.increase(await ethosVouch.unhealthyResponsePeriod());

          await expect(ethosVouch.connect(VOUCHER_0).markUnhealthy(0))
            .to.be.revertedWithCustomError(ethosVouch, 'CannotMarkVouchAsUnhealthy')
            .withArgs(0);
        });

        it('Should revert if NotVoterForVouch', async () => {
          const {
            ethosVouch,
            VOUCHER_0,
            VOUCHER_1,
            PROFILE_CREATOR_0,
            PROFILE_CREATOR_1,
            OTHER_0,
            ethosProfile,
            OWNER,
          } = await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_1.address);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(VOUCHER_1).createProfile(1);

          await ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          await ethosVouch
            .connect(VOUCHER_1)
            .vouchByProfileId(1, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123456'),
            });

          await time.increase(100);
          await ethosVouch.connect(VOUCHER_0).unvouch(0);
          await ethosVouch.connect(VOUCHER_1).unvouch(1);

          await expect(ethosVouch.connect(VOUCHER_1).markUnhealthy(0))
            .to.be.revertedWithCustomError(ethosVouch, 'NotAuthorForVouch')
            .withArgs(0, 5);

          await expect(ethosVouch.connect(VOUCHER_0).markUnhealthy(1))
            .to.be.revertedWithCustomError(ethosVouch, 'NotAuthorForVouch')
            .withArgs(1, 4);

          await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
          await ethosProfile.connect(OTHER_0).createProfile(1);

          await expect(ethosVouch.connect(OTHER_0).markUnhealthy(0))
            .to.be.revertedWithCustomError(ethosVouch, 'NotAuthorForVouch')
            .withArgs(0, 6);

          await expect(ethosVouch.connect(OTHER_0).markUnhealthy(1))
            .to.be.revertedWithCustomError(ethosVouch, 'NotAuthorForVouch')
            .withArgs(1, 6);
        });

        it('Should set unhealthy to true for multiple vouches', async () => {
          const {
            ethosVouch,
            VOUCHER_0,
            VOUCHER_1,
            PROFILE_CREATOR_0,
            PROFILE_CREATOR_1,
            OTHER_0,
            ethosProfile,
            OWNER,
          } = await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_1.address);
          await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(VOUCHER_1).createProfile(1);
          await ethosProfile.connect(OTHER_0).createProfile(1);

          await ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          await ethosVouch
            .connect(VOUCHER_1)
            .vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123456'),
            });

          await ethosVouch.connect(OTHER_0).vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, {
            value: ethers.parseEther('0.0123456789'),
          });

          expect((await ethosVouch.vouches(0)).unhealthy).to.equal(
            false,
            'Wrong unhealthy 0, before',
          );
          expect((await ethosVouch.vouches(1)).unhealthy).to.equal(
            false,
            'Wrong unhealthy 1, before',
          );
          expect((await ethosVouch.vouches(1)).unhealthy).to.equal(
            false,
            'Wrong unhealthy 2, before',
          );

          await time.increase(100);
          await ethosVouch.connect(VOUCHER_0).unvouch(0);
          await ethosVouch.connect(VOUCHER_1).unvouch(1);
          await ethosVouch.connect(OTHER_0).unvouch(2);

          await ethosVouch.connect(VOUCHER_0).markUnhealthy(0);
          expect((await ethosVouch.vouches(0)).unhealthy).to.equal(
            true,
            'Wrong unhealthy 0, after',
          );

          await ethosVouch.connect(VOUCHER_1).markUnhealthy(1);
          expect((await ethosVouch.vouches(1)).unhealthy).to.equal(
            true,
            'Wrong unhealthy 1, after',
          );

          await ethosVouch.connect(OTHER_0).markUnhealthy(2);
          expect((await ethosVouch.vouches(2)).unhealthy).to.equal(
            true,
            'Wrong unhealthy 2, after',
          );

          expect((await ethosVouch.vouches(0)).unhealthy).to.equal(
            true,
            'Wrong unhealthy 0, after',
          );
          expect((await ethosVouch.vouches(1)).unhealthy).to.equal(
            true,
            'Wrong unhealthy 1, after',
          );
          expect((await ethosVouch.vouches(1)).unhealthy).to.equal(
            true,
            'Wrong unhealthy 2, after',
          );
        });

        it('Should set unhealthyAt to correct time', async () => {
          const {
            ethosVouch,
            VOUCHER_0,
            VOUCHER_1,
            PROFILE_CREATOR_0,
            PROFILE_CREATOR_1,
            ethosProfile,
            OWNER,
          } = await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_1.address);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(VOUCHER_1).createProfile(1);

          await ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          await ethosVouch
            .connect(VOUCHER_1)
            .vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123456'),
            });

          await time.increase(100);
          await ethosVouch.connect(VOUCHER_0).unvouch(0);

          await ethosVouch.connect(VOUCHER_1).unvouch(1);
          await time.increase(100);

          // 0
          await ethosVouch.connect(VOUCHER_0).markUnhealthy(0);
          const timeUnvouched0 = await time.latest();
          await time.increase(100);

          expect((await ethosVouch.vouches(0)).activityCheckpoints.unhealthyAt).to.equal(
            timeUnvouched0,
            'Wrong unhealthyAt 0, after',
          );

          // 1
          await ethosVouch.connect(VOUCHER_1).markUnhealthy(1);
          const timeUnvouched1 = await time.latest();
          await time.increase(100);

          expect((await ethosVouch.vouches(1)).activityCheckpoints.unhealthyAt).to.equal(
            timeUnvouched1,
            'Wrong unhealthyAt 1, after',
          );
        });

        it('Should emit MarkedUnhealthy event', async () => {
          const {
            ethosVouch,
            VOUCHER_0,
            VOUCHER_1,
            PROFILE_CREATOR_0,
            PROFILE_CREATOR_1,
            ethosProfile,
            OWNER,
          } = await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_1.address);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
          await ethosProfile.connect(VOUCHER_1).createProfile(1);

          await ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(3, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          await ethosVouch
            .connect(VOUCHER_1)
            .vouchByProfileId(4, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123456'),
            });

          await time.increase(100);
          await ethosVouch.connect(VOUCHER_0).unvouch(0);
          await ethosVouch.connect(VOUCHER_1).unvouch(1);

          await expect(ethosVouch.connect(VOUCHER_0).markUnhealthy(0))
            .to.emit(ethosVouch, 'MarkedUnhealthy')
            .withArgs(0, 2, 3);

          await expect(ethosVouch.connect(VOUCHER_1).markUnhealthy(1))
            .to.emit(ethosVouch, 'MarkedUnhealthy')
            .withArgs(1, 5, 4);
        });
      });

      describe('targetExistsAndAllowedForId', () => {
        it('should return false, false if no vouch id', async () => {
          const { ethosVouch } = await loadFixture(deployFixture);

          await expect(ethosVouch.targetExistsAndAllowedForId(1)).to.eventually.deep.equal(
            [false, false],
            'Wrong for 1',
          );

          await expect(ethosVouch.targetExistsAndAllowedForId(2)).to.eventually.deep.equal(
            [false, false],
            'Wrong for 2',
          );

          await expect(ethosVouch.targetExistsAndAllowedForId(11)).to.eventually.deep.equal(
            [false, false],
            'Wrong for 3',
          );
        });
      });

      describe('vouchesByAuthorInRange', () => {
        it('should return empty if no vouches', async () => {
          const {
            ethosVouch,
            ethosProfile,
            VOUCHER_0,
            VOUCHER_1,
            PROFILE_CREATOR_0,
            PROFILE_CREATOR_1,
            OWNER,
          } = await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_1.address);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(VOUCHER_1).createProfile(1);

          // 0
          expect(await ethosVouch.vouchesByAuthorInRange(3, 0, 1)).to.be.deep.equal(
            [],
            'Wrong for 0',
          );

          // 1
          await ethosVouch
            .connect(VOUCHER_1)
            .vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          expect(await ethosVouch.vouchesByAuthorInRange(3, 0, 1)).to.be.deep.equal(
            [],
            'Wrong for 1',
          );
        });

        it('should return empty if maxLength == 0', async () => {
          const {
            ethosVouch,
            ethosProfile,
            VOUCHER_0,
            VOUCHER_1,
            PROFILE_CREATOR_0,
            PROFILE_CREATOR_1,
            OWNER,
          } = await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_1.address);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(VOUCHER_1).createProfile(1);

          // 0
          expect(await ethosVouch.vouchesByAuthorInRange(3, 0, 0)).to.be.deep.equal(
            [],
            'Wrong for 0',
          );

          // 1
          await ethosVouch
            .connect(VOUCHER_1)
            .vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          expect(await ethosVouch.vouchesByAuthorInRange(3, 0, 0)).to.be.deep.equal(
            [],
            'Wrong for 1',
          );

          // 2
          expect(await ethosVouch.vouchesByAuthorInRange(4, 0, 0)).to.be.deep.equal(
            [],
            'Wrong for 2',
          );
        });

        it('should return empty if fromIdx >= vouchIdsLength', async () => {
          const {
            ethosVouch,
            ethosProfile,
            VOUCHER_0,
            VOUCHER_1,
            PROFILE_CREATOR_0,
            PROFILE_CREATOR_1,
            OWNER,
          } = await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_1.address);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(VOUCHER_1).createProfile(1);

          // 0
          expect(await ethosVouch.vouchesByAuthorInRange(3, 1, 2)).to.be.deep.equal(
            [],
            'Wrong for 0',
          );

          // 1
          await ethosVouch
            .connect(VOUCHER_1)
            .vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          expect(await ethosVouch.vouchesByAuthorInRange(3, 2, 3)).to.be.deep.equal(
            [],
            'Wrong for 1',
          );

          // 2
          expect(await ethosVouch.vouchesByAuthorInRange(4, 1, 4)).to.be.deep.equal(
            [],
            'Wrong for 2',
          );

          // 3
          expect(await ethosVouch.vouchesByAuthorInRange(4, 2, 4)).to.be.deep.equal(
            [],
            'Wrong for 3',
          );
        });
      });

      describe('vouchesCountForSubjectProfileId', () => {
        it('should return correct count', async () => {
          const {
            ethosVouch,
            VOUCHER_0,
            VOUCHER_1,
            PROFILE_CREATOR_0,
            PROFILE_CREATOR_1,
            ethosProfile,
            OWNER,
          } = await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_1.address);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(VOUCHER_1).createProfile(1);

          expect(await ethosVouch.vouchesCountForSubjectProfileId(1)).to.be.equal(
            0,
            'Wrong count before for profileId 0',
          );
          expect(await ethosVouch.vouchesCountForSubjectProfileId(2)).to.be.equal(
            0,
            'Wrong count before for profileId 1',
          );

          // 0
          await ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          expect(await ethosVouch.vouchesCountForSubjectProfileId(1)).to.be.equal(
            0,
            'Wrong count before for profileId 0, 0',
          );
          expect(await ethosVouch.vouchesCountForSubjectProfileId(2)).to.be.equal(
            1,
            'Wrong count before for profileId 1, 0',
          );

          // 1
          await ethosVouch
            .connect(VOUCHER_1)
            .vouchByProfileId(1, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123456'),
            });

          expect(await ethosVouch.vouchesCountForSubjectProfileId(1)).to.be.equal(
            1,
            'Wrong count before for profileId 0, 1',
          );
          expect(await ethosVouch.vouchesCountForSubjectProfileId(2)).to.be.equal(
            1,
            'Wrong count before for profileId 1, 1',
          );

          // 1
          await ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(1, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123456'),
            });

          expect(await ethosVouch.vouchesCountForSubjectProfileId(1)).to.be.equal(
            2,
            'Wrong count before for profileId 0, 2',
          );
          expect(await ethosVouch.vouchesCountForSubjectProfileId(2)).to.be.equal(
            1,
            'Wrong count before for profileId 1, 2',
          );
        });
      });

      describe('vouchesForSubjectProfileIdInRange', () => {
        it('should return empty if no vouches', async () => {
          const {
            ethosVouch,
            ethosProfile,
            VOUCHER_0,
            VOUCHER_1,
            PROFILE_CREATOR_0,
            PROFILE_CREATOR_1,
            OWNER,
          } = await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_1.address);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(VOUCHER_1).createProfile(1);

          // 0
          expect(await ethosVouch.vouchesForSubjectProfileIdInRange(1, 0, 1)).to.be.deep.equal(
            [],
            'Wrong for 0',
          );

          // 1
          await ethosVouch
            .connect(VOUCHER_1)
            .vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          expect(await ethosVouch.vouchesForSubjectProfileIdInRange(1, 0, 1)).to.be.deep.equal(
            [],
            'Wrong for 1',
          );
        });

        it('should return empty if maxLength == 0', async () => {
          const {
            ethosVouch,
            ethosProfile,
            VOUCHER_0,
            VOUCHER_1,
            PROFILE_CREATOR_0,
            PROFILE_CREATOR_1,
            OWNER,
          } = await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_1.address);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(VOUCHER_1).createProfile(1);

          // 0
          expect(await ethosVouch.vouchesForSubjectProfileIdInRange(1, 0, 0)).to.be.deep.equal(
            [],
            'Wrong for 0',
          );

          // 1
          await ethosVouch
            .connect(VOUCHER_1)
            .vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          expect(await ethosVouch.vouchesForSubjectProfileIdInRange(1, 0, 0)).to.be.deep.equal(
            [],
            'Wrong for 1',
          );

          // 2
          expect(await ethosVouch.vouchesForSubjectProfileIdInRange(2, 1, 0)).to.be.deep.equal(
            [],
            'Wrong for 2',
          );
        });

        it('should return empty if fromIdx >= vouchIdsLength', async () => {
          const {
            ethosVouch,
            ethosProfile,
            VOUCHER_0,
            VOUCHER_1,
            PROFILE_CREATOR_0,
            PROFILE_CREATOR_1,
            OWNER,
          } = await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_1.address);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(VOUCHER_1).createProfile(1);

          // 0
          expect(await ethosVouch.vouchesForSubjectProfileIdInRange(1, 1, 2)).to.be.deep.equal(
            [],
            'Wrong for 0',
          );

          // 1
          await ethosVouch
            .connect(VOUCHER_1)
            .vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          expect(await ethosVouch.vouchesForSubjectProfileIdInRange(2, 2, 3)).to.be.deep.equal(
            [],
            'Wrong for 1',
          );

          // 2
          expect(await ethosVouch.vouchesForSubjectProfileIdInRange(2, 1, 4)).to.be.deep.equal(
            [],
            'Wrong for 2',
          );

          // 3
          expect(await ethosVouch.vouchesForSubjectProfileIdInRange(1, 2, 4)).to.be.deep.equal(
            [],
            'Wrong for 3',
          );
        });
      });

      describe('verifiedVouchByAuthorForSubjectAddress', () => {
        it('should revert if no profile for Subject', async () => {
          const {
            ethosVouch,
            VOUCHER_0,
            VOUCHER_1,
            PROFILE_CREATOR_0,
            PROFILE_CREATOR_1,
            WRONG_ADDRESS_0,
            ethosProfile,
            OWNER,
          } = await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_1.address);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(VOUCHER_1).createProfile(1);

          await ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(2, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          await expect(
            ethosVouch.verifiedVouchByAuthorForSubjectAddress(
              4,
              await WRONG_ADDRESS_0.getAddress(),
            ),
          )
            .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress')
            .withArgs(await WRONG_ADDRESS_0.getAddress());
        });

        it('should revert if NotVoterForVouch', async () => {
          const {
            ethosVouch,
            VOUCHER_0,
            VOUCHER_1,
            PROFILE_CREATOR_0,
            PROFILE_CREATOR_1,
            ethosProfile,
            OWNER,
          } = await loadFixture(deployFixture);

          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
          await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
          await ethosProfile.connect(OWNER).inviteAddress(VOUCHER_1.address);
          await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
          await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
          await ethosProfile.connect(VOUCHER_0).createProfile(1);
          await ethosProfile.connect(VOUCHER_1).createProfile(1);

          await ethosVouch
            .connect(VOUCHER_0)
            .vouchByProfileId(3, DEFAULT_COMMENT, DEFAULT_METADATA, {
              value: ethers.parseEther('0.0123'),
            });

          await expect(
            ethosVouch.verifiedVouchByAuthorForSubjectAddress(
              5,
              await PROFILE_CREATOR_1.getAddress(),
            ),
          )
            .to.be.revertedWithCustomError(ethosVouch, 'NotAuthorForVouch')
            .withArgs(0, 5);
        });
      });
    });
  });
});
