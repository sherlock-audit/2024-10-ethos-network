import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';

import { type EthosReview } from '../typechain-types/index.js';
import { common } from './utils/common.js';
import { smartContractNames } from './utils/mock.names.js';

const { ethers } = hre;

describe('EthosProfile', () => {
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
      PROFILE_CREATOR_0,
      PROFILE_CREATOR_1,
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

    // Impersonate the contract address
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [ethosAttestationAddress],
    });

    await hre.network.provider.send('hardhat_setBalance', [
      ethosAttestationAddress,
      '0x1000000000000000000', // 1 ETH in hex
    ]);

    const attestationSigner = await ethers.getSigner(ethosAttestationAddress);

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

    const provider = ethers.provider;

    const SERVICE_X = 'x.com';

    const ACCOUNT_NAME_BEN = 'benwalther256';

    return {
      OWNER,
      ADMIN,
      EXPECTED_SIGNER,
      SERVICE_X,
      ACCOUNT_NAME_BEN,
      WRONG_ADDRESS_0,
      WRONG_ADDRESS_1,
      OTHER_0,
      OTHER_1,
      ZERO_ADDRESS,
      PROFILE_CREATOR_0,
      PROFILE_CREATOR_1,
      signatureVerifier,
      interactionControl,
      ethosAttestation,
      ethosProfile,
      ethosReview,
      attestationSigner,
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
      const { ADMIN, ethosProfile } = await loadFixture(deployFixture);

      const implementation = await ethers.deployContract('EthosProfile', []);
      const implementationAddress = await implementation.getAddress();

      await expect(
        ethosProfile.connect(ADMIN).upgradeToAndCall(implementationAddress, '0x'),
      ).to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount');
    });

    it('should fail if upgraded contract is zero address', async () => {
      const { OWNER, ethosProfile } = await loadFixture(deployFixture);

      await expect(
        ethosProfile.connect(OWNER).upgradeToAndCall(ethers.ZeroAddress, '0x'),
      ).to.be.revertedWithCustomError(ethosProfile, 'ZeroAddress');
    });

    it('should upgrade to new implementation address', async () => {
      const { OWNER, ethosProfile, provider } = await loadFixture(deployFixture);
      const proxyAddr = await ethosProfile.getAddress();

      const implementation = await ethers.deployContract('EthosProfile', []);
      const implementationAddress = await implementation.getAddress();
      await ethosProfile.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);
    });

    it('should persist storage after upgrade', async () => {
      const { PROFILE_CREATOR_0, ethosProfile, OWNER, provider } = await loadFixture(deployFixture);

      await expect(
        ethosProfile.verifiedProfileIdForAddress(PROFILE_CREATOR_0.address),
      ).to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress');

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      const proxyAddr = await ethosProfile.getAddress();

      const implementation = await ethers.deployContract('EthosProfileMock', []);
      const implementationAddress = await implementation.getAddress();
      await ethosProfile.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);

      const proxy = await ethers.getContractAt('EthosProfileMock', proxyAddr);

      expect(await proxy.verifiedProfileIdForAddress(PROFILE_CREATOR_0.address)).to.be.equal(2n);
    });

    it('should upgrade and enable new storage', async () => {
      const { OWNER, ethosProfile, provider } = await loadFixture(deployFixture);
      const proxyAddr = await ethosProfile.getAddress();

      const implementation = await ethers.deployContract('EthosProfileMock', []);
      const implementationAddress = await implementation.getAddress();
      await ethosProfile.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);

      const proxy = await ethers.getContractAt('EthosProfileMock', proxyAddr);
      await proxy.setTestValue(21);
      const testValue = await proxy.testValue();
      expect(testValue).to.equal(21);
    });

    it('should revert calling initialize a second time', async () => {
      const {
        OWNER,
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        ethosProfile,
        contractAddressManager,
      } = await loadFixture(deployFixture);

      const profile = await ethers.getContractFactory('EthosProfileMock');
      const implementation = await ethers.deployContract('EthosProfileMock', []);
      const implementationAddress = await implementation.getAddress();
      await expect(
        ethosProfile
          .connect(OWNER)
          .upgradeToAndCall(
            implementationAddress,
            profile.interface.encodeFunctionData('initialize', [
              OWNER.address,
              ADMIN.address,
              EXPECTED_SIGNER.address,
              await signatureVerifier.getAddress(),
              await contractAddressManager.getAddress(),
            ]),
          ),
      ).to.revertedWithCustomError(ethosProfile, 'InvalidInitialization');
    });
  });

  describe('constructor', () => {
    it('should set correct params', async () => {
      const {
        OWNER,
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        contractAddressManager,
        ethosProfile,
      } = await loadFixture(deployFixture);

      const OWNER_ROLE = await ethosProfile.OWNER_ROLE();
      expect(await ethosProfile.getRoleMember(OWNER_ROLE, 0)).to.equal(
        OWNER.address,
        'Wrong owner',
      );

      const ADMIN_ROLE = await ethosProfile.ADMIN_ROLE();
      expect(await ethosProfile.getRoleMember(ADMIN_ROLE, 0)).to.equal(
        ADMIN.address,
        'Wrong admin',
      );

      expect(await ethosProfile.expectedSigner()).to.equal(
        EXPECTED_SIGNER.address,
        'Wrong expectedSigner',
      );

      expect(await ethosProfile.signatureVerifier()).to.equal(
        await signatureVerifier.getAddress(),
        'Wrong signatureVerifier',
      );

      expect(await ethosProfile.contractAddressManager()).to.equal(
        await contractAddressManager.getAddress(),
        'Wrong contractAddressManager',
      );

      expect(await ethosProfile.defaultNumberOfInvites()).to.equal(0, 'Wrong default invites');
    });
  });

  describe('createProfile', () => {
    it('should fail if paused', async () => {
      const { OWNER, ethosProfile, interactionControl, PROFILE_CREATOR_0 } =
        await loadFixture(deployFixture);

      await interactionControl.connect(OWNER).pauseAll();
      expect(await ethosProfile.paused()).to.be.equal(true, 'should be paused before');

      await expect(
        ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1),
      ).to.be.revertedWithCustomError(ethosProfile, 'EnforcedPause');
    });

    it('should set correct id for profileIdByAddress', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, PROFILE_CREATOR_1, OWNER } =
        await loadFixture(deployFixture);

      // 0
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      let profileId = await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address);
      expect(profileId).to.be.equal(2, 'should be 2');

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
      await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);

      profileId = await ethosProfile.profileIdByAddress(PROFILE_CREATOR_1.address);
      expect(profileId).to.be.equal(3, 'should be 3');
    });

    it('should set correct profileId for the profile', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, PROFILE_CREATOR_1, OWNER } =
        await loadFixture(deployFixture);

      // 1
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      let profile = await ethosProfile.getProfile(1);
      expect(profile.profileId).to.be.equal(1, 'should be 1');

      // 2
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
      await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);

      profile = await ethosProfile.getProfile(2);
      expect(profile.profileId).to.be.equal(2, 'should be 2');
    });

    it('should set correct createdAt for the profile', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, OWNER } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const timeCreated = await time.latest();

      await time.increase(123);

      const profile = await ethosProfile.getProfile(2);
      expect(profile.createdAt).to.be.equal(timeCreated, 'wrong createdAt');
    });

    it('should push correct address into profile.addresses', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, OWNER } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      const addresses = await ethosProfile.addressesForProfile(2);
      expect(addresses.length).to.be.equal(1, 'should be 1 address');
      expect(addresses[0]).to.be.equal(PROFILE_CREATOR_0.address, 'wrong address');
    });

    it('should set correct amount of default invites for profile', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, OWNER } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      const profile = await ethosProfile.getProfile(1);
      expect(profile.inviteInfo.available).to.be.equal(9, 'should be 9 after invite');

      const profile2 = await ethosProfile.getProfile(2);
      expect(profile2.inviteInfo.available).to.be.equal(0, 'should be 0 by default');
    });

    it('should have empty sent array on profile creation', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, OWNER } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      const inviteeIds = await ethosProfile.invitedIdsForProfile(2);
      expect(inviteeIds.length).to.be.equal(0, 'should be empty array');
    });

    it('should emit event ProfileCreated with correct params', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, OWNER } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await expect(ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1))
        .to.emit(ethosProfile, 'ProfileCreated')
        .withArgs(2, PROFILE_CREATOR_0.address);
    });

    it('should increase profile count', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, PROFILE_CREATOR_1, OWNER } =
        await loadFixture(deployFixture);

      expect(await ethosProfile.profileCount()).to.be.equal(2, 'should be 2');

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      expect(await ethosProfile.profileCount()).to.be.equal(3, 'should be 3');

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
      await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
      expect(await ethosProfile.profileCount()).to.be.equal(4, 'should be 4');
    });

    it('should show correct inviter', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, PROFILE_CREATOR_1, OWNER, ADMIN } =
        await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await ethosProfile.connect(ADMIN).addInvites(PROFILE_CREATOR_0, 1);

      await ethosProfile.connect(PROFILE_CREATOR_0).inviteAddress(PROFILE_CREATOR_1.address);
      await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(2);

      const ownerProfile = await ethosProfile.inviteInfoForProfileId(3);
      expect(ownerProfile.invitedBy).to.be.equal(2, 'should be 2');
    });
  });

  describe('Mock profiles', () => {
    it('should fail if increment count attempted from other address', async () => {
      const { ethosProfile, ethosAttestation, PROFILE_CREATOR_0, OTHER_0 } =
        await loadFixture(deployFixture);

      const attestationHash = await ethosAttestation.getServiceAndAccountHash('test', 'testy');

      await expect(
        ethosProfile
          .connect(PROFILE_CREATOR_0)
          .incrementProfileCount(false, OTHER_0.address, attestationHash),
      ).to.be.revertedWithCustomError(ethosProfile, 'InvalidSender');
    });

    it('should register address that has a mock', async () => {
      const {
        ethosProfile,
        ethosReview,
        ADMIN,
        OWNER,
        PROFILE_CREATOR_0,
        PROFILE_CREATOR_1,
        OTHER_0,
        EXPECTED_SIGNER,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      const reviewPrice = ethers.parseEther('1.23456789');
      await allowPaymentToken(ADMIN, ethosReview, ethers.ZeroAddress, true, reviewPrice);

      const params = {
        score: Score.Positive,
        subject: OTHER_0.address,
        paymentToken: ethers.ZeroAddress,
        comment: defaultComment,
        metadata: defaultMetadata,
        attestationDetails: {
          account: '',
          service: '',
        } satisfies AttestationDetails,
      };

      await ethosReview
        .connect(PROFILE_CREATOR_0)
        .addReview(
          params.score,
          params.subject,
          params.paymentToken,
          params.comment,
          params.metadata,
          params.attestationDetails,
          { value: reviewPrice },
        );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
      await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);

      expect(await ethosProfile.profileIdByAddress(OTHER_0.address)).to.be.equal(
        3,
        'wrong mock Id',
      );

      const signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        '4',
        '29548234957',
        EXPECTED_SIGNER,
      );

      await ethosProfile
        .connect(PROFILE_CREATOR_1)
        .registerAddress(OTHER_0.address, 4, 29548234957, signature);

      expect(await ethosProfile.profileIdByAddress(OTHER_0.address)).to.be.equal(
        4,
        'wrong profileId',
      );
    });
  });

  describe('createProfile - invite system', () => {
    it('should fail if address not invited', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, PROFILE_CREATOR_1, WRONG_ADDRESS_0, OWNER } =
        await loadFixture(deployFixture);

      // array is empty
      await expect(
        ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1),
      ).to.be.revertedWithCustomError(ethosProfile, 'AddressNotInvited');

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);

      // array has 1 member
      await expect(
        ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1),
      ).to.be.revertedWithCustomError(ethosProfile, 'AddressNotInvited');

      await ethosProfile.connect(OWNER).inviteAddress(WRONG_ADDRESS_0.address);

      // array has 2 members
      await expect(
        ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1),
      ).to.be.revertedWithCustomError(ethosProfile, 'AddressNotInvited');

      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      // array has 1 member again
      await expect(
        ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1),
      ).to.be.revertedWithCustomError(ethosProfile, 'AddressNotInvited');

      await ethosProfile.connect(WRONG_ADDRESS_0).createProfile(1);

      // array has 0 member again
      await expect(
        ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1),
      ).to.be.revertedWithCustomError(ethosProfile, 'AddressNotInvited');
    });

    it('should display correct invitees', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, PROFILE_CREATOR_1, OWNER } =
        await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
      await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);

      const inviteeIds = await ethosProfile.invitedIdsForProfile(1);
      expect(inviteeIds.length).to.be.equal(2, 'should be empty array');
      expect(inviteeIds[0]).to.be.equal(2, 'should be profile 1 addr');
      expect(inviteeIds[1]).to.be.equal(3, 'should be profile 2 addr');
    });

    it('should set new default invites', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, ADMIN, OWNER } = await loadFixture(deployFixture);

      await ethosProfile.connect(ADMIN).setDefaultNumberOfInvites(3);

      const defaultInvites = await ethosProfile.defaultNumberOfInvites();

      expect(defaultInvites).to.be.equal(3, 'should be 3 invites');

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      const profile1Info = await ethosProfile.inviteInfoForProfileId(2);
      expect(profile1Info.available).to.be.equal(3, 'should have 3 invites');

      await expect(ethosProfile.connect(ADMIN).setDefaultNumberOfInvites(1000))
        .to.emit(ethosProfile, 'DefaultInvitesChanged')
        .withArgs(1000);
    });

    it('should revert if setNewDefaultInvites not called by admin', async () => {
      const { ethosProfile, OWNER } = await loadFixture(deployFixture);

      await expect(ethosProfile.connect(OWNER).setDefaultNumberOfInvites(5))
        .to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount')
        .withArgs(OWNER.address, await ethosProfile.ADMIN_ROLE());
    });
  });

  describe('inviteAddress', () => {
    it('should fail if paused', async () => {
      const { OWNER, ethosProfile, interactionControl, PROFILE_CREATOR_0 } =
        await loadFixture(deployFixture);

      await interactionControl.connect(OWNER).pauseAll();
      expect(await ethosProfile.paused()).to.be.equal(true, 'should be paused');

      await expect(
        ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address),
      ).to.be.revertedWithCustomError(ethosProfile, 'EnforcedPause');
    });

    it('should fail if inviting profile has no invites', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, PROFILE_CREATOR_1, OWNER } =
        await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await expect(ethosProfile.connect(PROFILE_CREATOR_0).inviteAddress(PROFILE_CREATOR_1.address))
        .to.be.revertedWithCustomError(ethosProfile, 'InsufficientInvites')
        .withArgs(2);
    });

    it('should fail if inviting zero address', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, OWNER } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await expect(
        ethosProfile.connect(PROFILE_CREATOR_0).inviteAddress(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(ethosProfile, 'ZeroAddress');
    });

    it('should fail if sender profile does not exist', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, PROFILE_CREATOR_1 } =
        await loadFixture(deployFixture);

      await expect(
        ethosProfile.connect(PROFILE_CREATOR_0).inviteAddress(PROFILE_CREATOR_1.address),
      ).to.be.revertedWithCustomError(ethosProfile, 'InvalidSender');
    });

    it('should fail if invited address has profile', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, PROFILE_CREATOR_1, OWNER } =
        await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
      await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);

      await expect(ethosProfile.connect(PROFILE_CREATOR_1).inviteAddress(PROFILE_CREATOR_0.address))
        .to.be.revertedWithCustomError(ethosProfile, 'ProfileExistsForAddress')
        .withArgs(PROFILE_CREATOR_0.address);
    });
  });

  describe('add invites to profiles', () => {
    it('should revert if not called by admin', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, PROFILE_CREATOR_1, OWNER } =
        await loadFixture(deployFixture);

      await expect(ethosProfile.connect(OWNER).addInvites(PROFILE_CREATOR_0.address, 5))
        .to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount')
        .withArgs(OWNER.address, await ethosProfile.ADMIN_ROLE());

      const users = [OWNER.address, PROFILE_CREATOR_1.address, PROFILE_CREATOR_0.address];
      await expect(ethosProfile.connect(OWNER).addInvitesBatch(users, 5))
        .to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount')
        .withArgs(OWNER.address, await ethosProfile.ADMIN_ROLE());
    });

    it('should revert adding invite to non-existent profile', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, ADMIN } = await loadFixture(deployFixture);

      await expect(ethosProfile.connect(ADMIN).addInvites(PROFILE_CREATOR_0.address, 5))
        .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress')
        .withArgs(PROFILE_CREATOR_0.address);
    });

    it('should revert batch adding invite to non-existent profile', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, PROFILE_CREATOR_1, OWNER, ADMIN } =
        await loadFixture(deployFixture);

      const users = [OWNER.address, PROFILE_CREATOR_1.address, PROFILE_CREATOR_0.address];
      await expect(ethosProfile.connect(ADMIN).addInvitesBatch(users, 5))
        .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress')
        .withArgs(PROFILE_CREATOR_1.address);
    });

    it('should add invites to profile', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, ADMIN, OWNER } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const invite0Before = await ethosProfile.inviteInfoForProfileId(2);
      expect(invite0Before.available).to.be.equal(0, 'should be none');

      await ethosProfile.connect(ADMIN).addInvites(PROFILE_CREATOR_0.address, 5);

      const invite0After = await ethosProfile.inviteInfoForProfileId(2);
      expect(invite0After.available).to.be.equal(5, 'should be none');
    });

    it('should batch add invites to profiles', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, PROFILE_CREATOR_1, ADMIN, OWNER } =
        await loadFixture(deployFixture);
      const users = [OWNER.address, PROFILE_CREATOR_1.address, PROFILE_CREATOR_0.address];
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);

      let invite1 = await ethosProfile.inviteInfoForProfileId(2);
      let invite2 = await ethosProfile.inviteInfoForProfileId(3);
      let inviteOwner = await ethosProfile.inviteInfoForProfileId(1);
      expect(invite1.available).to.be.equal(0, 'should be none');
      expect(invite2.available).to.be.equal(0, 'should be none');
      expect(inviteOwner.available).to.be.equal(8, 'should be none');

      await ethosProfile.connect(ADMIN).addInvitesBatch(users, 5);

      invite1 = await ethosProfile.inviteInfoForProfileId(2);
      invite2 = await ethosProfile.inviteInfoForProfileId(3);
      inviteOwner = await ethosProfile.inviteInfoForProfileId(1);
      expect(invite1.available).to.be.equal(5, 'should be none');
      expect(invite2.available).to.be.equal(5, 'should be none');
      expect(inviteOwner.available).to.be.equal(13, 'should be none');
    });
  });

  describe('archiveProfile', () => {
    it('should fail if paused', async () => {
      const { OWNER, ethosProfile, interactionControl, PROFILE_CREATOR_0 } =
        await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await interactionControl.connect(OWNER).pauseAll();
      expect(await ethosProfile.paused()).to.be.equal(true, 'should be paused');

      await expect(
        ethosProfile.connect(PROFILE_CREATOR_0).archiveProfile(),
      ).to.be.revertedWithCustomError(ethosProfile, 'EnforcedPause');
    });

    it('should fail if ProfileNotFoundForAddress', async () => {
      const { ethosProfile, PROFILE_CREATOR_0 } = await loadFixture(deployFixture);

      await expect(ethosProfile.connect(PROFILE_CREATOR_0).archiveProfile())
        .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress')
        .withArgs(PROFILE_CREATOR_0.address);
    });

    it('should fail if Profile is archived', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, OWNER } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await ethosProfile.connect(PROFILE_CREATOR_0).archiveProfile();

      await expect(ethosProfile.connect(PROFILE_CREATOR_0).archiveProfile())
        .to.be.revertedWithCustomError(ethosProfile, 'ProfileAccess')
        .withArgs(2, 'Profile is archived');
    });

    it('should set true for profile.archived', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, OWNER } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      expect((await ethosProfile.getProfile(1)).archived).to.be.equal(
        false,
        'should be false before',
      );

      await expect(ethosProfile.connect(PROFILE_CREATOR_0).archiveProfile()).to.emit(
        ethosProfile,
        'ProfileArchived',
      );
      expect((await ethosProfile.getProfile(2)).archived).to.be.equal(true, 'should be true after');
    });
  });

  describe('restoreProfile', () => {
    it('should fail if paused', async () => {
      const { OWNER, ethosProfile, interactionControl, PROFILE_CREATOR_0 } =
        await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      await ethosProfile.connect(PROFILE_CREATOR_0).archiveProfile();

      await interactionControl.connect(OWNER).pauseAll();
      expect(await ethosProfile.paused()).to.be.equal(true, 'should be paused');

      await expect(
        ethosProfile.connect(PROFILE_CREATOR_0).restoreProfile(),
      ).to.be.revertedWithCustomError(ethosProfile, 'EnforcedPause');
    });

    it('should fail if ProfileNotFoundForAddress', async () => {
      const { ethosProfile, PROFILE_CREATOR_0 } = await loadFixture(deployFixture);

      await expect(ethosProfile.connect(PROFILE_CREATOR_0).restoreProfile())
        .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress')
        .withArgs(PROFILE_CREATOR_0.address);
    });

    it('should fail if Profile is not archived', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, OWNER } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await expect(ethosProfile.connect(PROFILE_CREATOR_0).restoreProfile())
        .to.be.revertedWithCustomError(ethosProfile, 'ProfileAccess')
        .withArgs(2, 'Profile is not archived');
    });

    it('should set false for profile.archived', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, OWNER } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      await ethosProfile.connect(PROFILE_CREATOR_0).archiveProfile();

      expect((await ethosProfile.getProfile(2)).archived).to.be.equal(
        true,
        'should be true before',
      );

      await expect(ethosProfile.connect(PROFILE_CREATOR_0).restoreProfile()).to.emit(
        ethosProfile,
        'ProfileRestored',
      );
      expect((await ethosProfile.getProfile(2)).archived).to.be.equal(
        false,
        'should be false after',
      );
    });
  });

  describe('registerAddress', () => {
    it('should fail if paused', async () => {
      const {
        OWNER,
        ethosProfile,
        interactionControl,
        PROFILE_CREATOR_0,
        OTHER_0,
        EXPECTED_SIGNER,
      } = await loadFixture(deployFixture);

      const profileId = String(await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address));
      const rand = '123';
      const signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await interactionControl.connect(OWNER).pauseAll();
      expect(await ethosProfile.paused()).to.be.equal(true, 'should be paused before');

      await expect(
        ethosProfile
          .connect(PROFILE_CREATOR_0)
          .registerAddress(OTHER_0.address, profileId, rand, signature),
      ).to.be.revertedWithCustomError(ethosProfile, 'EnforcedPause');
    });

    it('should fail if provided address is address(0)', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, EXPECTED_SIGNER, ZERO_ADDRESS, OWNER } =
        await loadFixture(deployFixture);

      const profileId = String(await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address));
      const rand = '123';
      const signature = await common.signatureForRegisterAddress(
        ZERO_ADDRESS,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await expect(
        ethosProfile
          .connect(PROFILE_CREATOR_0)
          .registerAddress(ZERO_ADDRESS, profileId, rand, signature),
      ).to.be.revertedWithCustomError(ethosProfile, 'ZeroAddress');
    });

    it('should fail if ProfileNotFound', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, EXPECTED_SIGNER, OTHER_0, OWNER } =
        await loadFixture(deployFixture);

      const profileId = String(await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address));
      const rand = '123';
      const signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await expect(
        ethosProfile
          .connect(PROFILE_CREATOR_0)
          .registerAddress(OTHER_0.address, profileId, rand, signature),
      ).to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress');
    });

    it('should fail if Profile is archived', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, EXPECTED_SIGNER, OTHER_0, OWNER } =
        await loadFixture(deployFixture);

      const rand = '123';
      const signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        '2',
        rand,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      await ethosProfile.connect(PROFILE_CREATOR_0).archiveProfile();

      await expect(
        ethosProfile
          .connect(PROFILE_CREATOR_0)
          .registerAddress(OTHER_0.address, 2, rand, signature),
      )
        .to.be.revertedWithCustomError(ethosProfile, 'ProfileAccess')
        .withArgs(2, 'Profile is archived');
    });

    it('should fail if wrong signatureVerifier address stored', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, EXPECTED_SIGNER, OTHER_0, ADMIN, OWNER } =
        await loadFixture(deployFixture);

      const profileId = String(2);
      const rand = '123';
      const signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await ethosProfile.connect(ADMIN).updateSignatureVerifier(OTHER_0.address);

      await expect(
        ethosProfile
          .connect(PROFILE_CREATOR_0)
          .registerAddress(OTHER_0.address, 2, rand, signature),
      ).to.be.revertedWithoutReason();
    });

    it('should fail if InvalidSignature', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, EXPECTED_SIGNER, OTHER_0, OWNER } =
        await loadFixture(deployFixture);

      const profileId = String(2);
      const rand = '123';
      const signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await expect(
        ethosProfile
          .connect(PROFILE_CREATOR_0)
          .registerAddress(OTHER_0.address, 2, rand + '4', signature),
      ).to.be.revertedWithCustomError(ethosProfile, 'InvalidSignature');
    });

    it('should save signature to signatureUsed', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, EXPECTED_SIGNER, OTHER_0, OWNER } =
        await loadFixture(deployFixture);

      const profileId = String(2);
      const rand = '123';
      const signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      let signatureUsed = await ethosProfile.signatureUsed(signature);
      expect(signatureUsed).to.be.equal(false, 'should be false before');

      await ethosProfile
        .connect(PROFILE_CREATOR_0)
        .registerAddress(OTHER_0.address, profileId, rand, signature);

      signatureUsed = await ethosProfile.signatureUsed(signature);
      expect(signatureUsed).to.be.equal(true, 'should be true after');
    });

    it('should push correct address into profile.addresses', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, EXPECTED_SIGNER, OTHER_0, OWNER } =
        await loadFixture(deployFixture);

      const profileId = String(2);
      const rand = '123';
      const signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await ethosProfile
        .connect(PROFILE_CREATOR_0)
        .registerAddress(OTHER_0.address, profileId, rand, signature);

      const adddresses = await ethosProfile.addressesForProfile(2);
      expect(adddresses.length).to.be.equal(2, 'should be 2 addresses');

      expect(adddresses[0]).to.be.equal(PROFILE_CREATOR_0.address, 'wrong address[0]');
      expect(adddresses[1]).to.be.equal(OTHER_0.address, 'wrong address[1]');
    });

    it('should set correct id for profileIdByAddress', async () => {
      const {
        ethosProfile,
        PROFILE_CREATOR_0,
        PROFILE_CREATOR_1,
        EXPECTED_SIGNER,
        OTHER_0,
        OTHER_1,
        OWNER,
      } = await loadFixture(deployFixture);

      // 0
      let profileId = String(2);
      let rand = '123';
      let signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      let profileIdByAddress = await ethosProfile.profileIdByAddress(OTHER_0.address);
      expect(profileIdByAddress).to.be.equal(0, 'should be 0 before');

      await ethosProfile
        .connect(PROFILE_CREATOR_0)
        .registerAddress(OTHER_0.address, profileId, rand, signature);

      profileIdByAddress = await ethosProfile.profileIdByAddress(OTHER_0.address);
      expect(profileIdByAddress).to.be.equal(2, 'should be 2 after');

      // 1
      profileId = '3';
      rand = '456';
      signature = await common.signatureForRegisterAddress(
        OTHER_1.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
      await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);

      profileIdByAddress = await ethosProfile.profileIdByAddress(OTHER_1.address);
      expect(profileIdByAddress).to.be.equal(0, 'should be 0 before');

      await ethosProfile
        .connect(PROFILE_CREATOR_1)
        .registerAddress(OTHER_1.address, profileId, rand, signature);

      profileIdByAddress = await ethosProfile.profileIdByAddress(OTHER_1.address);
      expect(profileIdByAddress).to.be.equal(3, 'should be 3 after');
    });

    it('should emit event AddressClaim with correct params', async () => {
      const {
        ethosProfile,
        PROFILE_CREATOR_0,
        PROFILE_CREATOR_1,
        EXPECTED_SIGNER,
        OTHER_0,
        OTHER_1,
        OWNER,
      } = await loadFixture(deployFixture);

      // 0
      let profileId = String(2);
      let rand = '123';
      let signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await expect(
        ethosProfile
          .connect(PROFILE_CREATOR_0)
          .registerAddress(OTHER_0.address, profileId, rand, signature),
      )
        .to.emit(ethosProfile, 'AddressClaim')
        .withArgs(2, OTHER_0.address, 1);

      // 1
      profileId = '3';
      rand = '456';
      signature = await common.signatureForRegisterAddress(
        OTHER_1.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
      await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);

      await expect(
        ethosProfile
          .connect(PROFILE_CREATOR_1)
          .registerAddress(OTHER_1.address, profileId, rand, signature),
      )
        .to.emit(ethosProfile, 'AddressClaim')
        .withArgs(3, OTHER_1.address, 1);
    });
  });

  describe('deleteAddressAtIndex', () => {
    it('should fail if paused', async () => {
      const { OWNER, ethosProfile, interactionControl, PROFILE_CREATOR_0 } =
        await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await interactionControl.connect(OWNER).pauseAll();

      await expect(
        ethosProfile.connect(PROFILE_CREATOR_0).deleteAddressAtIndex(0, false),
      ).to.be.revertedWithCustomError(ethosProfile, 'EnforcedPause');
    });

    it('should fail if ProfileNotFoundForAddress', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, PROFILE_CREATOR_1, OWNER } =
        await loadFixture(deployFixture);

      // nothing created yet
      await expect(ethosProfile.connect(PROFILE_CREATOR_0).deleteAddressAtIndex(0, false))
        .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress')
        .withArgs(PROFILE_CREATOR_0.address);

      // profile & addresses present for PROFILE_CREATOR_0
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      await expect(ethosProfile.connect(PROFILE_CREATOR_1).deleteAddressAtIndex(0, false))
        .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress')
        .withArgs(PROFILE_CREATOR_1.address);
    });

    it('should fail if Profile is archived', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, OWNER } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      await ethosProfile.connect(PROFILE_CREATOR_0).archiveProfile();

      await expect(ethosProfile.connect(PROFILE_CREATOR_0).deleteAddressAtIndex(0, false))
        .to.be.revertedWithCustomError(ethosProfile, 'ProfileAccess')
        .withArgs(2, 'Profile is archived');
    });

    it('should fail if index >= addressesForProfile.length', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, EXPECTED_SIGNER, OTHER_0, OWNER } =
        await loadFixture(deployFixture);

      const profileId = String(2);
      const rand = '123';
      const signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      await ethosProfile
        .connect(PROFILE_CREATOR_0)
        .registerAddress(OTHER_0.address, profileId, rand, signature);

      await expect(
        ethosProfile.connect(PROFILE_CREATOR_0).deleteAddressAtIndex(11, false),
      ).to.be.revertedWithCustomError(ethosProfile, 'InvalidIndex');
    });

    it('should fail if address == msg.sender', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, EXPECTED_SIGNER, OTHER_0, OWNER } =
        await loadFixture(deployFixture);

      const profileId = String(2);
      const rand = '123';
      const signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      await ethosProfile
        .connect(PROFILE_CREATOR_0)
        .registerAddress(OTHER_0.address, profileId, rand, signature);

      // PROFILE_CREATOR_0
      await expect(ethosProfile.connect(PROFILE_CREATOR_0).deleteAddressAtIndex(0, false))
        .to.be.revertedWithCustomError(ethosProfile, 'AddressAuthorization')
        .withArgs(PROFILE_CREATOR_0.address, 'Address == msg.sender');

      // OTHER_0
      await expect(ethosProfile.connect(OTHER_0).deleteAddressAtIndex(1, false))
        .to.be.revertedWithCustomError(ethosProfile, 'AddressAuthorization')
        .withArgs(OTHER_0.address, 'Address == msg.sender');
    });

    it('should delete address from array', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, EXPECTED_SIGNER, OTHER_0, OTHER_1, OWNER } =
        await loadFixture(deployFixture);

      const profileId = String(2);
      let rand = '123';
      let signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      await ethosProfile
        .connect(PROFILE_CREATOR_0)
        .registerAddress(OTHER_0.address, profileId, rand, signature);

      rand = '456';
      signature = await common.signatureForRegisterAddress(
        OTHER_1.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );
      await ethosProfile
        .connect(PROFILE_CREATOR_0)
        .registerAddress(OTHER_1.address, profileId, rand, signature);

      let addresses = await ethosProfile.addressesForProfile(2);
      expect(addresses.length).to.be.equal(3, 'should be 3 addresses');

      // delete address at index 2
      await ethosProfile.connect(PROFILE_CREATOR_0).deleteAddressAtIndex(2, false);

      addresses = await ethosProfile.addressesForProfile(2);
      expect(addresses.length).to.be.equal(2, 'should be 2 addresses');
      expect(addresses[0]).to.be.equal(PROFILE_CREATOR_0.address, 'wrong address[0]');
      expect(addresses[1]).to.be.equal(OTHER_0.address, 'wrong address[1]');

      // delete address at index 1
      await ethosProfile.connect(PROFILE_CREATOR_0).deleteAddressAtIndex(1, false);

      addresses = await ethosProfile.addressesForProfile(2);
      expect(addresses.length).to.be.equal(1, 'should be 1 address');
      expect(addresses[0]).to.be.equal(PROFILE_CREATOR_0.address, 'wrong address');
    });

    it('should emit event AddressClaim with correct params', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, EXPECTED_SIGNER, OTHER_0, OWNER } =
        await loadFixture(deployFixture);

      const profileId = String(2);
      const rand = '123';
      const signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      await ethosProfile
        .connect(PROFILE_CREATOR_0)
        .registerAddress(OTHER_0.address, profileId, rand, signature);

      await expect(ethosProfile.connect(PROFILE_CREATOR_0).deleteAddressAtIndex(1, false))
        .to.emit(ethosProfile, 'AddressClaim')
        .withArgs(2, OTHER_0.address, 0);
    });
  });

  describe('addressesForProfile', () => {
    it('should fail if ProfileNotFound', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, OWNER } = await loadFixture(deployFixture);

      // no profiles created yet
      expect(
        (await ethosProfile.connect(PROFILE_CREATOR_0).addressesForProfile(2)).length,
      ).to.equal(0);

      // profile created for PROFILE_CREATOR_0
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      expect(
        (await ethosProfile.connect(PROFILE_CREATOR_0).addressesForProfile(10)).length,
      ).to.equal(0);
    });

    it('should return correct addresses', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, EXPECTED_SIGNER, OTHER_0, OTHER_1, OWNER } =
        await loadFixture(deployFixture);

      const profileId = String(2);
      let rand = '123';
      let signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      // single address
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      let addresses = await ethosProfile.addressesForProfile(2);
      expect(addresses.length).to.be.equal(1, 'should be 1 address');
      expect(addresses[0]).to.be.equal(PROFILE_CREATOR_0.address, 'wrong address[0]');

      // multiple addresses
      await ethosProfile
        .connect(PROFILE_CREATOR_0)
        .registerAddress(OTHER_0.address, profileId, rand, signature);

      rand = '456';
      signature = await common.signatureForRegisterAddress(
        OTHER_1.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );
      await ethosProfile
        .connect(PROFILE_CREATOR_0)
        .registerAddress(OTHER_1.address, profileId, rand, signature);

      addresses = await ethosProfile.addressesForProfile(2);
      expect(addresses.length).to.be.equal(3, 'should be 3 addresses');
      expect(addresses[0]).to.be.equal(PROFILE_CREATOR_0.address, 'wrong address[0]');
      expect(addresses[1]).to.be.equal(OTHER_0.address, 'wrong address[1]');
      expect(addresses[2]).to.be.equal(OTHER_1.address, 'wrong address[2]');
    });
  });

  describe('targetExistsAndAllowedForId', () => {
    it('should return exist == false & allowed == false if no profile for id', async () => {
      const { ethosProfile } = await loadFixture(deployFixture);

      const { exist, allowed } = await ethosProfile.targetExistsAndAllowedForId(10);

      expect(exist).to.be.equal(false, 'exist should be false');
      expect(allowed).to.be.equal(false, 'allowed should be false');
    });

    it('should return exist == true & allowed == true if profile for id is archived', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, OWNER } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      await ethosProfile.connect(PROFILE_CREATOR_0).archiveProfile();

      const { exist, allowed } = await ethosProfile.targetExistsAndAllowedForId(2);

      expect(exist).to.be.equal(true, 'exist should be true');
      expect(allowed).to.be.equal(true, 'allowed should be false');
    });

    it('should return exist == true & allowed == true if profile for id is not archived', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, OWNER } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      const { exist, allowed } = await ethosProfile.targetExistsAndAllowedForId(1);

      expect(exist).to.be.equal(true, 'exist should be true');
      expect(allowed).to.be.equal(true, 'allowed should be true');
    });
  });

  describe('addressBelongsToProfile', () => {
    it('fail if ProfileNotFoundForAddress', async () => {
      const { ethosProfile, PROFILE_CREATOR_0 } = await loadFixture(deployFixture);

      await expect(ethosProfile.addressBelongsToProfile(PROFILE_CREATOR_0.address, 0))
        .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress')
        .withArgs(PROFILE_CREATOR_0.address);
    });

    it('should return false if address does not belong to profile', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, OWNER } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);

      const belongs = await ethosProfile.addressBelongsToProfile(PROFILE_CREATOR_0.address, 0);
      expect(belongs).to.be.equal(false, 'should be false');
    });

    it('should return true if address belongs to profile', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, EXPECTED_SIGNER, OTHER_0, OWNER } =
        await loadFixture(deployFixture);

      const profileId = String(2);
      const rand = '123';
      const signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      await ethosProfile
        .connect(PROFILE_CREATOR_0)
        .registerAddress(OTHER_0.address, profileId, rand, signature);

      let belongs = await ethosProfile.addressBelongsToProfile(PROFILE_CREATOR_0.address, 2);
      expect(belongs).to.be.equal(true, 'should be true, PROFILE_CREATOR_0');

      belongs = await ethosProfile.addressBelongsToProfile(OTHER_0.address, 2);
      expect(belongs).to.be.equal(true, 'should be true, OTHER_0');
    });
  });

  describe('verifiedProfileIdForAddress', () => {
    it('should fail if ProfileNotFoundForAddress', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, OTHER_0, OWNER } = await loadFixture(deployFixture);

      // no profiles created yet
      await expect(ethosProfile.verifiedProfileIdForAddress(PROFILE_CREATOR_0.address))
        .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress')
        .withArgs(PROFILE_CREATOR_0.address);

      // profile created for PROFILE_CREATOR_0
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      await expect(ethosProfile.verifiedProfileIdForAddress(OTHER_0.address))
        .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress')
        .withArgs(OTHER_0.address);
    });

    it('should return correct profileId', async () => {
      const {
        ethosProfile,
        PROFILE_CREATOR_0,
        PROFILE_CREATOR_1,
        OWNER,
        EXPECTED_SIGNER,
        OTHER_0,
        OTHER_1,
      } = await loadFixture(deployFixture);

      let profileId = String(2);
      let rand = '123';
      let signature = await common.signatureForRegisterAddress(
        OTHER_0.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );

      // PROFILE_CREATOR_0

      // single address
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      let verifiedProfileId = await ethosProfile.verifiedProfileIdForAddress(
        PROFILE_CREATOR_0.address,
      );
      expect(verifiedProfileId).to.be.equal(2, 'should be 2');

      // multiple addresses
      await ethosProfile
        .connect(PROFILE_CREATOR_0)
        .registerAddress(OTHER_0.address, profileId, rand, signature);

      verifiedProfileId = await ethosProfile.verifiedProfileIdForAddress(OTHER_0.address);
      expect(verifiedProfileId).to.be.equal(2, 'should be 2');

      // PROFILE_CREATOR_1

      // single address
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
      await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
      verifiedProfileId = await ethosProfile.verifiedProfileIdForAddress(PROFILE_CREATOR_1.address);
      expect(verifiedProfileId).to.be.equal(3, 'should be 3');

      // multiple addresses
      profileId = '3';
      rand = '456';
      signature = await common.signatureForRegisterAddress(
        OTHER_1.address,
        profileId,
        rand,
        EXPECTED_SIGNER,
      );
      await ethosProfile
        .connect(PROFILE_CREATOR_1)
        .registerAddress(OTHER_1.address, profileId, rand, signature);

      verifiedProfileId = await ethosProfile.verifiedProfileIdForAddress(OTHER_1.address);
      expect(verifiedProfileId).to.be.equal(3, 'should be 3');
    });
  });

  describe('uninviteUser', () => {
    it('should return if target user not invited', async () => {
      const { ethosProfile, OWNER, PROFILE_CREATOR_0, PROFILE_CREATOR_1 } =
        await loadFixture(deployFixture);

      await expect(
        ethosProfile.connect(OWNER).uninviteUser(PROFILE_CREATOR_0.address),
      ).to.be.revertedWithCustomError(ethosProfile, 'AddressNotInvited');

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);

      await expect(
        ethosProfile.connect(OWNER).uninviteUser(PROFILE_CREATOR_1.address),
      ).to.be.revertedWithCustomError(ethosProfile, 'AddressNotInvited');
    });

    it('should fail if uninviting zero address', async () => {
      const { ethosProfile, OWNER } = await loadFixture(deployFixture);

      await expect(
        ethosProfile.connect(OWNER).uninviteUser(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(ethosProfile, 'ZeroAddress');
    });

    it('should remove user from list of invites', async () => {
      const { ethosProfile, PROFILE_CREATOR_0, PROFILE_CREATOR_1, OWNER } =
        await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);

      await ethosProfile.connect(OWNER).uninviteUser(PROFILE_CREATOR_1.address);

      const inviteInfo = await ethosProfile.inviteInfoForProfileId(1);
      expect(inviteInfo.available).to.equal(9);

      const sent = await ethosProfile.sentInvitationsForProfile(1);
      expect(sent.length).to.equal(1);
    });
  });

  describe('Mock Profiles', () => {
    it('should revert assignExistingProfileToAttestation when not called by attestation', async () => {
      const { ethosProfile, OWNER } = await loadFixture(deployFixture);

      await expect(
        ethosProfile
          .connect(OWNER)
          .assignExistingProfileToAttestation(
            '0x68aa8fd7a2aa7169bfd0dc0914a90c36297f074572463edfd39ec755d066c46e',
            0,
          ),
      ).to.be.revertedWithCustomError(ethosProfile, 'InvalidSender');
    });

    it('should assignExistingProfileToAttestation', async () => {
      const { ethosProfile, OWNER, PROFILE_CREATOR_1, PROFILE_CREATOR_0, attestationSigner } =
        await loadFixture(deployFixture);

      const hash = '0x68aa8fd7a2aa7169bfd0dc0914a90c36297f074572463edfd39ec755d066c46e';
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);

      await ethosProfile.connect(attestationSigner).assignExistingProfileToAttestation(hash, 1);

      const id = await ethosProfile.profileIdByAttestation(hash);

      expect(id).to.be.equal(1);
    });
  });
});
