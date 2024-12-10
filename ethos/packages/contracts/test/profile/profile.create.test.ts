import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import { type EthosProfile } from '../../typechain-types/index.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

describe('Creating Ethos Profiles', () => {
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

  it('should re-use the same profileId when an address matches a mock', async () => {
    await userA.review({ address: invitee1.address });
    const mockProfileId = await ethosProfile.profileIdByAddress(invitee1.address);
    await userA.grantInvites(1);
    await userA.sendInvite(invitee1.address);
    await ethosProfile.connect(invitee1).createProfile(userA.profileId);
    const newProfileId = await ethosProfile.profileIdByAddress(invitee1.address);
    expect(newProfileId).to.equal(mockProfileId);
  });

  it('should not create profile when you already have one', async () => {
    const userB = await deployer.createUser();
    await userA.grantInvites(5);
    await userB.grantInvites(5);
    await userA.sendInvite(invitee1.address);
    await userB.sendInvite(invitee1.address);
    await ethosProfile.connect(invitee1).createProfile(userB.profileId);
    await expect(
      ethosProfile.connect(invitee1).createProfile(userA.profileId),
    ).to.be.revertedWithCustomError(ethosProfile, 'ProfileExists');
  });

  it('should not create profile when yours is archived', async () => {
    const userB = await deployer.createUser();
    await userA.grantInvites(5);
    await userB.grantInvites(5);
    await userA.sendInvite(invitee1.address);
    await userB.sendInvite(invitee1.address);
    await ethosProfile.connect(invitee1).createProfile(userA.profileId);
    await ethosProfile.connect(invitee1).archiveProfile();
    await expect(
      ethosProfile.connect(invitee1).createProfile(userB.profileId),
    ).to.be.revertedWithCustomError(ethosProfile, 'ProfileExists');
  });
});
