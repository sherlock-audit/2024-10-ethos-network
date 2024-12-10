import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { calculateFee } from '../utils/common.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

const { ethers } = hre;

describe('EthosVouch Increasing', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  const entryFee = 50n;
  const donationFee = 150n;
  const vouchIncentives = 200n;
  const initialAmount = ethers.parseEther('0.1');
  const increaseAmount = ethers.parseEther('0.05');

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);
    [userA, userB] = await Promise.all([deployer.createUser(), deployer.createUser()]);

    // Set up all fees
    await Promise.all([
      deployer.ethosVouch.contract.connect(deployer.ADMIN).setEntryProtocolFeeBasisPoints(entryFee),
      deployer.ethosVouch.contract
        .connect(deployer.ADMIN)
        .setEntryDonationFeeBasisPoints(donationFee),
      deployer.ethosVouch.contract
        .connect(deployer.ADMIN)
        .setEntryVouchersPoolFeeBasisPoints(vouchIncentives),
    ]);
  });

  it('should successfully increase vouch amount', async () => {
    const { vouchId, balance } = await userA.vouch(userB, { paymentAmount: initialAmount });

    const protocolFeeAmount = calculateFee(increaseAmount, entryFee).fee;
    const donationFeeAmount = calculateFee(increaseAmount, donationFee).fee;
    const expectedDeposit = increaseAmount - protocolFeeAmount - donationFeeAmount;

    await deployer.ethosVouch.contract
      .connect(userA.signer)
      .increaseVouch(vouchId, { value: increaseAmount });

    const finalBalance = await userA.getVouchBalance(vouchId);
    expect(finalBalance).to.be.closeTo(balance + expectedDeposit, 1n);
  });

  it('should emit VouchIncreased event', async () => {
    const { vouchId } = await userA.vouch(userB, { paymentAmount: initialAmount });

    await expect(
      deployer.ethosVouch.contract
        .connect(userA.signer)
        .increaseVouch(vouchId, { value: increaseAmount }),
    ).to.emit(deployer.ethosVouch.contract, 'VouchIncreased');
  });

  it('should apply protocol entry fee correctly on increased amount', async () => {
    const { vouchId } = await userA.vouch(userB, { paymentAmount: initialAmount });

    // Get vault address and initial protocol fee recipient balance
    const protocolFeeAddress = await deployer.ethosVouch.contract.protocolFeeAddress();
    const initialFeeBalance = await ethers.provider.getBalance(protocolFeeAddress);

    // Increase vouch
    await deployer.ethosVouch.contract
      .connect(userA.signer)
      .increaseVouch(vouchId, { value: increaseAmount });

    // Check protocol fee recipient's balance increased by expected amount
    const finalFeeBalance = await ethers.provider.getBalance(protocolFeeAddress);
    const expectedFee = calculateFee(increaseAmount, entryFee).fee;
    expect(finalFeeBalance).to.equal(initialFeeBalance + expectedFee);
  });

  it('should apply donation fee correctly on increased amount', async () => {
    const { vouchId } = await userA.vouch(userB, { paymentAmount: initialAmount });

    // Get initial rewards balance for userB
    const initialRewardsBalance = await userB.getRewardsBalance();

    // Increase vouch
    await deployer.ethosVouch.contract
      .connect(userA.signer)
      .increaseVouch(vouchId, { value: increaseAmount });

    // Check userB's rewards balance increased by expected amount
    const finalRewardsBalance = await userB.getRewardsBalance();
    const expectedDonation = calculateFee(increaseAmount, donationFee).fee;
    expect(finalRewardsBalance).to.equal(initialRewardsBalance + expectedDonation);
  });

  it('should apply vouchers pool fee correctly on increased amount', async () => {
    const { vouchId } = await userA.vouch(userB, { paymentAmount: initialAmount });

    // another user needs to vouch for the same person so they earn vouch pool incentives
    const userC = await deployer.createUser();
    const { vouchId: vouchIdC, balance: balanceC } = await userC.vouch(userB, {
      paymentAmount: initialAmount,
    });

    // Get total vouch balance for userB before increase
    const vouchA = await userA.getVouchBalance(vouchId);

    // Calculate pool incentives
    const poolFee = calculateFee(increaseAmount, vouchIncentives);

    // Calculate proportional share based on balances
    const totalBalance = vouchA + balanceC;
    const expectedShare = (poolFee.fee * balanceC) / totalBalance;

    // Increase vouch
    await deployer.ethosVouch.contract
      .connect(userA.signer)
      .increaseVouch(vouchId, { value: increaseAmount });
    const finalBalanceC = await userC.getVouchBalance(vouchIdC);
    expect(finalBalanceC).to.be.closeTo(balanceC + expectedShare, 1n);
  });

  it('should revert when non-author tries to increase vouch', async () => {
    const { vouchId } = await userA.vouch(userB, { paymentAmount: initialAmount });

    await expect(
      deployer.ethosVouch.contract
        .connect(userB.signer)
        .increaseVouch(vouchId, { value: increaseAmount }),
    )
      .to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'NotAuthorForVouch')
      .withArgs(vouchId, userB.profileId);
  });

  it('should revert when trying to increase an unvouched vouch', async () => {
    const { vouchId } = await userA.vouch(userB, { paymentAmount: initialAmount });
    await userA.unvouch(vouchId);

    await expect(
      deployer.ethosVouch.contract
        .connect(userA.signer)
        .increaseVouch(vouchId, { value: increaseAmount }),
    )
      .to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'AlreadyUnvouched')
      .withArgs(vouchId);
  });

  it('should revert when trying to increase a non-existent vouch', async () => {
    const nonExistentVouchId = 999;

    await expect(
      deployer.ethosVouch.contract
        .connect(userA.signer)
        .increaseVouch(nonExistentVouchId, { value: increaseAmount }),
    )
      .to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'NotAuthorForVouch')
      .withArgs(nonExistentVouchId, userA.profileId);
  });

  it('should handle multiple consecutive increases', async () => {
    const { vouchId } = await userA.vouch(userB, { paymentAmount: initialAmount });
    const initialBalance = await userA.getVouchBalance(vouchId);

    // Do two increases
    await deployer.ethosVouch.contract
      .connect(userA.signer)
      .increaseVouch(vouchId, { value: increaseAmount });
    await deployer.ethosVouch.contract
      .connect(userA.signer)
      .increaseVouch(vouchId, { value: increaseAmount });

    // Calculate fees in sequence for one increase
    const { deposit: afterProtoFee } = calculateFee(increaseAmount, entryFee);
    const { deposit: afterDonation } = calculateFee(afterProtoFee, donationFee);

    // The balance should have increased by afterDonation twice
    const finalBalance = await userA.getVouchBalance(vouchId);
    const actualIncrease = finalBalance - initialBalance;
    const expectedIncrease = afterDonation * 2n;

    // Allow for small rounding differences
    const maxRoundingError = afterDonation / 200n; // 0.5% of one increase
    expect(actualIncrease).to.be.closeTo(expectedIncrease, maxRoundingError);
  });

  it('should revert increase with zero value', async () => {
    const { vouchId } = await userA.vouch(userB, { paymentAmount: initialAmount });

    await expect(
      deployer.ethosVouch.contract.connect(userA.signer).increaseVouch(vouchId, { value: 0 }),
    )
      .to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'MinimumVouchAmount')
      .withArgs(await deployer.ethosVouch.contract.configuredMinimumVouchAmount());
  });

  it('should revert when fee transfer fails during increase', async () => {
    const { vouchId } = await userA.vouch(userB, { paymentAmount: initialAmount });
    // Set protocol fee address to rejecting contract
    await deployer.ethosVouch.contract
      .connect(deployer.OWNER)
      .setProtocolFeeAddress(deployer.rejectETHReceiver.address);
    await expect(
      deployer.ethosVouch.contract
        .connect(userA.signer)
        .increaseVouch(vouchId, { value: increaseAmount }),
    )
      .to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'FeeTransferFailed')
      .withArgs('Protocol fee deposit failed');
  });

  it('should return full amount (initial + increase) when unvouching', async () => {
    const { vouchId } = await userA.vouch(userB, { paymentAmount: initialAmount });

    // Increase vouch
    await deployer.ethosVouch.contract
      .connect(userA.signer)
      .increaseVouch(vouchId, { value: increaseAmount });

    // Get userA's balance before unvouching
    const balanceBefore = await ethers.provider.getBalance(userA.signer.address);

    // Calculate expected return amount (after fees for both transactions)
    const { deposit: afterInitialFees } = calculateFee(
      calculateFee(initialAmount, entryFee).deposit,
      donationFee,
    );
    const { deposit: afterIncreaseFees } = calculateFee(
      calculateFee(increaseAmount, entryFee).deposit,
      donationFee,
    );
    const expectedReturn = afterInitialFees + afterIncreaseFees;

    // Unvouch and get transaction details
    const unvouchTx = await userA.unvouch(vouchId);
    const receipt = await unvouchTx.wait();
    const gasUsed = receipt ? receipt.gasUsed * receipt.gasPrice : 0n;

    // Get balance after unvouching
    const balanceAfter = await ethers.provider.getBalance(userA.signer.address);

    // Actual change in balance (accounting for gas)
    const actualReturn = balanceAfter - balanceBefore + gasUsed;

    // Allow for small rounding differences
    const maxRoundingError = expectedReturn / 500n; // 0.2% of total return
    expect(actualReturn).to.be.closeTo(expectedReturn, maxRoundingError);
  });
});
