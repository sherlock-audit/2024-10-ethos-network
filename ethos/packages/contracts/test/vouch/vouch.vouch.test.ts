import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { type WETH9, type EthosVouch } from '../../typechain-types';
import { VOUCH_PARAMS } from '../utils/defaults';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { type EthosUser } from '../utils/ethosUser';

describe('EthosVouch Vouching', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  let ethosVouch: EthosVouch;
  let weth9: WETH9;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);
    [userA, userB] = await Promise.all([deployer.createUser(), deployer.createUser()]);

    if (!deployer.ethosVouch.contract) {
      throw new Error('EthosVouch contract not found');
    }
    ethosVouch = deployer.ethosVouch.contract;

    if (!deployer.weth9.contract) {
      throw new Error('WETH9 contract not found');
    }
    weth9 = deployer.weth9.contract;
  });

  it('should be able to vouch', async () => {
    await userA.vouch(userB);
    const vouch = await ethosVouch.verifiedVouchByAuthorForSubjectProfileId(
      userA.profileId,
      userB.profileId,
    );
    const userBVault = await userB.getVault();
    expect(await weth9.balanceOf(userBVault.address)).to.be.equal(VOUCH_PARAMS.paymentAmount);
    expect(await userA.getVouchBalance(vouch.vouchId)).to.be.equal(VOUCH_PARAMS.paymentAmount);
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
});
