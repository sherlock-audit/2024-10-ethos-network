import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import { type EthosProfile } from '../../typechain-types/index.js';
import { common } from '../utils/common.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

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

  it('should not allow a mock profile to register an address', async () => {
    const randValue = Math.floor(Math.random() * 1000000);

    await userA.review({ address: invitee1.address });

    const signature = await common.signatureForRegisterAddress(
      invitee1.address,
      userA.profileId.toString(),
      randValue.toString(),
      deployer.EXPECTED_SIGNER,
    );

    await expect(
      ethosProfile
        .connect(invitee1)
        .registerAddress(invitee1.address, userA.profileId, randValue, signature),
    ).to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress');
  });

  it('should not delete address from mock profile', async () => {
    await userA.review({ address: invitee1.address });
    await expect(
      ethosProfile.connect(invitee1).deleteAddressAtIndex(0, false),
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
