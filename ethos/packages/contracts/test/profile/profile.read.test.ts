import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { type EthosProfile } from '../../typechain-types';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { type EthosUser } from '../utils/ethosUser';

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
