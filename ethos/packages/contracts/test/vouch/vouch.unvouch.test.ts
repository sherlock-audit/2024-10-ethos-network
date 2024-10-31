import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { type EthosVouch } from '../../typechain-types';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { type EthosUser } from '../utils/ethosUser';

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
});
