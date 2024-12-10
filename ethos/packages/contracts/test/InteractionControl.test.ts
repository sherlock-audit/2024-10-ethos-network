import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { smartContractNames } from './utils/mock.names.js';

const { ethers } = hre;

describe('InteractionControl', () => {
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
    it('should correct params', async () => {
      const { OWNER, OTHER_0, OTHER_1, interactionControl, contractAddressManager } =
        await loadFixture(deployFixture);

      expect(await interactionControl.owner()).to.equal(OWNER.address, 'Wrong owner before');

      expect(await interactionControl.contractAddressManager()).to.equal(
        await contractAddressManager.getAddress(),
        'Wrong contractAddressManager before',
      );

      const interactionControlLocal = await ethers.deployContract('InteractionControl', [
        OTHER_0.address,
        OTHER_1.address,
      ]);
      expect(await interactionControlLocal.owner()).to.equal(OTHER_0.address, 'Wrong owner');

      expect(await interactionControl.contractAddressManager()).to.equal(
        await contractAddressManager.getAddress(),
        'Wrong contractAddressManager',
      );
    });
  });

  describe('updateContractAddressManager', () => {
    it('should revert if caller is not owner', async () => {
      const { OTHER_0, interactionControl } = await loadFixture(deployFixture);

      await expect(
        interactionControl.connect(OTHER_0).updateContractAddressManager(OTHER_0.address),
      )
        .to.be.revertedWithCustomError(interactionControl, 'OwnableUnauthorizedAccount')
        .withArgs(OTHER_0.address);
    });

    it('should update with correct address', async () => {
      const { OWNER, OTHER_0, interactionControl } = await loadFixture(deployFixture);

      await interactionControl.connect(OWNER).updateContractAddressManager(OTHER_0.address);

      expect(await interactionControl.contractAddressManager()).to.equal(
        OTHER_0.address,
        'Wrong contractAddressManager',
      );
    });
  });

  describe('getControlledContractNames', () => {
    it('should return controlled contracts', async () => {
      const { interactionControl } = await loadFixture(deployFixture);

      expect(await interactionControl.getControlledContractNames()).to.eql(
        [smartContractNames.attestation, smartContractNames.profile, smartContractNames.review],
        'Wrong controlled contracts',
      );
    });
  });

  describe('addControlledContractNames', () => {
    it('should revert if caller is not owner', async () => {
      const { OTHER_0, interactionControl } = await loadFixture(deployFixture);

      await expect(interactionControl.connect(OTHER_0).addControlledContractNames(['new name']))
        .to.be.revertedWithCustomError(interactionControl, 'OwnableUnauthorizedAccount')
        .withArgs(OTHER_0.address);
    });

    it('should add controlled contract names', async () => {
      const { OWNER, interactionControl } = await loadFixture(deployFixture);

      await interactionControl.connect(OWNER).addControlledContractNames(['new name']);

      expect(await interactionControl.getControlledContractNames()).to.eql(
        [
          smartContractNames.attestation,
          smartContractNames.profile,
          smartContractNames.review,
          'new name',
        ],
        'Wrong controlled contract names',
      );
    });
  });

  describe('removeControlledContractName', () => {
    it('should revert if caller is not owner', async () => {
      const { OTHER_0, interactionControl } = await loadFixture(deployFixture);

      await expect(
        interactionControl
          .connect(OTHER_0)
          .removeControlledContractName(smartContractNames.profile),
      )
        .to.be.revertedWithCustomError(interactionControl, 'OwnableUnauthorizedAccount')
        .withArgs(OTHER_0.address);
    });

    it('should remove controlled contracts', async () => {
      const { OWNER, interactionControl } = await loadFixture(deployFixture);

      await interactionControl
        .connect(OWNER)
        .removeControlledContractName(smartContractNames.profile);

      expect(await interactionControl.getControlledContractNames()).to.eql([
        smartContractNames.attestation,
        smartContractNames.review,
      ]);
    });

    it('should do nothing if contract is not controlled', async () => {
      const { OWNER, interactionControl } = await loadFixture(deployFixture);

      await interactionControl.connect(OWNER).removeControlledContractName('non-existing name');

      expect(await interactionControl.getControlledContractNames()).to.eql([
        smartContractNames.attestation,
        smartContractNames.profile,
        smartContractNames.review,
      ]);
    });
  });

  describe('pauseAll', () => {
    it('should revert if wrong address for contractAddressManager', async () => {
      const { OTHER_0, interactionControl } = await loadFixture(deployFixture);

      await interactionControl.updateContractAddressManager(OTHER_0.address);

      await expect(interactionControl.pauseAll()).to.be.revertedWithoutReason();
    });

    it('should revert if caller is not owner', async () => {
      const { OTHER_0, interactionControl } = await loadFixture(deployFixture);

      await expect(interactionControl.connect(OTHER_0).pauseAll())
        .to.be.revertedWithCustomError(interactionControl, 'OwnableUnauthorizedAccount')
        .withArgs(OTHER_0.address);
    });

    it('should pause all controlled contracts', async () => {
      const { OWNER, interactionControl, ethosAttestation, ethosProfile, ethosReview } =
        await loadFixture(deployFixture);

      await interactionControl.connect(OWNER).pauseAll();

      expect(await ethosAttestation.paused()).to.be.eq(true);
      expect(await ethosProfile.paused()).to.be.eq(true);
      expect(await ethosReview.paused()).to.be.eq(true);
    });

    it('should skip already paused contracts', async () => {
      const { OWNER, interactionControl, ethosAttestation, ethosProfile, ethosReview } =
        await loadFixture(deployFixture);

      // First pause just one contract through InteractionControl
      await interactionControl.connect(OWNER).pauseContract(smartContractNames.attestation);
      expect(await ethosAttestation.paused()).to.be.eq(true);
      expect(await ethosProfile.paused()).to.be.eq(false);
      expect(await ethosReview.paused()).to.be.eq(false);

      // pauseAll should work without reverting
      await interactionControl.connect(OWNER).pauseAll();

      // All contracts should now be paused
      expect(await ethosAttestation.paused()).to.be.eq(true);
      expect(await ethosProfile.paused()).to.be.eq(true);
      expect(await ethosReview.paused()).to.be.eq(true);
    });
  });

  describe('unpauseAll', () => {
    it('should revert if wrong address for contractAddressManager', async () => {
      const { OTHER_0, interactionControl } = await loadFixture(deployFixture);

      await interactionControl.updateContractAddressManager(OTHER_0.address);

      await expect(interactionControl.unpauseAll()).to.be.revertedWithoutReason();
    });

    it('should revert if caller is not owner', async () => {
      const { OTHER_0, interactionControl } = await loadFixture(deployFixture);

      await expect(interactionControl.connect(OTHER_0).unpauseAll())
        .to.be.revertedWithCustomError(interactionControl, 'OwnableUnauthorizedAccount')
        .withArgs(OTHER_0.address);
    });

    it('should unpause all controlled contracts', async () => {
      const { OWNER, interactionControl, ethosAttestation, ethosProfile, ethosReview } =
        await loadFixture(deployFixture);

      expect(await ethosAttestation.paused()).to.be.eq(false);
      expect(await ethosProfile.paused()).to.be.eq(false);
      expect(await ethosReview.paused()).to.be.eq(false);

      await interactionControl.connect(OWNER).pauseAll();
      expect(await ethosAttestation.paused()).to.be.eq(true);
      expect(await ethosProfile.paused()).to.be.eq(true);
      expect(await ethosReview.paused()).to.be.eq(true);

      await interactionControl.connect(OWNER).unpauseAll();
      expect(await ethosAttestation.paused()).to.be.eq(false);
      expect(await ethosProfile.paused()).to.be.eq(false);
      expect(await ethosReview.paused()).to.be.eq(false);
    });

    it('should skip already unpaused contracts', async () => {
      const { OWNER, interactionControl, ethosAttestation, ethosProfile, ethosReview } =
        await loadFixture(deployFixture);

      // First pause all contracts
      await interactionControl.connect(OWNER).pauseAll();
      expect(await ethosAttestation.paused()).to.be.eq(true);
      expect(await ethosProfile.paused()).to.be.eq(true);
      expect(await ethosReview.paused()).to.be.eq(true);

      // Then unpause just one contract through InteractionControl
      await interactionControl.connect(OWNER).unpauseContract(smartContractNames.attestation);
      expect(await ethosAttestation.paused()).to.be.eq(false);
      expect(await ethosProfile.paused()).to.be.eq(true);
      expect(await ethosReview.paused()).to.be.eq(true);

      // unpauseAll should work without reverting
      await interactionControl.connect(OWNER).unpauseAll();

      // All contracts should now be unpaused
      expect(await ethosAttestation.paused()).to.be.eq(false);
      expect(await ethosProfile.paused()).to.be.eq(false);
      expect(await ethosReview.paused()).to.be.eq(false);
    });
  });

  describe('pauseContract', () => {
    it('should revert if caller is not owner', async () => {
      const { OTHER_0, interactionControl } = await loadFixture(deployFixture);

      await expect(interactionControl.connect(OTHER_0).pauseContract(OTHER_0.address))
        .to.be.revertedWithCustomError(interactionControl, 'OwnableUnauthorizedAccount')
        .withArgs(OTHER_0.address);
    });

    it('should revert if non-existing contract name', async () => {
      const { OWNER, interactionControl } = await loadFixture(deployFixture);

      await expect(
        interactionControl.connect(OWNER).pauseContract('non-existing name'),
      ).to.be.revertedWithoutReason();
    });

    it('should pause controlled contract', async () => {
      const { OWNER, interactionControl, ethosAttestation } = await loadFixture(deployFixture);

      expect(await ethosAttestation.paused()).to.be.eq(false);

      await interactionControl.connect(OWNER).pauseContract(smartContractNames.attestation);
      expect(await ethosAttestation.paused()).to.be.eq(true);
    });
  });

  describe('unpauseContract', () => {
    it('should revert if caller is not owner', async () => {
      const { OTHER_0, interactionControl } = await loadFixture(deployFixture);

      await expect(interactionControl.connect(OTHER_0).unpauseContract(OTHER_0.address))
        .to.be.revertedWithCustomError(interactionControl, 'OwnableUnauthorizedAccount')
        .withArgs(OTHER_0.address);
    });

    it('should revert if non-existing contract name', async () => {
      const { OWNER, interactionControl } = await loadFixture(deployFixture);

      await expect(
        interactionControl.connect(OWNER).unpauseContract('non-existing name'),
      ).to.be.revertedWithoutReason();
    });

    it('should unpause controlled contract', async () => {
      const { OWNER, interactionControl, ethosAttestation } = await loadFixture(deployFixture);

      expect(await ethosAttestation.paused()).to.be.eq(false);

      await interactionControl.connect(OWNER).pauseContract(smartContractNames.attestation);
      expect(await ethosAttestation.paused()).to.be.eq(true);

      await interactionControl.connect(OWNER).unpauseContract(smartContractNames.attestation);
      expect(await ethosAttestation.paused()).to.be.eq(false);

      await interactionControl.connect(OWNER).pauseContract(smartContractNames.attestation);
      expect(await ethosAttestation.paused()).to.be.eq(true);

      await interactionControl.connect(OWNER).unpauseContract(smartContractNames.attestation);
      expect(await ethosAttestation.paused()).to.be.eq(false);
    });
  });
});
