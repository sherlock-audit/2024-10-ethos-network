import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import { type EthosVouch } from '../../typechain-types/index.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

describe('EthosVouch Unvouching', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  let ethosVouch: EthosVouch;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    [userA, userB] = await Promise.all([deployer.createUser(), deployer.createUser()]);

    if (!deployer.ethosVouch.contract) {
      throw new Error('EthosVouch contract not found');
    }
    ethosVouch = deployer.ethosVouch.contract;
  });

  it('should be able to unvouchUnhealthy to unvouch and mark unhealty at the same time', async () => {
    await userA.vouch(userB);
    let vouch = await ethosVouch.verifiedVouchByAuthorForSubjectProfileId(
      userA.profileId,
      userB.profileId,
    );
    await ethosVouch.connect(userA.signer).unvouchUnhealthy(vouch.vouchId);
    vouch = await ethosVouch.vouches(vouch.vouchId);
    expect(vouch.activityCheckpoints.unhealthyAt).to.be.greaterThan(0);
    expect(vouch.activityCheckpoints.unvouchedAt).to.be.greaterThan(0);
    expect(vouch.activityCheckpoints.unhealthyAt).to.be.equal(
      vouch.activityCheckpoints.unvouchedAt,
    );
  });

  it('should revert markUnhealthy with CannotMarkVouchAsUnhealthy due to already unhealthy', async () => {
    await userA.vouch(userB);

    await ethosVouch.connect(userA.signer).unvouch(0);
    await ethosVouch.connect(userA.signer).markUnhealthy(0);

    await expect(ethosVouch.connect(userA.signer).markUnhealthy(0))
      .to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'CannotMarkVouchAsUnhealthy')
      .withArgs(0);
  });

  it('should revert markUnhealthy with CannotMarkVouchAsUnhealthy due to not unvouched', async () => {
    await userA.vouch(userB);

    await expect(ethosVouch.connect(userA.signer).markUnhealthy(0))
      .to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'CannotMarkVouchAsUnhealthy')
      .withArgs(0);
  });

  it('should revert markUnhealthy with CannotMarkVouchAsUnhealthy due to unhealthy response time', async () => {
    await userA.vouch(userB);

    await ethosVouch.connect(userA.signer).unvouch(0);

    await time.increase(86401);

    await expect(ethosVouch.connect(userA.signer).markUnhealthy(0))
      .to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'CannotMarkVouchAsUnhealthy')
      .withArgs(0);
  });

  it('should allow unvouching using a different registered address under the same profile', async () => {
    // Create vouch from userA to userB
    await userA.vouch(userB);
    const vouch = await ethosVouch.verifiedVouchByAuthorForSubjectProfileId(
      userA.profileId,
      userB.profileId,
    );

    // Register a new address for userA
    const newAddress = await deployer.newWallet();
    await userA.registerAddress(newAddress.address);

    // Attempt to unvouch using the new address
    await expect(ethosVouch.connect(newAddress).unvouch(vouch.vouchId))
      .to.be.revertedWithCustomError(ethosVouch, 'AddressNotVouchAuthor')
      .withArgs(vouch.vouchId, newAddress.address, userA.signer.address);

    // Verify vouch is not unvouched
    const updatedVouch = await ethosVouch.vouches(vouch.vouchId);
    expect(updatedVouch.activityCheckpoints.unvouchedAt).to.be.equal(0);
  });

  it('should allow vouching after unvouching when at max vouch limit', async () => {
    // Set a low maximum vouches limit for testing
    await ethosVouch.connect(deployer.ADMIN).updateMaximumVouches(2);

    // Create additional users to vouch for
    const [userC, userD] = await Promise.all([deployer.createUser(), deployer.createUser()]);

    // Vouch up to the maximum limit
    await userA.vouch(userB);
    await userA.vouch(userC);

    // Try to vouch for userD - should fail due to max limit
    await expect(userA.vouch(userD))
      .to.be.revertedWithCustomError(ethosVouch, 'MaximumVouchesExceeded')
      .withArgs(2, 'Exceeds author vouch limit');

    // Unvouch one user
    const vouch = await ethosVouch.verifiedVouchByAuthorForSubjectProfileId(
      userA.profileId,
      userB.profileId,
    );
    await ethosVouch.connect(userA.signer).unvouch(vouch.vouchId);

    // Should now be able to vouch for userD
    await expect(userA.vouch(userD)).to.not.be.reverted;
  });

  it('should allow unvouching from a compromised address', async () => {
    // Create vouch from userA to userB
    await userA.vouch(userB);
    const vouch = await ethosVouch.verifiedVouchByAuthorForSubjectProfileId(
      userA.profileId,
      userB.profileId,
    );
    // Add an address to userA's profile
    const newAddress = await deployer.newWallet();
    await userA.registerAddress(newAddress.address);
    // Delete userA's address and mark it as compromised
    await deployer.ethosProfile.contract.connect(newAddress).deleteAddressAtIndex(0, true);

    // Attempt to unvouch using the compromised address
    await expect(ethosVouch.connect(userA.signer).unvouch(vouch.vouchId)).to.not.be.reverted;

    // Verify vouch is unvouched
    const updatedVouch = await ethosVouch.vouches(vouch.vouchId);
    expect(updatedVouch.activityCheckpoints.unvouchedAt).to.be.greaterThan(0);
  });
});
