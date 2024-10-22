import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { type PaymentToken, type EthosEscrow } from '../../typechain-types';
import { common } from '../utils/common';
import { DEFAULT } from '../utils/defaults';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { type EthosUser } from '../utils/ethosUser';

describe('EthosEscrow deposits', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  let userC: EthosUser;
  let userD: EthosUser;
  let ethosEscrow: EthosEscrow;
  let paymentToken: PaymentToken;

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

    if (!deployer.paymentTokens[0].contract) {
      throw new Error('EthosVouch contract not found');
    }
    paymentToken = deployer.paymentTokens[0].contract;
  });
  describe('deposit function', () => {
    it('random user should NOT be able to deposit', async () => {
      await expect(
        ethosEscrow.connect(userA.signer).deposit(ethers.ZeroAddress, 100),
      ).to.revertedWithCustomError(ethosEscrow, 'InvalidVault');
    });
    it('amount should be greater than 0', async () => {
      await userA.vouch(userB);
      const vault = await userB.getVault();
      const vaultContractSigner = await common.impersonateAndSetBalance(vault.address, '500');
      await expect(
        ethosEscrow.connect(vaultContractSigner).deposit(ethers.ZeroAddress, 0),
      ).to.revertedWithCustomError(ethosEscrow, 'AmountMustBeGreaterThanZero');
    });
    it('token address should be different than zero address', async () => {
      await userA.vouch(userB);
      const vault = await userB.getVault();
      const vaultContractSigner = await common.impersonateAndSetBalance(vault.address, '500');
      await expect(
        ethosEscrow.connect(vaultContractSigner).deposit(ethers.ZeroAddress, 100),
      ).to.revertedWithCustomError(ethosEscrow, 'TokenAddressCannotBeZero');
    });
    it('token address should be different than native token address', async () => {
      await userA.vouch(userB);
      const vault = await userB.getVault();
      const vaultContractSigner = await common.impersonateAndSetBalance(vault.address, '500');
      await expect(
        ethosEscrow.connect(vaultContractSigner).deposit(DEFAULT.ESCROW_TOKEN_ADDRESS, 100),
      ).to.revertedWithCustomError(ethosEscrow, 'TokenAddressCannotBeNativeTokenAddress');
    });
    it('valid vault is able to deposit', async () => {
      await userA.vouch(userB);
      const vault = await userB.getVault();

      // mint ERC20 tokens to vault
      await paymentToken.mint(vault.address, 1000);
      const paymentTokenAddress = await paymentToken.getAddress();

      const vaultContractSigner = await common.impersonateAndSetBalance(vault.address, '500');

      const vaultBalanceBefore = await paymentToken.balanceOf(vault.address);
      const ethosEscrowBalanceBefore = await paymentToken.balanceOf(await ethosEscrow.getAddress());

      const amount = 100;
      await paymentToken
        .connect(vaultContractSigner)
        .approve(await ethosEscrow.getAddress(), amount);
      await expect(ethosEscrow.connect(vaultContractSigner).deposit(paymentTokenAddress, amount))
        .to.emit(ethosEscrow, 'Deposited')
        .withArgs(paymentTokenAddress, userB.profileId, amount);

      const vaultBalanceAfter = await paymentToken.balanceOf(vault.address);
      const ethosEscrowBalanceAfter = await paymentToken.balanceOf(await ethosEscrow.getAddress());
      expect(vaultBalanceBefore - vaultBalanceAfter).to.be.equal(amount);
      expect(ethosEscrowBalanceAfter - ethosEscrowBalanceBefore).to.be.equal(amount);
      expect(await ethosEscrow.balanceOf(userB.profileId, paymentTokenAddress)).to.be.equal(amount);
    });
  });

  describe('depositETH function', () => {
    it('random user should NOT be able to deposit', async () => {
      await expect(ethosEscrow.connect(userA.signer).depositETH()).to.revertedWithCustomError(
        ethosEscrow,
        'InvalidVault',
      );
    });
    it('sent msg.value should be greater than 0', async () => {
      await userA.vouch(userB);
      const vault = await userB.getVault();
      const vaultContractSigner = await common.impersonateAndSetBalance(vault.address, '500');
      await expect(
        ethosEscrow.connect(vaultContractSigner).depositETH(),
      ).to.revertedWithCustomError(ethosEscrow, 'ETHMustBeGreaterThanZero');
    });
    it('valid vault is able to deposit', async () => {
      await userA.vouch(userB);
      const vault = await userB.getVault();
      const vaultContractSigner = await common.impersonateAndSetBalance(vault.address, '500');

      const vaultBalanceBefore = await ethers.provider.getBalance(vault.address);
      const ethosEscrowBalanceBefore = await ethers.provider.getBalance(
        await ethosEscrow.getAddress(),
      );

      const amount = 100;
      const depositTx = await ethosEscrow
        .connect(vaultContractSigner)
        .depositETH({ value: amount });
      const receipt = await depositTx.wait();

      if (!receipt) {
        throw new Error('Transaction failed or receipt is null');
      }

      const transactionFee = receipt.gasUsed * receipt.gasPrice;

      const vaultBalanceAfter = await ethers.provider.getBalance(vault.address);
      const ethosEscrowBalanceAfter = await ethers.provider.getBalance(
        await ethosEscrow.getAddress(),
      );
      expect(vaultBalanceBefore - vaultBalanceAfter - transactionFee).to.be.equal(amount);
      expect(ethosEscrowBalanceAfter - ethosEscrowBalanceBefore).to.be.equal(amount);
      expect(
        await ethosEscrow.balanceOf(userB.profileId, DEFAULT.ESCROW_TOKEN_ADDRESS),
      ).to.be.equal(amount);
    });

    it('deposit should emit Deposited event', async () => {
      await userA.vouch(userB);
      const vault = await userB.getVault();
      const vaultContractSigner = await common.impersonateAndSetBalance(vault.address, '500');

      const amount = 100;
      await expect(ethosEscrow.connect(vaultContractSigner).depositETH({ value: amount }))
        .to.emit(ethosEscrow, 'Deposited')
        .withArgs(DEFAULT.ESCROW_TOKEN_ADDRESS, userB.profileId, amount);
    });
  });
});
