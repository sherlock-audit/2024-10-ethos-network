import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { type EthosProfile } from '../../typechain-types';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { type EthosUser } from '../utils/ethosUser';

describe('Updating Ethos Profiles', () => {
  let deployer: EthosDeployer;
  let ethosProfile: EthosProfile;
  let userA: EthosUser;
  let invitee1: HardhatEthersSigner;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    if (!deployer.ethosVouch.contract) {
      throw new Error('EthosVouch contract not found');
    }
    ethosProfile = deployer.ethosProfile.contract;
    userA = await deployer.createUser();
    invitee1 = await deployer.newWallet();
  });
  // eslint-disable-next-line jest/no-disabled-tests, jest/expect-expect
  it.skip('should not register address for mock profile', async () => {
    const randomAddr = '0x6ba07df6c6534a719175d28881226721c47d49a3';
    await userA.review({ address: invitee1.address });
    // TODO VALIDATE AND SIGN REGISTRATION
    await ethosProfile.connect(invitee1).registerAddress(randomAddr, 1, 0, '');
  });
  it('should not delete address from mock profile', async () => {
    await userA.review({ address: invitee1.address });
    await expect(
      ethosProfile.connect(invitee1).deleteAddressAtIndex(0),
    ).to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress');
  });
  it('should not archive profile for mock profile', async () => {
    await userA.review({ address: invitee1.address });
    await expect(ethosProfile.connect(invitee1).archiveProfile()).to.be.revertedWithCustomError(
      ethosProfile,
      'ProfileNotFoundForAddress',
    );
  });
  it('should not restore profile for mock profile', async () => {
    await userA.review({ address: invitee1.address });
    await expect(ethosProfile.connect(invitee1).restoreProfile()).to.be.revertedWithCustomError(
      ethosProfile,
      'ProfileNotFoundForAddress',
    );
  });
});
