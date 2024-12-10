import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { calculateFee } from '../utils/common.js';
import { DEFAULT, MAX_TOTAL_FEES } from '../utils/defaults.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

const { ethers, network } = hre;

const paymentAmount = DEFAULT.PAYMENT_AMOUNT;

const entryFee = 50n;
const exitFee = 100n;
const donationFee = 150n;
const vouchIncentives = 200n;

const feeConfig = {
  entry: async (deployer: EthosDeployer) => {
    await deployer.ethosVouch.contract
      .connect(deployer.ADMIN)
      .setEntryProtocolFeeBasisPoints(entryFee);
  },
  exit: async (deployer: EthosDeployer) => {
    await deployer.ethosVouch.contract.connect(deployer.ADMIN).setExitFeeBasisPoints(exitFee);
  },
  donation: async (deployer: EthosDeployer) => {
    await deployer.ethosVouch.contract
      .connect(deployer.ADMIN)
      .setEntryDonationFeeBasisPoints(donationFee);
  },
  vouchIncentives: async (deployer: EthosDeployer) => {
    await deployer.ethosVouch.contract
      .connect(deployer.ADMIN)
      .setEntryVouchersPoolFeeBasisPoints(vouchIncentives);
  },
};

async function setupFees(deployer: EthosDeployer): Promise<void> {
  await Promise.all(
    Object.values(feeConfig).map(async (fee) => {
      await fee(deployer);
    }),
  );
}

