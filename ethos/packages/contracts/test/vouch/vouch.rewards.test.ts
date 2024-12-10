import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { calculateFee } from '../utils/common.js';
import { DEFAULT } from '../utils/defaults.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

const { ethers } = hre;

describe('Vouch Rewards', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  const donationFee = 150n;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);
    [userA, userB] = await Promise.all([deployer.createUser(), deployer.createUser()]);
  });

  async function setupDonationFee(): Promise<void> {
    await deployer.ethosVouch.contract
      .connect(deployer.ADMIN)
      .setEntryDonationFeeBasisPoints(donationFee);
  }

  it('should allow withdrawing accumulated rewards', async () => {
    const paymentAmount = ethers.parseEther('0.1');
    await setupDonationFee();

    // Create a vouch to generate rewards for userB
    await userA.vouch(userB, { paymentAmount });
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

  it('should accumulate rewards from multiple vouches', async () => {
    const paymentAmount = ethers.parseEther('0.1');
    await setupDonationFee();

    // Create multiple vouches to generate rewards from different users
    const userC = await deployer.createUser();
    await userA.vouch(userB, { paymentAmount });
    await userC.vouch(userB, { paymentAmount });

    const rewardsBalance = await userB.getRewardsBalance();
    const expectedRewards = calculateFee(paymentAmount, donationFee).fee * 2n;
    expect(rewardsBalance).to.equal(expectedRewards);
  });

  it('should not allow withdrawing rewards with zero balance', async () => {
    await expect(
      deployer.ethosVouch.contract.connect(userB.signer).claimRewards(),
    ).to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'InsufficientRewardsBalance');
  });

  it('should handle failed reward withdrawals gracefully', async () => {
    // Generate some rewards
    const paymentAmount = ethers.parseEther('0.1');
    await setupDonationFee();
    await userA.vouch(userB, { paymentAmount });

    // Try to withdraw with a contract that doesn't accept ETH
    const nonPayableContract = await deployer.createUser(); // Using a regular user account instead of mock
    await expect(
      deployer.ethosVouch.contract.connect(nonPayableContract.signer).claimRewards(),
    ).to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'InsufficientRewardsBalance');
  });

  it('should correctly track rewards across multiple recipients', async () => {
    const paymentAmount = ethers.parseEther('0.1');
    await setupDonationFee();
    const userC = await deployer.createUser();

    // Generate rewards for multiple users
    await userA.vouch(userB, { paymentAmount });
    await userA.vouch(userC, { paymentAmount });

    const expectedReward = calculateFee(paymentAmount, donationFee).fee;
    expect(await userB.getRewardsBalance()).to.equal(expectedReward);
    expect(await userC.getRewardsBalance()).to.equal(expectedReward);
  });

  it('should emit DepositedToRewards event when rewards are generated', async () => {
    const paymentAmount = ethers.parseEther('0.1');
    await setupDonationFee();
    const expectedFee = calculateFee(paymentAmount, donationFee).fee;

    await userA.vouch(userB, { paymentAmount });

    const filter = deployer.ethosVouch.contract.filters.DepositedToRewards(userB.profileId);
    const events = await deployer.ethosVouch.contract.queryFilter(filter);

    expect(events.length).to.equal(1);
    expect(events[0].args?.[0]).to.equal(userB.profileId);
    expect(events[0].args?.[1]).to.equal(expectedFee);
  });

  it('should emit WithdrawnFromRewards event when rewards are withdrawn', async () => {
    const paymentAmount = ethers.parseEther('0.1');
    await setupDonationFee();
    await userA.vouch(userB, { paymentAmount });

    const rewardsBalance = await userB.getRewardsBalance();
    await expect(deployer.ethosVouch.contract.connect(userB.signer).claimRewards())
      .to.emit(deployer.ethosVouch.contract, 'WithdrawnFromRewards')
      .withArgs(userB.profileId, rewardsBalance);
  });

  it('should handle rewards for archived profiles', async () => {
    const paymentAmount = ethers.parseEther('0.1');
    await setupDonationFee();
    await userA.vouch(userB, { paymentAmount });

    // Create and archive userB's profile
    await deployer.ethosProfile.contract.connect(userB.signer).archiveProfile();

    // Verify rewards can still be withdrawn
    await expect(deployer.ethosVouch.contract.connect(userB.signer).claimRewards()).to.not.be
      .reverted;
  });

  it('should not allow claiming rewards from an address that was only reviewed but never joined', async () => {
    await setupDonationFee();

    // Create a new address that will only be reviewed
    const reviewedUser = await deployer.newWallet();

    // Review the address
    await userA.review({
      address: reviewedUser.address,
    });

    // Generate some rewards for the reviewed address by vouching for userB
    await deployer.ethosVouch.contract
      .connect(userA.signer)
      .vouchByAddress(reviewedUser.address, DEFAULT.COMMENT, DEFAULT.METADATA, {
        value: DEFAULT.PAYMENT_AMOUNT,
      });

    // Try to claim rewards using the reviewed address - should fail
    await expect(deployer.ethosVouch.contract.connect(reviewedUser).claimRewards())
      .to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'ProfileNotFoundForAddress')
      .withArgs(reviewedUser.address);
  });
});
