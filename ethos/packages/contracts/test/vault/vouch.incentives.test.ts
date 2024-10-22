import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { type EthosUser } from '../utils/ethosUser';

describe('Vouch Incentives', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  let userC: EthosUser;

  const vouchIncentives = 200n;

  async function setupVouchIncentives(): Promise<void> {
    await deployer.ethosVaultManager.contract
      .connect(deployer.ADMIN)
      .setEntryVouchersPoolFeeBasisPoints(vouchIncentives);
  }

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);
    [userA, userB, userC] = await Promise.all([
      deployer.createUser(),
      deployer.createUser(),
      deployer.createUser(),
    ]);
  });

  it('should not deduct vouch incentives for the first voucher', async () => {
    const paymentAmount = ethers.parseEther('0.1');
    await setupVouchIncentives();
    const { vouchId } = await userA.vouch(userB, { paymentAmount });
    const balance = await userA.getVouchBalance(vouchId);
    const expected = paymentAmount;
    expect(balance).to.be.closeTo(expected, 1);
  });

  it('should allow changing the vouch incentives percentage', async () => {
    const newVouchIncentives = 250n;

    // Set initial vouch incentives
    await setupVouchIncentives();
    // check the initial value
    const initialVouchIncentives =
      await deployer.ethosVaultManager.contract.getEntryVouchersPoolFeeBasisPoints();
    expect(initialVouchIncentives).to.equal(vouchIncentives);

    // Change vouch incentives
    await deployer.ethosVaultManager.contract
      .connect(deployer.ADMIN)
      .setEntryVouchersPoolFeeBasisPoints(newVouchIncentives);

    // Check the new value
    const updatedVouchIncentives =
      await deployer.ethosVaultManager.contract.getEntryVouchersPoolFeeBasisPoints();
    expect(updatedVouchIncentives).to.equal(newVouchIncentives);
  });

  it('should deduct vouch incentives for the second voucher', async () => {
    const paymentAmount: bigint = ethers.parseEther('0.1');
    await setupVouchIncentives();
    const { vouchId: vouchId0 } = await userB.vouch(userA, { paymentAmount });
    // first vouch balance should not have any vouch incentives applied (Deducted or added)
    let vouch0Balance = await userB.getVouchBalance(vouchId0);
    expect(Number(vouch0Balance - paymentAmount)).to.be.closeTo(0, 1); // gotta subtract bigints to get them in number range
    // second user vouches
    const { vouchId: vouchId1 } = await userC.vouch(userA, { paymentAmount });
    // Calculate the vouch incentive bonus
    // TODO THIS IS HARDCODED, DETERMINE IT BASED ON THE INCREASE IN STAKES
    const vouchIncentiveBonus = 1010101010101010n;
    // Check balance of the first vouch after second vouch
    vouch0Balance = await userB.getVouchBalance(vouchId0);
    // First voucher should have original payment amount plus the incentive bonus
    expect(paymentAmount + vouchIncentiveBonus - vouch0Balance).to.be.closeTo(0, 1); // gotta subtract bigints to get them in number range

    // Check balance of the second voucher
    const vouch1Balance = await userC.getVouchBalance(vouchId1);
    // Second voucher should have the payment amount minus the incentive
    expect(paymentAmount - vouchIncentiveBonus - vouch1Balance).to.be.closeTo(0, 1); // gotta subtract bigints to get them in number range
  });
});
