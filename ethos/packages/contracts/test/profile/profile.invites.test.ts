import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';

import { zeroAddress } from 'viem';
import { type EthosProfile } from '../../typechain-types/index.js';

import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

describe('EthosProfile Invites', () => {
  let deployer: EthosDeployer;
  let ethosProfile: EthosProfile;
  let OWNER: HardhatEthersSigner;
  let userA: EthosUser;
  let userB: EthosUser;
  let nonEthosUser: HardhatEthersSigner;

  const invitees = [
    '0x1234567890123456789012345678901234567890',
    '0x2345678901234567890123456789012345678901',
    '0x3456789012345678901234567890123456789012',
  ];

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);
    OWNER = deployer.OWNER;
    userA = await deployer.createUser();
    userB = await deployer.createUser();
    nonEthosUser = await deployer.newWallet();

    if (!deployer.ethosVouch.contract) {
      throw new Error('EthosVouch contract not found');
    }
    ethosProfile = deployer.ethosProfile.contract;
  });

  it('should revert if profile invites same address twice', async () => {
    await ethosProfile.connect(OWNER).inviteAddress(nonEthosUser.address);

    await expect(
      ethosProfile.connect(OWNER).inviteAddress(nonEthosUser.address),
    ).to.be.revertedWithCustomError(ethosProfile, 'AddressAlreadyInvited');
  });

  it('should correctly update sentAt mapping', async () => {
    await ethosProfile.connect(OWNER).inviteAddress(nonEthosUser.address);

    expect(await ethosProfile.sentAt(1, nonEthosUser.address)).to.be.greaterThan(0);
  });

  it('should revert on getProfile', async () => {
    await expect(ethosProfile.getProfile(0))
      .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFound')
      .withArgs(0);
    await expect(ethosProfile.getProfile(4))
      .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFound')
      .withArgs(4);
  });

  it('should be able to reinvite after uninvite', async () => {
    await ethosProfile.connect(OWNER).inviteAddress(nonEthosUser.address);
    await ethosProfile.connect(OWNER).uninviteUser(nonEthosUser.address);
    expect(await ethosProfile.sentAt(1, nonEthosUser.address)).to.be.equal(0);

    await ethosProfile.connect(OWNER).inviteAddress(nonEthosUser.address);
    expect(await ethosProfile.sentAt(1, nonEthosUser.address)).to.be.greaterThan(0);
  });

  it('should correctly bulk invite multiple addresses', async function () {
    await ethosProfile.connect(OWNER).bulkInviteAddresses(invitees);

    for (const invitee of invitees) {
      expect(await ethosProfile.sentAt(1, invitee)).to.be.greaterThan(0);
    }
  });

  it('should revert bulk invite if one address is already invited', async function () {
    await ethosProfile.connect(OWNER).inviteAddress(invitees[1]);
    await expect(
      ethosProfile.connect(OWNER).bulkInviteAddresses(invitees),
    ).to.be.revertedWithCustomError(ethosProfile, 'AddressAlreadyInvited');
  });

  it('should correctly deduct invites', async () => {
    let invites = 10;
    await userA.grantInvites(invites);
    const inviteInfo = await userA.getInviteInfo();
    expect(inviteInfo.available).to.equal(invites);

    for (const invitee of invitees) {
      await userA.sendInvite(invitee);
      invites--;
      const inviteInfo = await userA.getInviteInfo();
      expect(inviteInfo.available).to.equal(invites);
    }
  });

  it('should return blank invitation info for non-existent profiles', async () => {
    const inviteInfo = await ethosProfile.inviteInfoForProfileId(54321);
    expect(inviteInfo.available).to.equal(0);
    expect(inviteInfo.acceptedIds.length).to.equal(0);
    expect(inviteInfo.sent.length).to.equal(0);
    expect(inviteInfo.invitedBy).to.equal(zeroAddress);
  });

  it('should correctly add invitee to sent array', async () => {
    await userA.grantInvites(invitees.length);

    for (const invitee of invitees) {
      await userA.sendInvite(invitee);
    }
    const inviteInfo = await userA.getInviteInfo();
    expect(inviteInfo.sent).to.deep.equal(invitees);
  });

  it('should fail if inviting an address that already has a profile', async () => {
    await userA.grantInvites(5);
    await userB.grantInvites(5);
    await userA.sendInvite(nonEthosUser.address);
    await ethosProfile.connect(nonEthosUser).createProfile(userA.profileId);
    await expect(userB.sendInvite(nonEthosUser.address)).to.be.revertedWithCustomError(
      ethosProfile,
      'ProfileExistsForAddress',
    );
  });

  it('should not create a profile from an archived sender', async () => {
    await userA.grantInvites(1);
    await userA.sendInvite(nonEthosUser.address);
    await userA.archiveProfile();
    await expect(
      ethosProfile.connect(nonEthosUser).createProfile(userA.profileId),
    ).to.be.revertedWithCustomError(ethosProfile, 'InvalidSender');
  });

  it('should not allow a mock profile to be created without an invitation', async () => {
    await userA.grantInvites(1);
    await userA.review({ address: nonEthosUser.address });
    await expect(
      ethosProfile.connect(nonEthosUser).createProfile(userA.profileId),
    ).to.be.revertedWithCustomError(ethosProfile, 'AddressNotInvited');
  });

  it('should not allow granting invites to a mock profile', async () => {
    await userA.review({ address: nonEthosUser.address });
    await expect(
      ethosProfile.connect(deployer.ADMIN).addInvites(nonEthosUser.address, 1),
    ).to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress');
  });

  it('should not add invites to an archived profile', async () => {
    await userA.archiveProfile();
    await expect(userA.grantInvites(1)).to.be.revertedWithCustomError(
      ethosProfile,
      'ProfileNotFoundForAddress',
    );
  });

  it('should not grant invites to profileid = 0', async () => {
    await expect(
      ethosProfile.connect(deployer.ADMIN).addInvites(zeroAddress, 1),
    ).to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress');
  });

  it('should not send invite from archived profile', async () => {
    await userA.grantInvites(1);
    await userA.archiveProfile();
    await expect(userA.sendInvite(nonEthosUser.address)).to.be.revertedWithCustomError(
      ethosProfile,
      'InvalidSender',
    );
  });

  it('should not allow adding invites beyond maxNumberOfInvites', async () => {
    const maxInvites = await ethosProfile.maxNumberOfInvites();
    await userA.grantInvites(Number(maxInvites));

    await expect(userA.grantInvites(1))
      .to.be.revertedWithCustomError(ethosProfile, 'MaxInvitesReached')
      .withArgs(userA.profileId);
  });

  it('should not allow setting defaultNumberOfInvites higher than maxNumberOfInvites', async () => {
    const maxInvites = await ethosProfile.maxNumberOfInvites();

    await expect(
      ethosProfile.connect(deployer.ADMIN).setDefaultNumberOfInvites(Number(maxInvites) + 1),
    )
      .to.be.revertedWithCustomError(ethosProfile, 'MaxInvitesReached')
      .withArgs(0);
  });

  it('should allow setting defaultNumberOfInvites equal to maxNumberOfInvites', async () => {
    const maxInvites = await ethosProfile.maxNumberOfInvites();

    await expect(ethosProfile.connect(deployer.ADMIN).setDefaultNumberOfInvites(Number(maxInvites)))
      .to.not.be.reverted;

    expect(await ethosProfile.defaultNumberOfInvites()).to.equal(maxInvites);
  });

  it('should count sent and accepted invites towards maxNumberOfInvites', async () => {
    const maxInvites = await ethosProfile.maxNumberOfInvites();
    await userA.grantInvites(Number(maxInvites));

    await userA.sendInvite(nonEthosUser.address);
    await expect(userA.grantInvites(1))
      .to.be.revertedWithCustomError(ethosProfile, 'MaxInvitesReached')
      .withArgs(userA.profileId);

    await ethosProfile.connect(nonEthosUser).createProfile(userA.profileId);

    await expect(userA.grantInvites(1))
      .to.be.revertedWithCustomError(ethosProfile, 'MaxInvitesReached')
      .withArgs(userA.profileId);
  });

  it('should allow admin to set max invites', async () => {
    const newMaxInvites = 1000;
    await expect(ethosProfile.connect(deployer.ADMIN).setMaxInvites(newMaxInvites)).to.not.be
      .reverted;

    expect(await ethosProfile.maxNumberOfInvites()).to.equal(newMaxInvites);
  });

  it('should revert when non-admin tries to set max invites', async () => {
    const newMaxInvites = 1000;
    await expect(
      ethosProfile.connect(userA.signer).setMaxInvites(newMaxInvites),
    ).to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount');
  });

  it('should revert when trying to set max invites above 2048', async () => {
    const newMaxInvites = 2049;
    await expect(ethosProfile.connect(deployer.ADMIN).setMaxInvites(newMaxInvites))
      .to.be.revertedWithCustomError(ethosProfile, 'MaxInvitesReached')
      .withArgs(0);
  });

  it('should allow setting max invites to 2048', async () => {
    const newMaxInvites = 2048;
    await expect(ethosProfile.connect(deployer.ADMIN).setMaxInvites(newMaxInvites)).to.not.be
      .reverted;

    expect(await ethosProfile.maxNumberOfInvites()).to.equal(newMaxInvites);
  });

  it('should fail to invite an address that has been compromised', async () => {
    // Step 1: userA registers a new address
    const newAddress = await deployer.newWallet();
    await userA.registerAddress(newAddress.address);

    // Step 2: userA removes the registered address
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1, true);

    // Step 3: userB attempts to send an invite to the removed address
    await userB.grantInvites(1);
    await expect(userB.sendInvite(newAddress.address)).to.be.revertedWithCustomError(
      ethosProfile,
      'AddressCompromised',
    );
  });

  it('should not uninvite from archived profile', async () => {
    await userA.grantInvites(1);
    await userA.sendInvite(nonEthosUser.address);
    await userA.archiveProfile();

    await expect(ethosProfile.connect(userA.signer).uninviteUser(nonEthosUser.address))
      .to.be.revertedWithCustomError(ethosProfile, 'ProfileAccess')
      .withArgs(userA.profileId, 'Profile is archived');
  });
});
