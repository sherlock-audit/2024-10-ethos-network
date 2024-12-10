import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import { type EthosProfile } from '../../typechain-types/index.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

describe('Reading Ethos Profiles', () => {
  let deployer: EthosDeployer;
  let ethosProfile: EthosProfile;
  let userA: EthosUser;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    if (!deployer.ethosVouch.contract) {
      throw new Error('EthosVouch contract not found');
    }
    ethosProfile = deployer.ethosProfile.contract;
    userA = await deployer.createUser();
  });

  it('should revert for verifiedProfileIdForAddress for archived profile', async () => {
    await userA.archiveProfile();
    await expect(
      ethosProfile.verifiedProfileIdForAddress(userA.signer.address),
    ).to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress');
  });
});
