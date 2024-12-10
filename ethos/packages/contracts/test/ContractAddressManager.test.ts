import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { smartContractNames } from './utils/mock.names.js';

const { ethers } = hre;

describe('ContractAddressManager', () => {
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
    const contractAddressManager = await ethers.deployContract('ContractAddressManager', []);

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
      contractAddressManager,
    };
  }
  describe('constructor', () => {
    it('should set the owner', async () => {
      const { OWNER, contractAddressManager } = await loadFixture(deployFixture);
      expect(await contractAddressManager.owner()).to.equal(OWNER.address, 'Wrong owner');
    });
  });

  describe('updateContractAddressesForNames', () => {
    it('should revert if not called by the owner', async () => {
      const { OTHER_0, OTHER_1, contractAddressManager } = await loadFixture(deployFixture);

      await expect(
        contractAddressManager
          .connect(OTHER_0)
          .updateContractAddressesForNames([OTHER_1.address], [smartContractNames.profile]),
      )
        .to.be.revertedWithCustomError(contractAddressManager, 'OwnableUnauthorizedAccount')
        .withArgs(OTHER_0.address);
    });

    it('should revert if InvalidInputLength', async () => {
      const { OWNER, OTHER_0, OTHER_1, contractAddressManager } = await loadFixture(deployFixture);

      await expect(
        contractAddressManager
          .connect(OWNER)
          .updateContractAddressesForNames(
            [OTHER_0.address, OTHER_1.address],
            [smartContractNames.profile],
          ),
      ).to.be.revertedWithCustomError(contractAddressManager, 'InvalidInputLength');

      await expect(
        contractAddressManager
          .connect(OWNER)
          .updateContractAddressesForNames(
            [OTHER_0.address],
            [smartContractNames.profile, smartContractNames.review],
          ),
      ).to.be.revertedWithCustomError(contractAddressManager, 'InvalidInputLength');
    });

    it('should update with corect names & addresses', async () => {
      const {
        OWNER,
        OTHER_0,
        OTHER_1,
        PROFILE_CREATOR_0,
        PROFILE_CREATOR_1,
        contractAddressManager,
      } = await loadFixture(deployFixture);

      // 0
      await contractAddressManager
        .connect(OWNER)
        .updateContractAddressesForNames([OTHER_0.address], [smartContractNames.profile]);

      expect(
        await contractAddressManager.getContractAddressForName(smartContractNames.profile),
      ).to.equal(OTHER_0.address, 'Wrong for 0');

      // 1
      await contractAddressManager
        .connect(OWNER)
        .updateContractAddressesForNames(
          [OTHER_1.address, PROFILE_CREATOR_0.address],
          [smartContractNames.review, smartContractNames.attestation],
        );

      expect(
        await contractAddressManager.getContractAddressForName(smartContractNames.review),
      ).to.equal(OTHER_1.address, 'Wrong for 1 review');
      expect(
        await contractAddressManager.getContractAddressForName(smartContractNames.attestation),
      ).to.equal(PROFILE_CREATOR_0.address, 'Wrong for 1 attestation');

      // 2
      await contractAddressManager
        .connect(OWNER)
        .updateContractAddressesForNames(
          [OTHER_1.address, PROFILE_CREATOR_1.address],
          [smartContractNames.profile, smartContractNames.review],
        );

      expect(
        await contractAddressManager.getContractAddressForName(smartContractNames.profile),
      ).to.equal(OTHER_1.address, 'Wrong for 2 profile');
      expect(
        await contractAddressManager.getContractAddressForName(smartContractNames.review),
      ).to.equal(PROFILE_CREATOR_1.address, 'Wrong for 2 review');
    });
  });

  describe('getContractAddressForName', () => {
    it('should return the correct address for name', async () => {
      const {
        OWNER,
        OTHER_0,
        OTHER_1,
        PROFILE_CREATOR_0,
        PROFILE_CREATOR_1,
        contractAddressManager,
      } = await loadFixture(deployFixture);

      // 0
      await contractAddressManager
        .connect(OWNER)
        .updateContractAddressesForNames([OTHER_0.address], [smartContractNames.profile]);

      expect(
        await contractAddressManager.getContractAddressForName(smartContractNames.profile),
      ).to.equal(OTHER_0.address, 'Wrong for 0');

      // 1
      await contractAddressManager
        .connect(OWNER)
        .updateContractAddressesForNames(
          [OTHER_1.address, PROFILE_CREATOR_0.address],
          [smartContractNames.review, smartContractNames.attestation],
        );

      expect(
        await contractAddressManager.getContractAddressForName(smartContractNames.review),
      ).to.equal(OTHER_1.address, 'Wrong for 1 review');
      expect(
        await contractAddressManager.getContractAddressForName(smartContractNames.attestation),
      ).to.equal(PROFILE_CREATOR_0.address, 'Wrong for 1 attestation');

      // 2
      await contractAddressManager
        .connect(OWNER)
        .updateContractAddressesForNames(
          [OTHER_1.address, PROFILE_CREATOR_1.address],
          [smartContractNames.profile, smartContractNames.review],
        );

      expect(
        await contractAddressManager.getContractAddressForName(smartContractNames.profile),
      ).to.equal(OTHER_1.address, 'Wrong for 2 profile');
      expect(
        await contractAddressManager.getContractAddressForName(smartContractNames.review),
      ).to.equal(PROFILE_CREATOR_1.address, 'Wrong for 2 review');
    });
  });
});
