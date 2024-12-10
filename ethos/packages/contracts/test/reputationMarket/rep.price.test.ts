import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { type ReputationMarket } from '../../typechain-types/index.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';
import { DEFAULT, MarketUser } from './utils.js';

const { ethers } = hre;

describe('ReputationMarket Base Price Tests', () => {
  let deployer: EthosDeployer;
  let userA: MarketUser;
  let reputationMarket: ReputationMarket;
  const DEFAULT_PRICE = 0.01;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    if (!deployer.reputationMarket.contract) {
      throw new Error('ReputationMarket contract not found');
    }
    const ethosUserA = await deployer.createUser();
    await ethosUserA.setBalance('2000');

    userA = new MarketUser(ethosUserA.signer);
    reputationMarket = deployer.reputationMarket.contract;
    DEFAULT.reputationMarket = reputationMarket;
    DEFAULT.profileId = ethosUserA.profileId;
  });

  describe('Market Configuration Base Price', () => {
    it('should initialize with correct default base price', async () => {
      const config = await reputationMarket.marketConfigs(0);
      expect(config.basePrice).to.equal(ethers.parseEther(DEFAULT_PRICE.toString()));
    });

    it('should allow adding market config with higher base price', async () => {
      const higherBasePrice = ethers.parseEther((DEFAULT_PRICE * 2).toString());
      const initialLiquidity = ethers.parseEther((DEFAULT_PRICE * 4).toString());
      await reputationMarket
        .connect(deployer.ADMIN)
        .addMarketConfig(initialLiquidity, 1000n, higherBasePrice);

      const newConfigIndex = (await reputationMarket.getMarketConfigCount()) - 1n;
      const config = await reputationMarket.marketConfigs(newConfigIndex);
      expect(config.basePrice).to.equal(higherBasePrice);
    });

    it('should revert when adding config with base price below DEFAULT_PRICE', async () => {
      const minimumBasePrice = await reputationMarket.MINIMUM_BASE_PRICE();

      await expect(
        reputationMarket
          .connect(deployer.ADMIN)
          .addMarketConfig(DEFAULT.initialLiquidity, 1000n, minimumBasePrice - 1n),
      ).to.be.revertedWithCustomError(reputationMarket, 'InvalidMarketConfigOption');
    });
  });

  describe('Market Creation with Different Base Prices', () => {
    let users: EthosUser[];
    const prices: bigint[] = [];
    let configCount: bigint;

    beforeEach(async () => {
      prices.push(ethers.parseEther(DEFAULT_PRICE.toString()));
      prices.push(ethers.parseEther((DEFAULT_PRICE * 2).toString()));
      prices.push(ethers.parseEther((DEFAULT_PRICE * 5).toString()));
      // remove two default configs
      await reputationMarket.connect(deployer.ADMIN).removeMarketConfig(2n);
      await reputationMarket.connect(deployer.ADMIN).removeMarketConfig(1n);
      // add new configs
      await reputationMarket
        .connect(deployer.ADMIN)
        .addMarketConfig(DEFAULT.initialLiquidity, 1000n, prices[1]);
      await reputationMarket
        .connect(deployer.ADMIN)
        .addMarketConfig(DEFAULT.initialLiquidity, 1000n, prices[2]);
      configCount = await reputationMarket.getMarketConfigCount();
      users = await Promise.all(
        Array.from({ length: Number(configCount) }, async () => await deployer.createUser()),
      );
      // Create markets with different base prices
      await Promise.all(
        users.map(async (user, i) => {
          await reputationMarket
            .connect(deployer.ADMIN)
            .createMarketWithConfigAdmin(user.signer.address, i, {
              value: (await reputationMarket.marketConfigs(i)).initialLiquidity,
            });
        }),
      );
    });

    it('should create markets with different base prices and verify initial vote prices', async () => {
      for (let i = 0; i < users.length; i++) {
        const trustPrice = await reputationMarket.getVotePrice(users[i].profileId, true);
        expect(trustPrice).to.equal(prices[i] / 2n);
      }
    });

    it('should show proportional price changes across different base prices', async () => {
      // Buy one vote in each market
      for (const user of users) {
        const marketUser = new MarketUser(user.signer);
        await marketUser.buyOneVote({ profileId: user.profileId });
      }

      for (let i = 0; i < users.length; i++) {
        const market = await reputationMarket.getMarket(users[i].profileId);
        const estimatedPrice =
          (market.trustVotes * prices[i]) / (market.trustVotes + market.distrustVotes);
        const actualPrice = await reputationMarket.getVotePrice(users[i].profileId, true);
        expect(actualPrice).to.equal(estimatedPrice);
      }
    });
  });

  describe('Very high price limits', () => {
    let basePrice100x: bigint;
    beforeEach(async () => {
      basePrice100x = ethers.parseEther((DEFAULT_PRICE * 100).toString());
      await reputationMarket
        .connect(deployer.ADMIN)
        .addMarketConfig(DEFAULT.initialLiquidity, 1n, basePrice100x);
      const configCount = await reputationMarket.getMarketConfigCount();

      await reputationMarket
        .connect(deployer.ADMIN)
        .createMarketWithConfigAdmin(userA.signer.address, configCount - 1n, {
          value: DEFAULT.initialLiquidity,
        });
    });

    it('should respect a high base price as maximum for trust votes', async () => {
      // buy many votes to push price up
      await userA.buyVotes({ buyAmount: ethers.parseEther('1000') }); // buy 1000 ETH at 1 Eth basePrice
      const currentPrice = await reputationMarket.getVotePrice(DEFAULT.profileId, true);

      expect(Number(currentPrice)).to.be.lte(Number(basePrice100x), 'Price is too high'); // less than maximum
      expect(Number(currentPrice)).to.be.gt(
        Number((basePrice100x * 99n) / 100n),
        'Price is too low',
      ); // more than 99% of maximum
    });

    it('should maintain zero as minimum price for distrust votes', async () => {
      // Buy many distrust votes to push trust price down
      await userA.buyVotes({ buyAmount: ethers.parseEther('1000'), isPositive: false });
      const trustPrice = await reputationMarket.getVotePrice(DEFAULT.profileId, true);
      expect(Number(trustPrice)).to.be.gte(0, 'Price is too low');
      expect(Number(trustPrice)).to.be.lte(
        Number((basePrice100x * 1n) / 100n),
        'Price is too high',
      ); // less than 1% of base price
    });
  });
});