describe('Vault Fees', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);
    [userA, userB] = await Promise.all([deployer.createUser(), deployer.createUser()]);
  });

  it('should apply a protocol fee on vouch entry', async () => {
    await feeConfig.entry(deployer);
    const { vouchId } = await userA.vouch(userB);
    const balance = await userA.getVouchBalance(vouchId);
    const expected = calculateFee(paymentAmount, entryFee).deposit;
    expect(balance).to.equal(expected);
  });

  it('should apply a exit protocol fee on unvouch', async () => {
    await feeConfig.exit(deployer);
    const fee = await deployer.ethosVouch.contract.exitFeeBasisPoints();
    expect(fee).to.equal(exitFee);
    const { vouchId } = await userA.vouch(userB);
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
    const expectedFeesPaid = calculateFee(paymentAmount, exitFee).fee;
    expect(actualFeesPaid).to.equal(expectedFeesPaid);
  });

  it('should apply a donation to the vouch recipient on vouch entry', async () => {
    await feeConfig.donation(deployer);
    const { vouchId } = await userA.vouch(userB);
    const balance = {
      userA: await userA.getVouchBalance(vouchId),
      userB: await userB.getRewardsBalance(),
    };
    const expected = {
      userA: calculateFee(paymentAmount, donationFee).deposit,
      userB: calculateFee(paymentAmount, donationFee).fee,
    };
    expect(balance).to.deep.equal(expected);
  });

  it('should apply all fees', async () => {
    await setupFees(deployer);
    const { vouchId } = await userA.vouch(userB);
    const balance = await userA.getVouchBalance(vouchId);

    const entryFeeAmount = calculateFee(paymentAmount, entryFee).fee;
    const donationFeeAmount = calculateFee(paymentAmount, donationFee).fee;
    const totalFees = entryFeeAmount + donationFeeAmount;
    const expected = paymentAmount - totalFees;
    expect(balance).to.be.closeTo(expected, 1);

    const balanceBeforeUnvouch = await userA.getBalance();
    const unvouchTx = await userA.unvouch(vouchId);
    const receipt = await unvouchTx.wait();

    if (!receipt) {
      expect.fail('Transaction failed or receipt is null');
    }

    const transactionFee = receipt.gasUsed * receipt.gasPrice;
    const balanceAfterUnvouch = await userA.getBalance();
    const amountReceived = balanceAfterUnvouch - balanceBeforeUnvouch + transactionFee;
    const exitFeeAmount = calculateFee(balance, exitFee).fee;
    const expectedAfterExit = balance - exitFeeAmount;
    expect(amountReceived).to.be.closeTo(expectedAfterExit, 1);
  });

  it('should allow changing the entry fee basis points', async () => {
    const newEntryFee = 75n;

    // Set initial entry fee
    await feeConfig.entry(deployer);

    // Change entry fee
    await deployer.ethosVouch.contract
      .connect(deployer.ADMIN)
      .setEntryProtocolFeeBasisPoints(newEntryFee);

    // Verify the new fee is applied
    const { vouchId } = await userA.vouch(userB);
    const balance = await userA.getVouchBalance(vouchId);
    const expected = calculateFee(paymentAmount, newEntryFee).deposit;

    expect(balance).to.equal(expected);
  });

  it('should allow changing the exit fee basis points', async () => {
    const newExitFee = 150n;

    // Set initial exit fee
    await feeConfig.exit(deployer);

    // Create initial vouch
    const { vouchId } = await userA.vouch(userB);

    // Change exit fee
    await deployer.ethosVouch.contract.connect(deployer.ADMIN).setExitFeeBasisPoints(newExitFee);

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
    const expectedAmountAfterFee = calculateFee(paymentAmount, newExitFee).deposit;
    // The difference should be very small (to account for potential rounding errors)
    expect(amountReceivedByUser).to.be.closeTo(expectedAmountAfterFee, 1n);
  });

  it('should allow changing the fee recipient address', async () => {
    const newFeeRecipient = await deployer.newWallet();

    // Get the current fee recipient
    const currentFeeRecipient = await deployer.ethosVouch.contract.protocolFeeAddress();

    // Change the fee recipient
    await deployer.ethosVouch.contract
      .connect(deployer.OWNER)
      .setProtocolFeeAddress(newFeeRecipient.address);

    // Get the updated fee recipient
    const updatedFeeRecipient = await deployer.ethosVouch.contract.protocolFeeAddress();

    // Check that the fee recipient has been updated
    expect(updatedFeeRecipient).to.not.equal(currentFeeRecipient);
    expect(updatedFeeRecipient).to.equal(newFeeRecipient.address);
  });

  it('should not allow setting entry protocol fee that exceeds maximum total fees', async () => {
    const currentTotalFees = await getTotalFees();
    const invalidEntryFee = MAX_TOTAL_FEES - currentTotalFees + 1n;

    await expect(
      deployer.ethosVouch.contract
        .connect(deployer.ADMIN)
        .setEntryProtocolFeeBasisPoints(invalidEntryFee),
    ).to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'FeesExceedMaximum');
  });

  it('should not allow setting exit fee that exceeds maximum total fees', async () => {
    const currentTotalFees = await getTotalFees();
    const invalidExitFee = MAX_TOTAL_FEES - currentTotalFees + 1n;

    await expect(
      deployer.ethosVouch.contract.connect(deployer.ADMIN).setExitFeeBasisPoints(invalidExitFee),
    ).to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'FeesExceedMaximum');
  });

  it('should not allow setting donation fee that exceeds maximum total fees', async () => {
    const currentTotalFees = await getTotalFees();
    const invalidDonationFee = MAX_TOTAL_FEES - currentTotalFees + 1n;

    await expect(
      deployer.ethosVouch.contract
        .connect(deployer.ADMIN)
        .setEntryDonationFeeBasisPoints(invalidDonationFee),
    ).to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'FeesExceedMaximum');
  });

  it('should not allow setting vouchers pool fee that exceeds maximum total fees', async () => {
    const currentTotalFees = await getTotalFees();
    const invalidVouchersPoolFee = MAX_TOTAL_FEES - currentTotalFees + 1n;

    await expect(
      deployer.ethosVouch.contract
        .connect(deployer.ADMIN)
        .setEntryVouchersPoolFeeBasisPoints(invalidVouchersPoolFee),
    ).to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'FeesExceedMaximum');
  });

  it('should allow setting fees up to the maximum total', async () => {
    const quarterMaxFee = MAX_TOTAL_FEES / 4n;

    await expect(
      deployer.ethosVouch.contract
        .connect(deployer.ADMIN)
        .setEntryProtocolFeeBasisPoints(quarterMaxFee),
    ).to.not.be.reverted;

    await expect(
      deployer.ethosVouch.contract.connect(deployer.ADMIN).setExitFeeBasisPoints(quarterMaxFee),
    ).to.not.be.reverted;

    await expect(
      deployer.ethosVouch.contract
        .connect(deployer.ADMIN)
        .setEntryDonationFeeBasisPoints(quarterMaxFee),
    ).to.not.be.reverted;

    await expect(
      deployer.ethosVouch.contract
        .connect(deployer.ADMIN)
        .setEntryVouchersPoolFeeBasisPoints(quarterMaxFee),
    ).to.not.be.reverted;
  });

  it('should allow withdrawing accumulated rewards', async () => {
    await feeConfig.donation(deployer);

    // Create a vouch to generate rewards for userB`
    await userA.vouch(userB);
    const initialBalance = await userB.getBalance();

    // Get rewards balance
    const rewardsBalance = await userB.getRewardsBalance();
    expect(rewardsBalance).to.equal(calculateFee(paymentAmount, donationFee).fee);

    // Withdraw rewards
    const withdrawTx = await deployer.ethosVouch.contract.connect(userB.signer).claimRewards();
    const receipt = await withdrawTx.wait();

    if (!receipt) {
      expect.fail('Transaction failed or receipt is null');
    }

    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const finalBalance = await userB.getBalance();

    // Verify the balance increased by rewards amount (minus gas costs)
    const expectedBalance = initialBalance + rewardsBalance - gasCost;
    expect(finalBalance).to.equal(expectedBalance);

    // Verify rewards balance is now 0
    const newRewardsBalance = await userB.getRewardsBalance();
    expect(newRewardsBalance).to.equal(0n);
  });

  it('should revert when protocol fee transfer fails', async () => {
    // Set protocol fee address to rejecting contract
    await deployer.ethosVouch.contract
      .connect(deployer.OWNER)
      .setProtocolFeeAddress(deployer.rejectETHReceiver.address);

    // Set up fees
    await feeConfig.entry(deployer);

    // Attempt vouch which should fail due to protocol fee transfer
    await expect(userA.vouch(userB))
      .to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'FeeTransferFailed')
      .withArgs('Protocol fee deposit failed');
  });

  it('should revert when rewards withdrawal transfer fails', async () => {
    await feeConfig.donation(deployer);

    // Generate rewards
    await userA.vouch(userB);

    // Register the rejecting contract as a valid address for userB's profile
    await userB.registerAddress(deployer.rejectETHReceiver.address);

    // Create a new signer with the rejecting contract address
    const rejectingSigner = await ethers.getImpersonatedSigner(deployer.rejectETHReceiver.address);

    // Fund the rejecting signer with ETH for gas using setBalance instead of transfer
    await network.provider.send('hardhat_setBalance', [
      deployer.rejectETHReceiver.address,
      ethers.toBeHex(ethers.parseEther('1.0')),
    ]);

    // Attempt withdrawal from the rejecting contract address
    await expect(deployer.ethosVouch.contract.connect(rejectingSigner).claimRewards())
      .to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'FeeTransferFailed')
      .withArgs('Rewards claim failed');

    // Clean up: Register back the original address
    await userB.registerAddress(await userB.signer.getAddress());
  });

  it('should revert when initializing with zero protocol fee address', async () => {
    const EthosVouch = await ethers.getContractFactory('EthosVouch');
    const vouchImplementation = await EthosVouch.deploy();
    const proxy = await ethers.getContractFactory('ERC1967Proxy');

    await expect(
      proxy.deploy(
        await vouchImplementation.getAddress(),
        EthosVouch.interface.encodeFunctionData('initialize', [
          deployer.OWNER.address,
          deployer.ADMIN.address,
          deployer.EXPECTED_SIGNER.address,
          deployer.signatureVerifier.address,
          deployer.contractAddressManager.address,
          ethers.ZeroAddress, // Invalid zero address for protocol fee
          0n, // entryProtocolFeeBasisPoints
          0n, // entryDonationFeeBasisPoints
          0n, // entryVouchersPoolFeeBasisPoints
          0n, // exitFeeBasisPoints
        ]),
      ),
    ).to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'InvalidFeeProtocolAddress');
  });

  it('should authorize upgrade only by owner', async () => {
    const EthosVouch = await ethers.getContractFactory('EthosVouch');
    const newImplementation = await EthosVouch.deploy();

    // Should revert when non-owner tries to upgrade
    await expect(
      deployer.ethosVouch.contract
        .connect(userA.signer)
        .upgradeToAndCall(await newImplementation.getAddress(), '0x'),
    )
      .to.be.revertedWithCustomError(
        deployer.ethosVouch.contract,
        'AccessControlUnauthorizedAccount',
      )
      .withArgs(await userA.signer.getAddress(), await deployer.ethosVouch.contract.OWNER_ROLE());

    // Should succeed when owner upgrades
    await expect(
      deployer.ethosVouch.contract
        .connect(deployer.OWNER)
        .upgradeToAndCall(await newImplementation.getAddress(), '0x'),
    ).to.not.be.reverted;
  });

  it('should not allow upgrade to zero address', async () => {
    await expect(
      deployer.ethosVouch.contract
        .connect(deployer.OWNER)
        .upgradeToAndCall(ethers.ZeroAddress, '0x'),
    ).to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'ZeroAddress');
  });

  async function getTotalFees(): Promise<bigint> {
    const [entryFee, exitFee, donationFee, vouchersPoolFee] = await Promise.all([
      deployer.ethosVouch.contract.entryProtocolFeeBasisPoints(),
      deployer.ethosVouch.contract.exitFeeBasisPoints(),
      deployer.ethosVouch.contract.entryDonationFeeBasisPoints(),
      deployer.ethosVouch.contract.entryVouchersPoolFeeBasisPoints(),
    ]);

    return entryFee + exitFee + donationFee + vouchersPoolFee;
  }
});
