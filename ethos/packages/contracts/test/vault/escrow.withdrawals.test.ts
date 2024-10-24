import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { type PaymentToken, type EthosEscrow, type EthosVouch } from '../../typechain-types';
import { common } from '../utils/common';
import { DEFAULT, VOUCH_PARAMS } from '../utils/defaults';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { type EthosUser } from '../utils/ethosUser';

describe('EthosEscrow withdrawals', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  let userC: EthosUser;
  let userD: EthosUser;
  let ethosEscrow: EthosEscrow;
  let ethosVouch: EthosVouch;
  let paymentToken: PaymentToken;
  const amount = 100;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);
    [userA, userB, userC, userD] = await Promise.all([
      deployer.createUser(),
      deployer.createUser(),
      deployer.createUser(),
      deployer.createUser(),
    ]);

    // set balances

    await userA.setBalance('2000');
    await userB.setBalance('2000');
    await userC.setBalance('2000');
    await userD.setBalance('2000');

    if (!deployer.ethosEscrow.contract) {
      throw new Error('EthosEscrow contract not found');
    }
    ethosEscrow = deployer.ethosEscrow.contract;

    if (!deployer.ethosVouch.contract) {
      throw new Error('EthosVouch contract not found');
    }
    ethosVouch = deployer.ethosVouch.contract;

    if (!deployer.paymentTokens[0].contract) {
      throw new Error('PaymentToken contract not found');
    }
    paymentToken = deployer.paymentTokens[0].contract;

    await userA.vouch(userB);
    const vault = await userB.getVault();
    const vaultContractSigner = await common.impersonateAndSetBalance(vault.address, '500');

    // deposit ETH
    await ethosEscrow.connect(vaultContractSigner).depositETH({ value: amount });

    // deposit ERC20
    await paymentToken.mint(vault.address, 1000);
    await paymentToken.connect(vaultContractSigner).approve(await ethosEscrow.getAddress(), amount);
    await ethosEscrow.connect(vaultContractSigner).deposit(await paymentToken.getAddress(), amount);
  });
  describe('withdraw function', () => {
    it('check reentrancy', async () => {
      const malERC20 = await ethers.deployContract('EscrowReentrantMaliciousERC20', [
        'MAL',
        'MAL',
        await ethosEscrow.getAddress(),
      ]);
      await malERC20.waitForDeployment();
      const malERC20Address = await malERC20.getAddress();

      await malERC20.mint(userA.signer.address, amount);
      await malERC20.connect(userA.signer).approve(await ethosVouch.getAddress(), amount);
      await ethosVouch
        .connect(userA.signer)
        .vouchByProfileId(userC.profileId, VOUCH_PARAMS.comment, VOUCH_PARAMS.metadata, {
          value: VOUCH_PARAMS.paymentAmount,
        });

      const vault = await userC.getVault();
      const vaultContractSigner = await common.impersonateAndSetBalance(vault.address, '500');

      // deposit ERC20
      await malERC20.mint(vault.address, 1000);
      await malERC20.connect(vaultContractSigner).approve(await ethosEscrow.getAddress(), amount);
      await ethosEscrow.connect(vaultContractSigner).deposit(await malERC20.getAddress(), amount);

      await expect(
        ethosEscrow.connect(userC.signer).withdraw(malERC20Address, userC.signer.address, amount),
      ).to.be.revertedWithCustomError(ethosEscrow, 'ReentrancyGuardReentrantCall');
    });
    it('random user should NOT be able to withraw', async () => {
      await expect(
        ethosEscrow
          .connect(deployer.RANDOM_ACC)
          .withdraw(DEFAULT.ESCROW_TOKEN_ADDRESS, deployer.RANDOM_ACC.address, amount),
      ).to.revertedWithCustomError(ethosEscrow, 'InvalidVault');
    });
    it('user should NOT be able to withdraw more funds that he has in the balance', async () => {
      await expect(
        ethosEscrow
          .connect(userB.signer)
          .withdraw(DEFAULT.ESCROW_TOKEN_ADDRESS, userB.signer.address, amount + 1),
      ).to.revertedWithCustomError(ethosEscrow, 'InsufficientBalance');
    });
    it('user should be able to withdraw native ETH', async () => {
      const ethosEscrowBalanceBefore = await ethers.provider.getBalance(
        await ethosEscrow.getAddress(),
      );
      const userBalanceBefore = await ethers.provider.getBalance(userB.signer.address);

      const amountToWithdraw = (amount * 3) / 4; // 75% of the deposited amount

      const withdrawTx = await ethosEscrow
        .connect(userB.signer)
        .withdraw(DEFAULT.ESCROW_TOKEN_ADDRESS, userB.signer.address, amountToWithdraw);
      const receipt = await withdrawTx.wait();

      if (!receipt) {
        throw new Error('Transaction failed or receipt is null');
      }

      const transactionFee = receipt.gasUsed * receipt.gasPrice;

      const ethosEscrowBalanceAfter = await ethers.provider.getBalance(
        await ethosEscrow.getAddress(),
      );
      const userBalanceAfter = await ethers.provider.getBalance(userB.signer.address);
      expect(ethosEscrowBalanceBefore - ethosEscrowBalanceAfter).to.be.equal(amountToWithdraw);
      expect(userBalanceAfter - userBalanceBefore + transactionFee).to.be.equal(amountToWithdraw);
      expect(
        await ethosEscrow.balanceOf(userB.profileId, DEFAULT.ESCROW_TOKEN_ADDRESS),
      ).to.be.equal(amount - amountToWithdraw);
    });
    it('user should be able to withdraw ERC20', async () => {
      const paymentTokenAddress = await paymentToken.getAddress();

      const ethosEscrowBalanceBefore = await paymentToken.balanceOf(await ethosEscrow.getAddress());
      const userBalanceBefore = await paymentToken.balanceOf(userB.signer.address);

      const amountToWithdraw = (amount * 3) / 4; // 75% of the deposited amount

      await ethosEscrow
        .connect(userB.signer)
        .withdraw(paymentTokenAddress, userB.signer.address, amountToWithdraw);

      const ethosEscrowBalanceAfter = await paymentToken.balanceOf(await ethosEscrow.getAddress());
      const userBalanceAfter = await paymentToken.balanceOf(userB.signer.address);
      expect(ethosEscrowBalanceBefore - ethosEscrowBalanceAfter).to.be.equal(amountToWithdraw);
      expect(userBalanceAfter - userBalanceBefore).to.be.equal(amountToWithdraw);
      expect(await ethosEscrow.balanceOf(userB.profileId, paymentTokenAddress)).to.be.equal(
        amount - amountToWithdraw,
      );
    });
    it('withdraw function should emit Withdrawn event', async () => {
      await expect(
        ethosEscrow
          .connect(userB.signer)
          .withdraw(DEFAULT.ESCROW_TOKEN_ADDRESS, userB.signer.address, amount),
      )
        .to.emit(ethosEscrow, 'Withdrawn')
        .withArgs(DEFAULT.ESCROW_TOKEN_ADDRESS, userB.signer.address, userB.profileId, amount);
    });
  });
});
