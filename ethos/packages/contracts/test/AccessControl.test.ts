import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import { type BytesLike } from 'ethers';
import hre from 'hardhat';

const { ethers } = hre;

const smartContractNames = {
  attestation: 'ETHOS_ATTESTATION',
  contractAddressManager: 'ETHOS_CONTRACT_ADDRESS_MANAGER',
  discussion: 'ETHOS_DISCUSSION',
  interactionControl: 'ETHOS_INTERACTION_CONTROL',
  profile: 'ETHOS_PROFILE',
  reputationMarket: 'ETHOS_REPUTATION_MARKET',
  review: 'ETHOS_REVIEW',
  signatureVerifier: 'ETHOS_SIGNATURE_VERIFIER',
  vote: 'ETHOS_VOTE',
  vouch: 'ETHOS_VOUCH',
} as const;

describe('AccessControl', () => {
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
      signatureVerifier,
      interactionControl,
      ethosAttestation,
      ethosProfile,
      ethosReview,
      contractAddressManager,
      ERC1967Proxy,
    };
  }

  describe('constructor', () => {
    it('should revert if the owner is the zero address', async () => {
      const {
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        interactionControl,
        ethosProfile,
        ERC1967Proxy,
      } = await loadFixture(deployFixture);

      const profile = await ethers.getContractFactory('EthosProfile');
      const profileImplementation = await ethers.deployContract('EthosProfile', []);
      const profileImpAddress = await profileImplementation.getAddress();

      await expect(
        ERC1967Proxy.deploy(
          profileImpAddress,
          profile.interface.encodeFunctionData('initialize', [
            ethers.ZeroAddress,
            ADMIN.address,
            await interactionControl.getAddress(),
            EXPECTED_SIGNER.address,
            await signatureVerifier.getAddress(),
          ]),
        ),
      ).to.be.revertedWithCustomError(ethosProfile, 'ZeroAddress');
    });

    it('should revert if the admin is the zero address', async () => {
      const {
        OWNER,
        EXPECTED_SIGNER,
        signatureVerifier,
        interactionControl,
        ethosProfile,
        ERC1967Proxy,
      } = await loadFixture(deployFixture);

      const profile = await ethers.getContractFactory('EthosProfile');
      const profileImplementation = await ethers.deployContract('EthosProfile', []);
      const profileImpAddress = await profileImplementation.getAddress();

      await expect(
        ERC1967Proxy.deploy(
          profileImpAddress,
          profile.interface.encodeFunctionData('initialize', [
            OWNER.address,
            ethers.ZeroAddress,
            await interactionControl.getAddress(),
            EXPECTED_SIGNER.address,
            await signatureVerifier.getAddress(),
          ]),
        ),
      ).to.be.revertedWithCustomError(ethosProfile, 'ZeroAddress');
    });

    it('should revert if the contractAddressManager is the zero address', async () => {
      const { OWNER, ADMIN, EXPECTED_SIGNER, interactionControl, ethosProfile, ERC1967Proxy } =
        await loadFixture(deployFixture);

      const profile = await ethers.getContractFactory('EthosProfile');
      const profileImplementation = await ethers.deployContract('EthosProfile', []);
      const profileImpAddress = await profileImplementation.getAddress();

      await expect(
        ERC1967Proxy.deploy(
          profileImpAddress,
          profile.interface.encodeFunctionData('initialize', [
            OWNER.address,
            ADMIN.address,
            await interactionControl.getAddress(),
            EXPECTED_SIGNER.address,
            ethers.ZeroAddress,
          ]),
        ),
      ).to.be.revertedWithCustomError(ethosProfile, 'ZeroAddress');
    });

    it('should set correct params', async () => {
      const {
        OWNER,
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        ethosProfile,
        contractAddressManager,
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
    });

    it('should fail if initializer called not from initialize', async () => {
      const contract = await ethers.deployContract('TestOnlyInitializableAccessControl', []);

      await expect(contract.shouldFail()).to.be.revertedWithCustomError(
        contract,
        'NotInitializing',
      );
    });

    it('should fail if signature control initializer called not from initialize', async () => {
      const contract = await ethers.deployContract('TestOnlyInitializableSignatureControl', []);

      await expect(contract.shouldFail()).to.be.revertedWithCustomError(
        contract,
        'NotInitializing',
      );
    });
  });

  describe('updateOwner', () => {
    it('should revert if the caller is not an owner', async () => {
      const { OTHER_0, ethosProfile } = await loadFixture(deployFixture);

      await expect(ethosProfile.connect(OTHER_0).updateOwner(OTHER_0.address))
        .to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount')
        .withArgs(OTHER_0.address, await ethosProfile.OWNER_ROLE());
    });

    it('should update the owner', async () => {
      const { OWNER, OTHER_0, ethosProfile } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).updateOwner(OTHER_0.address);

      expect(await ethosProfile.getRoleMember(await ethosProfile.OWNER_ROLE(), 0)).to.equal(
        OTHER_0.address,
      );
    });
  });

  describe('addAdmin', () => {
    it('should revert if the caller is not an owner', async () => {
      const { OTHER_0, OTHER_1, ethosProfile } = await loadFixture(deployFixture);

      await expect(ethosProfile.connect(OTHER_0).addAdmin(OTHER_1.address))
        .to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount')
        .withArgs(OTHER_0.address, await ethosProfile.OWNER_ROLE());
    });

    it('should add an admin', async () => {
      const { OWNER, OTHER_0, ethosProfile } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).addAdmin(OTHER_0.address);

      expect(await ethosProfile.getRoleMember(await ethosProfile.ADMIN_ROLE(), 1)).to.equal(
        OTHER_0.address,
      );
    });
  });

  describe('removeAdmin', () => {
    it('should revert if the caller is not an owner', async () => {
      const { OTHER_0, OTHER_1, ethosProfile } = await loadFixture(deployFixture);

      await expect(ethosProfile.connect(OTHER_0).removeAdmin(OTHER_1.address))
        .to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount')
        .withArgs(OTHER_0.address, await ethosProfile.OWNER_ROLE());
    });

    it('should remove an admin', async () => {
      const { OWNER, ADMIN, ethosProfile } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).removeAdmin(ADMIN.address);

      await expect(
        ethosProfile.getRoleMember(await ethosProfile.ADMIN_ROLE(), 0),
      ).to.be.revertedWithPanic();
    });
  });

  describe('updateContractAddressManager', () => {
    it('should revert if the caller is not a ContractAddressmanager', async () => {
      const { OTHER_0, OTHER_1, ethosProfile } = await loadFixture(deployFixture);

      await expect(ethosProfile.connect(OTHER_0).updateContractAddressManager(OTHER_1.address))
        .to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount')
        .withArgs(OTHER_0.address, await ethosProfile.ADMIN_ROLE());
    });

    it('should update the contractAddressManager', async () => {
      const { ADMIN, OTHER_0, ethosProfile } = await loadFixture(deployFixture);

      await ethosProfile.connect(ADMIN).updateContractAddressManager(OTHER_0.address);

      expect(await ethosProfile.contractAddressManager()).to.equal(OTHER_0.address);

      await ethosProfile.connect(ADMIN).updateContractAddressManager(ethers.ZeroAddress);

      expect(await ethosProfile.contractAddressManager()).to.equal(ethers.ZeroAddress);
    });
  });

  describe('updateExpectedSigner', () => {
    it('should revert if the caller is not an admin', async () => {
      const { OTHER_0, OTHER_1, ethosProfile } = await loadFixture(deployFixture);

      await expect(ethosProfile.connect(OTHER_0).updateExpectedSigner(OTHER_1.address))
        .to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount')
        .withArgs(OTHER_0.address, await ethosProfile.ADMIN_ROLE());
    });

    it('should revert if the new expectedSigner is the zero address', async () => {
      const { ADMIN, ethosProfile } = await loadFixture(deployFixture);

      await expect(
        ethosProfile.connect(ADMIN).updateExpectedSigner(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(ethosProfile, 'ZeroAddress');
    });

    it('should update the expectedSigner', async () => {
      const { ADMIN, OTHER_0, ethosProfile } = await loadFixture(deployFixture);

      await ethosProfile.connect(ADMIN).updateExpectedSigner(OTHER_0.address);

      expect(await ethosProfile.expectedSigner()).to.equal(OTHER_0.address);
    });
  });

  describe('updateSignatureVerifier', () => {
    it('should revert if the caller is not an admin', async () => {
      const { OTHER_0, OTHER_1, ethosProfile } = await loadFixture(deployFixture);

      await expect(ethosProfile.connect(OTHER_0).updateSignatureVerifier(OTHER_1.address))
        .to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount')
        .withArgs(OTHER_0.address, await ethosProfile.ADMIN_ROLE());
    });

    it('should revert if the new signatureVerifier is the zero address', async () => {
      const { ADMIN, ethosProfile } = await loadFixture(deployFixture);

      await expect(
        ethosProfile.connect(ADMIN).updateSignatureVerifier(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(ethosProfile, 'ZeroAddress');
    });

    it('should update the signatureVerifier', async () => {
      const { ADMIN, OTHER_0, ethosProfile } = await loadFixture(deployFixture);

      await ethosProfile.connect(ADMIN).updateSignatureVerifier(OTHER_0.address);

      expect(await ethosProfile.signatureVerifier()).to.equal(OTHER_0.address);
    });
  });

  describe('pause', () => {
    it('should revert if the caller is not an interaction control', async () => {
      const { OTHER_0, ethosProfile } = await loadFixture(deployFixture);

      await expect(ethosProfile.connect(OTHER_0).pause())
        .to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount')
        .withArgs(
          OTHER_0.address,
          ethers.solidityPackedKeccak256(['string'], [smartContractNames.interactionControl]),
        );
    });

    it('should revert if interactionsControlAddr != msg.sender', async () => {
      const { OWNER, WRONG_ADDRESS_0, ethosProfile, contractAddressManager, interactionControl } =
        await loadFixture(deployFixture);

      expect(await ethosProfile.paused()).to.equal(false);

      await contractAddressManager
        .connect(OWNER)
        .updateContractAddressesForNames(
          [ethers.ZeroAddress],
          [smartContractNames.interactionControl],
        );

      await expect(ethosProfile.connect(WRONG_ADDRESS_0).pause())
        .to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount')
        .withArgs(
          WRONG_ADDRESS_0.address,
          ethers.solidityPackedKeccak256(['string'], [smartContractNames.interactionControl]),
        );

      await expect(interactionControl.connect(OWNER).pauseContract(smartContractNames.profile))
        .to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount')
        .withArgs(
          await interactionControl.getAddress(),
          ethers.solidityPackedKeccak256(['string'], [smartContractNames.interactionControl]),
        );
    });

    it('should pause the contract', async () => {
      const { OWNER, ethosProfile, interactionControl } = await loadFixture(deployFixture);

      expect(await ethosProfile.paused()).to.equal(false, 'Should be false before');

      await interactionControl.connect(OWNER).pauseContract(smartContractNames.profile);

      expect(await ethosProfile.paused()).to.equal(true, 'Should be true after');
    });
  });

  describe('unpause', () => {
    it('should revert if the caller is not an interaction control', async () => {
      const { OTHER_0, ethosProfile } = await loadFixture(deployFixture);

      await expect(ethosProfile.connect(OTHER_0).unpause())
        .to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount')
        .withArgs(
          OTHER_0.address,
          ethers.solidityPackedKeccak256(['string'], [smartContractNames.interactionControl]),
        );
    });

    it('should revert if interactionsControlAddr != msg.sender', async () => {
      const { OWNER, WRONG_ADDRESS_0, ethosProfile, contractAddressManager, interactionControl } =
        await loadFixture(deployFixture);

      await interactionControl.connect(OWNER).pauseContract(smartContractNames.profile);

      await contractAddressManager
        .connect(OWNER)
        .updateContractAddressesForNames(
          [ethers.ZeroAddress],
          [smartContractNames.interactionControl],
        );

      await expect(ethosProfile.connect(WRONG_ADDRESS_0).unpause())
        .to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount')
        .withArgs(
          WRONG_ADDRESS_0.address,
          ethers.solidityPackedKeccak256(['string'], [smartContractNames.interactionControl]),
        );

      await expect(interactionControl.connect(OWNER).unpauseContract(smartContractNames.profile))
        .to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount')
        .withArgs(
          await interactionControl.getAddress(),
          ethers.solidityPackedKeccak256(['string'], [smartContractNames.interactionControl]),
        );
    });

    it('should unpause the contract', async () => {
      const { OWNER, ethosProfile, interactionControl } = await loadFixture(deployFixture);

      await interactionControl.connect(OWNER).pauseContract(smartContractNames.profile);
      expect(await ethosProfile.paused()).to.equal(true, 'Should be true before');

      await interactionControl.connect(OWNER).unpauseContract(smartContractNames.profile);
      expect(await ethosProfile.paused()).to.equal(false, 'Should be false after');
    });
  });
});

describe('Upgradeability', () => {
  it('should preserve storage values after upgrade', async () => {
    const [owner, admin, signer] = await ethers.getSigners();

    // Deploy required contracts first
    const SignatureVerifier = await ethers.getContractFactory('SignatureVerifier');
    const signatureVerifier = await SignatureVerifier.deploy();

    const ContractAddressManager = await ethers.getContractFactory('ContractAddressManager');
    const contractAddressManager = await ContractAddressManager.deploy();

    // Deploy implementation and proxy
    const Profile = await ethers.getContractFactory('EthosProfile');
    const implementation = await Profile.deploy();

    const Proxy = await ethers.getContractFactory('ERC1967Proxy');
    const proxy = await Proxy.deploy(
      await implementation.getAddress(),
      Profile.interface.encodeFunctionData('initialize', [
        owner.address,
        admin.address,
        signer.address,
        await signatureVerifier.getAddress(),
        await contractAddressManager.getAddress(),
      ]),
    );

    // Get contract instance
    const profile = await ethers.getContractAt('EthosProfile', await proxy.getAddress());

    // Cast role to BytesLike for type safety
    const ownerRole = (await profile.OWNER_ROLE()) as BytesLike;
    const initialOwner = await profile.getRoleMember(ownerRole, 0);

    const ProfileV2 = await ethers.getContractFactory('EthosProfile');
    const implementationV2 = await ProfileV2.deploy();

    // Get proxy with UUPSUpgradeable interface and call upgradeToAndCall with empty data
    const upgradeableProxy = await ethers.getContractAt(
      'UUPSUpgradeable',
      await proxy.getAddress(),
    );

    await upgradeableProxy.connect(owner).upgradeToAndCall(
      await implementationV2.getAddress(),
      '0x', // empty calldata
    );

    expect(await profile.getRoleMember(ownerRole, 0)).to.equal(initialOwner);
  });
});
