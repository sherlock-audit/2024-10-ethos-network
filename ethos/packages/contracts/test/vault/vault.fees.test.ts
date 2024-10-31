import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { MAX_TOTAL_FEES } from '../utils/defaults';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { type EthosUser } from '../utils/ethosUser';

function calculateFee(amount: bigint, fee: bigint): bigint {
  return (amount * fee) / 10000n; // fee is in basis points, 100% * 100 points
}

function deductFee(amount: bigint, fee: bigint): bigint {
  return amount - calculateFee(amount, fee); // fee is in basis points, 100% * 100 points
}

describe('Vault Fees', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  const entryFee = 50n;
  const exitFee = 100n;
  const donationFee = 150n;
  const vouchIncentives = 200n;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);
    [userA, userB] = await Promise.all([
      deployer.createUser(),
      deployer.createUser(),
      deployer.createUser(),
    ]);
  });

  const feeConfig = {
    entry: async () => {
      await deployer.ethosVaultManager.contract
        .connect(deployer.ADMIN)
        .setEntryProtocolFeeBasisPoints(entryFee);
    },
    exit: async () => {
      await deployer.ethosVaultManager.contract
        .connect(deployer.ADMIN)
        .setExitFeeBasisPoints(exitFee);
    },
    donation: async () => {
      await deployer.ethosVaultManager.contract
        .connect(deployer.ADMIN)
        .setEntryDonationFeeBasisPoints(donationFee);
    },
    vouchIncentives: async () => {
      await deployer.ethosVaultManager.contract
        .connect(deployer.ADMIN)
        .setEntryVouchersPoolFeeBasisPoints(vouchIncentives);
    },
  };

  async function setupFees(): Promise<void> {
    await Promise.all(
      Object.values(feeConfig).map(async (fee) => {
        await fee();
      }),
    );
  }

  it('should apply a protocol fee on vouch entry', async () => {
    const paymentAmount = ethers.parseEther('0.1');
    await feeConfig.entry();
    const { vouchId } = await userA.vouch(userB, { paymentAmount });
    const balance = await userA.getVouchBalance(vouchId);
    const expected = deductFee(paymentAmount, entryFee);
    expect(balance).to.equal(expected);
  });

  it('should apply a exit protocol fee on unvouch', async () => {
    const paymentAmount = ethers.parseEther('0.001');
    await feeConfig.exit();
    const { vouchId } = await userA.vouch(userB, { paymentAmount });
    const vouchBalance = await userA.getVouchBalance(vouchId);
    const balanceBeforeUnvouch = await userA.getBalance();
    const unvouchTx = await userA.unvouch(vouchId);
    const receipt = await unvouchTx.wait();

    if (!receipt) {
      expect.fail('Transaction failed or receipt is null');
    }

    const transactionFee = receipt.gasUsed * receipt.gasPrice; // transactionFee means network fee not the protocol fees
    const balanceAfterUnvouch = await userA.getBalance();
    const balanceDifference = balanceAfterUnvouch - balanceBeforeUnvouch + transactionFee;
    const actualFeesPaid = vouchBalance - balanceDifference;
    const expectedFeesPaid = paymentAmount - deductFee(paymentAmount, exitFee);
    expect(actualFeesPaid).to.equal(expectedFeesPaid);
  });

  it('should apply a donation to the vouch recipient on vouch entry', async () => {
    const paymentAmount = ethers.parseEther('0.1');
    await feeConfig.donation();
    const { vouchId } = await userA.vouch(userB, { paymentAmount });
    const balance = {
      userA: await userA.getVouchBalance(vouchId),
      userB: await userB.getEscrowBalance(),
    };
    const expected = {
      userA: deductFee(paymentAmount, donationFee),
      userB: paymentAmount - deductFee(paymentAmount, donationFee),
    };
    expect(balance).to.deep.equal(expected);
  });

  it('should apply all fees in sequence', async () => {
    const paymentAmount = ethers.parseEther('0.1');
    await setupFees();
    const { vouchId } = await userA.vouch(userB, { paymentAmount });
    const balance = await userA.getWithdrawableAssets(vouchId);
    const entryFeeAmount = calculateFee(paymentAmount, entryFee);
    const donationFeeAmount = calculateFee(paymentAmount, donationFee);
    const expected = deductFee(paymentAmount - entryFeeAmount - donationFeeAmount, exitFee);
    expect(balance).to.be.closeTo(expected, 1);
  });

  it('should allow changing the entry fee basis points', async () => {
    const newEntryFee = 75n;
    const paymentAmount = ethers.parseEther('0.1');

    // Set initial entry fee
    await feeConfig.entry();

    // Change entry fee
    await deployer.ethosVaultManager.contract
      .connect(deployer.ADMIN)
      .setEntryProtocolFeeBasisPoints(newEntryFee);

    // Verify the new fee is applied
    const { vouchId } = await userA.vouch(userB, { paymentAmount });
    const balance = await userA.getVouchBalance(vouchId);
    const expected = deductFee(paymentAmount, newEntryFee);

    expect(balance).to.equal(expected);
  });

  it('should allow changing the exit fee basis points', async () => {
    const newExitFee = 150n;
    const paymentAmount = ethers.parseEther('0.1');

    // Set initial exit fee
    await feeConfig.exit();

    // Create initial vouch
    const { vouchId } = await userA.vouch(userB, { paymentAmount });

    // Change exit fee
    await deployer.ethosVaultManager.contract
      .connect(deployer.ADMIN)
      .setExitFeeBasisPoints(newExitFee);

    // Unvouch and verify the new fee is applied
    const balanceBeforeUnvouch = await userA.getBalance();
    const unvouchTx = await userA.unvouch(vouchId);
    const receipt = await unvouchTx.wait();

    if (!receipt) {
      expect.fail('Transaction failed or receipt is null');
    }

    const transactionFee = receipt.gasUsed * receipt.gasPrice; // transactionFee means network fee not the protocol fees
    const balanceAfterUnvouch = await userA.getBalance();
    // Calculate the actual amount received by the user
    const amountReceivedByUser = balanceAfterUnvouch - balanceBeforeUnvouch + transactionFee;
    // Calculate the expected amount after fee deduction
    const expectedAmountAfterFee = deductFee(paymentAmount, newExitFee);
    // The difference should be very small (to account for potential rounding errors)
    expect(amountReceivedByUser).to.be.closeTo(expectedAmountAfterFee, 1n);
  });

  it('should allow changing the fee recipient address', async () => {
    const newFeeRecipient = await deployer.newWallet();

    // Get the current fee recipient
    const currentFeeRecipient = await deployer.ethosVaultManager.contract.getFeeProtocolAddress();

    // Change the fee recipient
    await deployer.ethosVaultManager.contract
      .connect(deployer.ADMIN)
      .setFeeProtocolAddress(newFeeRecipient.address);

    // Get the updated fee recipient
    const updatedFeeRecipient = await deployer.ethosVaultManager.contract.getFeeProtocolAddress();

    // Check that the fee recipient has been updated
    expect(updatedFeeRecipient).to.not.equal(currentFeeRecipient);
    expect(updatedFeeRecipient).to.equal(newFeeRecipient.address);
  });

  it('should not allow setting entry protocol fee that exceeds maximum total fees', async () => {
    const currentTotalFees = await getTotalFees();
    const invalidEntryFee = MAX_TOTAL_FEES - currentTotalFees + 1n;

    await expect(
      deployer.ethosVaultManager.contract
        .connect(deployer.ADMIN)
        .setEntryProtocolFeeBasisPoints(invalidEntryFee),
    ).to.be.revertedWith('New fees exceed maximum');
  });

  it('should not allow setting exit fee that exceeds maximum total fees', async () => {
    const currentTotalFees = await getTotalFees();
    const invalidExitFee = MAX_TOTAL_FEES - currentTotalFees + 1n;

    await expect(
      deployer.ethosVaultManager.contract
        .connect(deployer.ADMIN)
        .setExitFeeBasisPoints(invalidExitFee),
    ).to.be.revertedWith('New fees exceed maximum');
  });

  it('should not allow setting donation fee that exceeds maximum total fees', async () => {
    const currentTotalFees = await getTotalFees();
    const invalidDonationFee = MAX_TOTAL_FEES - currentTotalFees + 1n;

    await expect(
      deployer.ethosVaultManager.contract
        .connect(deployer.ADMIN)
        .setEntryDonationFeeBasisPoints(invalidDonationFee),
    ).to.be.revertedWith('New fees exceed maximum');
  });

  it('should not allow setting vouchers pool fee that exceeds maximum total fees', async () => {
    const currentTotalFees = await getTotalFees();
    const invalidVouchersPoolFee = MAX_TOTAL_FEES - currentTotalFees + 1n;

    await expect(
      deployer.ethosVaultManager.contract
        .connect(deployer.ADMIN)
        .setEntryVouchersPoolFeeBasisPoints(invalidVouchersPoolFee),
    ).to.be.revertedWith('New fees exceed maximum');
  });

  it('should allow setting fees up to the maximum total', async () => {
    const quarterMaxFee = MAX_TOTAL_FEES / 4n;

    await expect(
      deployer.ethosVaultManager.contract
        .connect(deployer.ADMIN)
        .setEntryProtocolFeeBasisPoints(quarterMaxFee),
    ).to.not.be.reverted;

    await expect(
      deployer.ethosVaultManager.contract
        .connect(deployer.ADMIN)
        .setExitFeeBasisPoints(quarterMaxFee),
    ).to.not.be.reverted;

    await expect(
      deployer.ethosVaultManager.contract
        .connect(deployer.ADMIN)
        .setEntryDonationFeeBasisPoints(quarterMaxFee),
    ).to.not.be.reverted;

    await expect(
      deployer.ethosVaultManager.contract
        .connect(deployer.ADMIN)
        .setEntryVouchersPoolFeeBasisPoints(quarterMaxFee),
    ).to.not.be.reverted;
  });

  async function getTotalFees(): Promise<bigint> {
    const [entryFee, exitFee, donationFee, vouchersPoolFee] = await Promise.all([
      deployer.ethosVaultManager.contract.getEntryProtocolFeeBasisPoints(),
      deployer.ethosVaultManager.contract.getExitFeeBasisPoints(),
      deployer.ethosVaultManager.contract.getEntryDonationFeeBasisPoints(),
      deployer.ethosVaultManager.contract.getEntryVouchersPoolFeeBasisPoints(),
    ]);

    return entryFee + exitFee + donationFee + vouchersPoolFee;
  }
});
