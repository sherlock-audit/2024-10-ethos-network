import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { type ReputationMarket } from '../../typechain-types/index.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';
import { DEFAULT, MarketUser } from './utils.js';

const { ethers } = hre;

describe('ReputationMarket Graduation', () => {
  let deployer: EthosDeployer;
  let ethosUserA: EthosUser;
  let ethosUserB: EthosUser;
  let userA: MarketUser;
  let userB: MarketUser;
  let reputationMarket: ReputationMarket;
  let graduator: HardhatEthersSigner;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    if (!deployer.reputationMarket.contract) {
      throw new Error('ReputationMarket contract not found');
    }

    ethosUserA = await deployer.createUser();
    await ethosUserA.setBalance('2000');
    ethosUserB = await deployer.createUser();
    await ethosUserB.setBalance('2000');

    userA = new MarketUser(ethosUserA.signer);
    userB = new MarketUser(ethosUserB.signer);

    reputationMarket = deployer.reputationMarket.contract;
    DEFAULT.reputationMarket = reputationMarket;
    DEFAULT.profileId = ethosUserA.profileId;

    await deployer.contractAddressManager.contract
      .connect(deployer.OWNER)
      .updateContractAddressesForNames([deployer.ADMIN.address], ['GRADUATION_WITHDRAWAL']);

    await reputationMarket
      .connect(deployer.ADMIN)
      .createMarketWithConfigAdmin(ethosUserA.signer.address, 0, {
        value: DEFAULT.initialLiquidity,
      });

    graduator = deployer.ADMIN;
  });

  describe('Market Graduation', () => {
    it('should allow graduate to graduate a market', async () => {
      await expect(reputationMarket.connect(graduator).graduateMarket(DEFAULT.profileId))
        .to.emit(reputationMarket, 'MarketGraduated')
        .withArgs(DEFAULT.profileId);
    });

    it('should prevent non-graduator from graduating a market', async () => {
      await expect(
        reputationMarket.connect(userA.signer).graduateMarket(DEFAULT.profileId),
      ).to.be.revertedWithCustomError(reputationMarket, 'UnauthorizedGraduation');
    });

    it('should prevent trading in graduated markets', async () => {
      await reputationMarket.connect(graduator).graduateMarket(DEFAULT.profileId);

      await expect(userA.buyOneVote()).to.be.revertedWithCustomError(
        reputationMarket,
        'InactiveMarket',
      );

      await expect(userA.sellOneVote()).to.be.revertedWithCustomError(
        reputationMarket,
        'InactiveMarket',
      );
    });

    it('should not allow graduating a non-existent market', async () => {
      const nonExistentProfileId = 999n;
      await expect(
        reputationMarket.connect(graduator).graduateMarket(nonExistentProfileId),
      ).to.be.revertedWithCustomError(reputationMarket, 'MarketDoesNotExist');
    });

    it('should prevent graduating an already graduated market', async () => {
      // First graduation should succeed
      await reputationMarket.connect(graduator).graduateMarket(DEFAULT.profileId);

      // Second graduation should fail
      await expect(
        reputationMarket.connect(graduator).graduateMarket(DEFAULT.profileId),
      ).to.be.revertedWithCustomError(reputationMarket, 'InactiveMarket');
    });

    it('should allow graduation from updated non-admin address', async () => {
      // Create new wallet to be the graduator
      const newGraduator = await deployer.newWallet();

      // Update the GRADUATION_WITHDRAWAL address in contract manager
      await deployer.contractAddressManager.contract
        .connect(deployer.OWNER)
        .updateContractAddressesForNames([newGraduator.address], ['GRADUATION_WITHDRAWAL']);

      // Old graduator (ADMIN) should no longer be authorized
      await expect(
        reputationMarket.connect(deployer.ADMIN).graduateMarket(DEFAULT.profileId),
      ).to.be.revertedWithCustomError(reputationMarket, 'UnauthorizedGraduation');
      // Graduation should work with new address
      await expect(reputationMarket.connect(newGraduator).graduateMarket(DEFAULT.profileId))
        .to.emit(reputationMarket, 'MarketGraduated')
        .withArgs(DEFAULT.profileId);
    });
  });

  describe('Graduated Market Fund Withdrawal', () => {
    beforeEach(async () => {
      // Add some activity to generate funds
      await userA.buyVotes({ buyAmount: ethers.parseEther('0.1') });
      await userB.buyVotes({ buyAmount: ethers.parseEther('0.1') });

      // Graduate the market using graduator from contract manager
      await reputationMarket.connect(graduator).graduateMarket(DEFAULT.profileId);
    });

    it('should allow authorized address to withdraw funds from graduated market', async () => {
      const initialBalance = await ethers.provider.getBalance(graduator.address);
      const funds = await reputationMarket.marketFunds(DEFAULT.profileId);

      const tx = await reputationMarket
        .connect(graduator)
        .withdrawGraduatedMarketFunds(DEFAULT.profileId);

      await expect(tx)
        .to.emit(reputationMarket, 'MarketFundsWithdrawn')
        .withArgs(DEFAULT.profileId, graduator.address, funds);

      const finalBalance = await ethers.provider.getBalance(graduator.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it('should prevent unauthorized addresses from withdrawing funds', async () => {
      await expect(
        reputationMarket.connect(userA.signer).withdrawGraduatedMarketFunds(DEFAULT.profileId),
      ).to.be.revertedWithCustomError(reputationMarket, 'UnauthorizedWithdrawal');
    });

    it('should prevent withdrawing from non-graduated markets', async () => {
      // Create a new market that isn't graduated
      await reputationMarket.connect(deployer.ADMIN).setAllowListEnforcement(false);
      await reputationMarket
        .connect(ethosUserB.signer)
        .createMarket({ value: DEFAULT.initialLiquidity });

      await expect(
        reputationMarket.connect(graduator).withdrawGraduatedMarketFunds(ethosUserB.profileId),
      ).to.be.revertedWithCustomError(reputationMarket, 'MarketNotGraduated');
    });

    it('should prevent withdrawing when no funds are available', async () => {
      // First withdrawal should succeed
      await reputationMarket.connect(graduator).withdrawGraduatedMarketFunds(ethosUserA.profileId);

      // Second withdrawal should fail
      await expect(
        reputationMarket.connect(graduator).withdrawGraduatedMarketFunds(ethosUserA.profileId),
      ).to.be.revertedWithCustomError(reputationMarket, 'InsufficientFunds');
    });
  });

  describe('Market Funds Tracking', () => {
    it('should track funds correctly during market creation', async () => {
      const newProfileId = ethosUserB.profileId;
      await reputationMarket
        .connect(deployer.ADMIN)
        .setUserAllowedToCreateMarket(newProfileId, true);
      await reputationMarket
        .connect(ethosUserB.signer)
        .createMarket({ value: DEFAULT.initialLiquidity });

      const PRICE_MAXIMUM = await reputationMarket.DEFAULT_PRICE();

      expect(await reputationMarket.marketFunds(newProfileId)).to.equal(2n * PRICE_MAXIMUM);
    });

    it('should track funds correctly during buy and sell operations', async () => {
      const buyAmount = ethers.parseEther('0.1');
      const initialFunds = await reputationMarket.marketFunds(DEFAULT.profileId);

      // Buy votes
      await userA.buyVotes({ buyAmount });
      const fundsAfterBuy = await reputationMarket.marketFunds(DEFAULT.profileId);
      expect(fundsAfterBuy).to.be.gt(initialFunds);

      // Sell votes
      const userVotes = await reputationMarket.getUserVotes(
        userA.signer.address,
        DEFAULT.profileId,
      );
      await userA.sellVotes({ sellVotes: userVotes.trustVotes });
      const fundsAfterSell = await reputationMarket.marketFunds(DEFAULT.profileId);
      expect(fundsAfterSell).to.be.lt(fundsAfterBuy);
    });

    it('should track funds correctly after graduation and withdrawal', async () => {
      // Add funds through trading
      await userA.buyVotes({ buyAmount: ethers.parseEther('0.1') });
      const fundsBeforeGraduation = await reputationMarket.marketFunds(DEFAULT.profileId);

      // Graduate market
      await reputationMarket.connect(graduator).graduateMarket(DEFAULT.profileId);
      expect(await reputationMarket.marketFunds(DEFAULT.profileId)).to.equal(fundsBeforeGraduation);

      // Withdraw funds
      await reputationMarket.connect(graduator).withdrawGraduatedMarketFunds(DEFAULT.profileId);

      // Verify funds are zero after withdrawal
      expect(await reputationMarket.marketFunds(DEFAULT.profileId)).to.equal(0);
    });

    it('should track funds correctly with multiple traders', async () => {
      const initialFunds = await reputationMarket.marketFunds(DEFAULT.profileId);

      // Multiple users trade
      await userA.buyVotes({ buyAmount: ethers.parseEther('0.1') });
      const fundsAfterFirstBuy = await reputationMarket.marketFunds(DEFAULT.profileId);
      expect(fundsAfterFirstBuy).to.be.gt(initialFunds);

      await userB.buyVotes({ buyAmount: ethers.parseEther('0.15') });
      const fundsAfterSecondBuy = await reputationMarket.marketFunds(DEFAULT.profileId);
      expect(fundsAfterSecondBuy).to.be.gt(fundsAfterFirstBuy);

      // Users sell their positions
      const userAVotes = await reputationMarket.getUserVotes(
        userA.signer.address,
        DEFAULT.profileId,
      );
      await userA.sellVotes({ sellVotes: userAVotes.trustVotes });
      const fundsAfterFirstSell = await reputationMarket.marketFunds(DEFAULT.profileId);
      expect(fundsAfterFirstSell).to.be.lt(fundsAfterSecondBuy);

      const userBVotes = await reputationMarket.getUserVotes(
        userB.signer.address,
        DEFAULT.profileId,
      );
      await userB.sellVotes({ sellVotes: userBVotes.trustVotes });
      const fundsAfterSecondSell = await reputationMarket.marketFunds(DEFAULT.profileId);
      expect(fundsAfterSecondSell).to.be.lt(fundsAfterFirstSell);
    });
  });
});
