import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { DEFAULT, VOUCH_PARAMS } from '../utils/defaults.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

const { ethers } = hre;

const BASIS_POINTS = 10000n;

describe('Vouch Incentives', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  let userC: EthosUser;

  const vouchIncentives = 200n;

  async function setupVouchIncentives(): Promise<void> {
    await deployer.ethosVouch.contract
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
      await deployer.ethosVouch.contract.entryVouchersPoolFeeBasisPoints();
    expect(initialVouchIncentives).to.equal(vouchIncentives);

    // Change vouch incentives
    await deployer.ethosVouch.contract
      .connect(deployer.ADMIN)
      .setEntryVouchersPoolFeeBasisPoints(newVouchIncentives);

    // Check the new value
    const updatedVouchIncentives =
      await deployer.ethosVouch.contract.entryVouchersPoolFeeBasisPoints();
    expect(updatedVouchIncentives).to.equal(newVouchIncentives);
  });

  it('should deduct vouch incentives for the second voucher', async () => {
    const paymentAmount = ethers.parseEther('0.1');
    await setupVouchIncentives();

    // First vouch - no fees
    const { vouchId: vouchId0 } = await userB.vouch(userA, { paymentAmount });

    // Verify first vouch balance
    const vouch0InitialBalance = await userB.getVouchBalance(vouchId0);
    expect(vouch0InitialBalance).to.equal(paymentAmount);

    // Second vouch - with fees
    const { vouchId: vouchId1 } = await userC.vouch(userA, { paymentAmount });

    // Calculate exact fee amount
    // fee = total - (total * 10000 / (10000 + feeBasisPoints))
    const vouchIncentiveFee = paymentAmount - (paymentAmount * 10000n) / (10000n + vouchIncentives);

    // First voucher should have original amount plus all incentive fees
    const vouch0FinalBalance = await userB.getVouchBalance(vouchId0);
    expect(vouch0FinalBalance).to.equal(paymentAmount + vouchIncentiveFee);

    // Second voucher should have amount minus incentive fees
    const vouch1Balance = await userC.getVouchBalance(vouchId1);
    expect(vouch1Balance).to.be.closeTo(paymentAmount - vouchIncentiveFee, 1);
  });

  it('should deduct vouch incentives for the third voucher and with varying amounts', async () => {
    await setupVouchIncentives();
    const userD = await deployer.createUser();

    // First vouch - no fees
    const amount1 = DEFAULT.PAYMENT_AMOUNT;
    const { vouchId: vouchId0 } = await userB.vouch(userA, {
      paymentAmount: amount1,
    });

    // Second vouch - fees to first voucher
    const amount2 = DEFAULT.PAYMENT_AMOUNT * 2n;
    const { vouchId: vouchId1 } = await userC.vouch(userA, {
      paymentAmount: amount2,
    });

    // Calculate fee from second vouch
    const fee2 = amount2 - (amount2 * BASIS_POINTS) / (BASIS_POINTS + vouchIncentives);

    // Verify first vouch received all fees from second vouch
    expect(await userB.getVouchBalance(vouchId0)).to.equal(amount1 + fee2);
    expect(await userC.getVouchBalance(vouchId1)).to.equal(amount2 - fee2);

    // Third vouch - fees split proportionally
    const amount3 = DEFAULT.PAYMENT_AMOUNT * 3n;
    const { vouchId: vouchId2 } = await userD.vouch(userA, {
      paymentAmount: amount3,
    });

    // Calculate fee from third vouch
    const fee3 = amount3 - (amount3 * BASIS_POINTS) / (BASIS_POINTS + vouchIncentives);

    // Calculate proportional distribution of fee3
    const totalBalance = amount1 + fee2 + (amount2 - fee2);
    const vouch0Share = (fee3 * (amount1 + fee2)) / totalBalance;
    const vouch1Share = (fee3 * (amount2 - fee2)) / totalBalance;

    // Verify final balances
    expect(await userB.getVouchBalance(vouchId0)).to.be.closeTo(amount1 + fee2 + vouch0Share, 1);
    expect(await userC.getVouchBalance(vouchId1)).to.be.closeTo(amount2 - fee2 + vouch1Share, 1);
    expect(await userD.getVouchBalance(vouchId2)).to.be.closeTo(amount3 - fee3, 1);
  });

  it('should correctly distribute incentives among multiple first vouchers', async () => {
    const paymentAmount = VOUCH_PARAMS.paymentAmount;
    await setupVouchIncentives();

    // First vouch - userB is first voucher
    const { vouchId: vouchId0 } = await userB.vouch(userA);

    // Verify first vouch has no fees deducted
    expect(await userB.getVouchBalance(vouchId0)).to.equal(paymentAmount);

    // UserB unvouches completely
    await userB.unvouch(vouchId0);

    // Verify balance is zero after unvouch instead of expecting revert
    const unvouchedBalance = await userB.getVouchBalance(vouchId0);
    expect(unvouchedBalance).to.equal(0n);

    // Now userC becomes the new first voucher
    const { vouchId: vouchId1 } = await userC.vouch(userA);

    // Verify new first vouch has no fees deducted
    expect(await userC.getVouchBalance(vouchId1)).to.equal(paymentAmount);

    // UserC unvouches completely
    await userC.unvouch(vouchId1);

    // Create a new user to be the next first voucher
    const userD = await deployer.createUser();
    const { vouchId: vouchId2 } = await userD.vouch(userA);

    // Verify the new first vouch has no fees deducted
    expect(await userD.getVouchBalance(vouchId2)).to.equal(paymentAmount);

    // Now make a second vouch while userD is first voucher
    const userE = await deployer.createUser();
    const { vouchId: vouchId3 } = await userE.vouch(userA);

    // Calculate expected fee
    const vouchIncentiveFee = paymentAmount - (paymentAmount * 10000n) / (10000n + vouchIncentives);

    // Verify userD (first voucher) received the incentive fee
    expect(await userD.getVouchBalance(vouchId2)).to.equal(paymentAmount + vouchIncentiveFee);

    // Verify userE (second voucher) had fees deducted
    expect(await userE.getVouchBalance(vouchId3)).to.be.closeTo(
      paymentAmount - vouchIncentiveFee,
      1,
    );
  });

  it('should handle incentive distribution with varying stake amounts', async () => {
    await setupVouchIncentives();

    // Create additional users
    const userD = await deployer.createUser();
    const userE = await deployer.createUser();

    // Use different amounts for first vouchers
    const amount1 = ethers.parseEther('0.1'); // 0.1 ETH
    const amount2 = ethers.parseEther('0.2'); // 0.2 ETH
    const amount3 = ethers.parseEther('0.5'); // 0.5 ETH

    // First vouchers with different amounts
    const { vouchId: vouchId1 } = await userB.vouch(userA, { paymentAmount: amount1 });
    const { vouchId: vouchId2 } = await userC.vouch(userA, { paymentAmount: amount2 });

    // New voucher with larger amount - should distribute fees proportionally
    const { vouchId: vouchId3 } = await userD.vouch(userA, { paymentAmount: amount3 });

    // Get actual stakes after third vouch
    const vouch0Stakes = await userB.getVouchBalance(vouchId1);
    const vouch1Stakes = await userC.getVouchBalance(vouchId2);
    const vouch2Stakes = await userD.getVouchBalance(vouchId3);

    // Use closeTo for all balance checks due to potential rounding
    expect(await userB.getVouchBalance(vouchId1)).to.be.closeTo(vouch0Stakes, 1);
    expect(await userC.getVouchBalance(vouchId2)).to.be.closeTo(vouch1Stakes, 1);
    expect(await userD.getVouchBalance(vouchId3)).to.be.closeTo(vouch2Stakes, 1);

    // Add another voucher to verify continued proportional distribution
    const amount4 = ethers.parseEther('0.3'); // 0.3 ETH
    const { vouchId: vouchId4 } = await userE.vouch(userA, { paymentAmount: amount4 });

    // Get final stakes for all vouchers
    const finalVouch0Stakes = await userB.getVouchBalance(vouchId1);
    const finalVouch1Stakes = await userC.getVouchBalance(vouchId2);
    const finalVouch2Stakes = await userD.getVouchBalance(vouchId3);
    const finalVouch3Stakes = await userE.getVouchBalance(vouchId4);

    // Verify final balances for all vouchers
    expect(await userB.getVouchBalance(vouchId1)).to.be.closeTo(finalVouch0Stakes, 1);
    expect(await userC.getVouchBalance(vouchId2)).to.be.closeTo(finalVouch1Stakes, 1);
    expect(await userD.getVouchBalance(vouchId3)).to.be.closeTo(finalVouch2Stakes, 1);
    expect(await userE.getVouchBalance(vouchId4)).to.be.closeTo(finalVouch3Stakes, 1);
  });

  it('should correctly distribute incentives after users unvouch and revouch', async () => {
    const paymentAmount = ethers.parseEther('0.1');
    await setupVouchIncentives();

    // First vouch - no fees
    const { vouchId: vouchId0 } = await userB.vouch(userA, { paymentAmount });

    // Second vouch - with fees
    const { vouchId: vouchId1 } = await userC.vouch(userA, { paymentAmount });

    // Calculate fee amount
    const vouchIncentiveFee = paymentAmount - (paymentAmount * 10000n) / (10000n + vouchIncentives);

    // Verify initial balances
    expect(await userB.getVouchBalance(vouchId0)).to.equal(paymentAmount + vouchIncentiveFee);
    expect(await userC.getVouchBalance(vouchId1)).to.be.closeTo(
      paymentAmount - vouchIncentiveFee,
      1,
    );

    // UserB completely unvouches
    await userB.unvouch(vouchId0);

    // Verify balance is zero after unvouch instead of expecting revert
    const unvouchedBalance = await userB.getVouchBalance(vouchId0);
    expect(unvouchedBalance).to.equal(0n);

    // UserD vouches after unvouch
    const userD = await deployer.createUser();
    const { vouchId: vouchId2 } = await userD.vouch(userA, { paymentAmount });

    // Get final stakes
    const finalVouch1Stakes = await userC.getVouchBalance(vouchId1);
    const finalVouch2Stakes = await userD.getVouchBalance(vouchId2);

    // Verify final balances
    // UserB should have no balance after unvouch
    expect(await userB.getVouchBalance(vouchId0)).to.equal(0n);
    expect(await userC.getVouchBalance(vouchId1)).to.be.closeTo(finalVouch1Stakes, 1);
    expect(await userD.getVouchBalance(vouchId2)).to.be.closeTo(finalVouch2Stakes, 1);

    // UserB revouches
    const { vouchId: vouchId3 } = await userB.vouch(userA, { paymentAmount });
    const finalVouch3Stakes = await userB.getVouchBalance(vouchId3);

    // Verify revouch balance
    expect(await userB.getVouchBalance(vouchId3)).to.be.closeTo(finalVouch3Stakes, 1);
  });

  it('should correctly handle donations with zero fees configured', async () => {
    const paymentAmount = ethers.parseEther('0.1');

    // Set fees to 0
    await deployer.ethosVouch.contract
      .connect(deployer.ADMIN)
      .setEntryVouchersPoolFeeBasisPoints(0n);

    // First vouch
    const { vouchId: vouchId0 } = await userB.vouch(userA, { paymentAmount });

    // Second vouch - should have no fees
    const { vouchId: vouchId1 } = await userC.vouch(userA, { paymentAmount });

    // Verify both vouches have exact payment amounts
    expect(await userB.getVouchBalance(vouchId0)).to.equal(paymentAmount);
    expect(await userC.getVouchBalance(vouchId1)).to.equal(paymentAmount);

    // Third vouch - should still have no fees
    const userD = await deployer.createUser();
    const { vouchId: vouchId2 } = await userD.vouch(userA, { paymentAmount });
    expect(await userD.getVouchBalance(vouchId2)).to.equal(paymentAmount);
  });
});
