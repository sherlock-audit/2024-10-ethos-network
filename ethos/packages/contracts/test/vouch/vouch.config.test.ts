import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';

import { type EthosVouch } from '../../typechain-types/index.js';
import { VOUCH_PARAMS } from '../utils/defaults.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

const { ethers } = hre;

describe('EthosVouch Vouching', () => {
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

  it('should be able to vouch', async () => {
    await userA.vouch(userB);
    const vouch = await ethosVouch.verifiedVouchByAuthorForSubjectProfileId(
      userA.profileId,
      userB.profileId,
    );
    expect(vouch.balance).to.be.equal(VOUCH_PARAMS.paymentAmount);
  });

  it('should not allow vouching below minimum amount', async () => {
    const minimumAmount = await ethosVouch.configuredMinimumVouchAmount();

    await expect(userA.vouch(userB, { paymentAmount: minimumAmount - 1n }))
      .to.be.revertedWithCustomError(ethosVouch, 'MinimumVouchAmount')
      .withArgs(minimumAmount);
  });

  it('should allow vouching with exact minimum amount', async () => {
    const minimumAmount = await ethosVouch.configuredMinimumVouchAmount();

    await expect(userA.vouch(userB, { paymentAmount: minimumAmount })).to.not.be.reverted;
  });

  it('should allow vouching with more than minimum amount', async () => {
    const minimumAmount = await ethosVouch.configuredMinimumVouchAmount();

    await expect(userA.vouch(userB, { paymentAmount: minimumAmount * 2n })).to.not.be.reverted;
  });

  it('should not allow setting minimum amount below 0.0001 ether', async () => {
    const minimumAmount = await ethosVouch.configuredMinimumVouchAmount();
    const tooLowAmount = minimumAmount - 1n;
    await expect(ethosVouch.connect(deployer.ADMIN).setMinimumVouchAmount(tooLowAmount))
      .to.be.revertedWithCustomError(ethosVouch, 'MinimumVouchAmount')
      .withArgs(ethers.parseEther('0.0001'));
  });

  it('should allow setting minimum amount to 0.0001 ether or higher', async () => {
    const validAmount = ethers.parseEther('0.0001');
    await expect(ethosVouch.connect(deployer.ADMIN).setMinimumVouchAmount(validAmount)).to.not.be
      .reverted;

    const higherAmount = ethers.parseEther('0.001');
    await expect(ethosVouch.connect(deployer.ADMIN).setMinimumVouchAmount(higherAmount)).to.not.be
      .reverted;
  });

  it('should not allow non-admin to set minimum vouch amount', async () => {
    const newAmount = ethers.parseEther('0.0002');
    await expect(
      ethosVouch.connect(userA.signer).setMinimumVouchAmount(newAmount),
    ).to.be.revertedWithCustomError(ethosVouch, 'AccessControlUnauthorizedAccount');
  });

  it('should not allow setting maximum vouches above 256', async () => {
    await expect(ethosVouch.connect(deployer.ADMIN).updateMaximumVouches(257))
      .to.be.revertedWithCustomError(ethosVouch, 'MaximumVouchesExceeded')
      .withArgs(257, 'Maximum vouches cannot exceed 256');
  });

  it('should not allow exceeding maximum vouches for a subject', async () => {
    // Create additional test user
    const userC = await deployer.createUser();

    // Lower maximum vouches to 2
    await ethosVouch.connect(deployer.ADMIN).updateMaximumVouches(2);

    // First two vouches should succeed
    await userA.vouch(userB);
    await userC.vouch(userB);

    // Third vouch should fail
    const userD = await deployer.createUser();
    await expect(userD.vouch(userB))
      .to.be.revertedWithCustomError(ethosVouch, 'MaximumVouchesExceeded')
      .withArgs(2, 'Exceeds subject vouch limit');
  });
});
