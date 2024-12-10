import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import { type ReputationMarket } from '../../typechain-types/index.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { MarketUser } from './utils.js';

describe('ReputationMarket Config Comparisons', () => {
  let deployer: EthosDeployer;
  let marketUser: MarketUser;
  let reputationMarket: ReputationMarket;
  let markets: Array<{ profileId: bigint; configIndex: bigint }>;

  beforeEach(async () => {
    markets = [];

    deployer = await loadFixture(createDeployer);

    if (!deployer.reputationMarket.contract) {
      throw new Error('ReputationMarket contract not found');
    }
    reputationMarket = deployer.reputationMarket.contract;
    const PRICE_MAXIMUM = await reputationMarket.DEFAULT_PRICE();
    const testConfigs = [
      { initialVotes: 1n, initialLiquidity: 2n * PRICE_MAXIMUM, basePrice: PRICE_MAXIMUM },
      { initialVotes: 2n, initialLiquidity: 4n * PRICE_MAXIMUM, basePrice: PRICE_MAXIMUM },
      { initialVotes: 5n, initialLiquidity: 10n * PRICE_MAXIMUM, basePrice: PRICE_MAXIMUM },
      { initialVotes: 10n, initialLiquidity: 20n * PRICE_MAXIMUM, basePrice: PRICE_MAXIMUM },
      { initialVotes: 20n, initialLiquidity: 40n * PRICE_MAXIMUM, basePrice: PRICE_MAXIMUM },
    ];

    // Create test profiles and corresponding markets
    for (let i = 0; i < 5; i++) {
      // skip first three configs, which are already added by default
      const testConfig = testConfigs[i];
      const user = await deployer.createUser();
      await user.setBalance('2000');

      // Allow user to create market
      await reputationMarket
        .connect(deployer.ADMIN)
        .setUserAllowedToCreateMarket(user.profileId, true);

      // Add market config
      await reputationMarket
        .connect(deployer.ADMIN)
        .addMarketConfig(
          testConfig.initialLiquidity,
          testConfig.initialVotes,
          testConfig.basePrice,
        );
      const configIndex = (await reputationMarket.getMarketConfigCount()) - 1n;

      // User creates their own market
      await reputationMarket.connect(user.signer).createMarketWithConfig(configIndex, {
        value: testConfig.initialLiquidity,
      });

      markets.push({ profileId: user.profileId, configIndex });
    }

    // Create and fund market user for testing
    const ethosUser = await deployer.createUser();
    await ethosUser.setBalance('2000');
    marketUser = new MarketUser(ethosUser.signer);
  });

  describe('Price Movement Comparison', () => {
    it('should show smaller price movements in configs with higher initial votes', async () => {
      const priceChanges: bigint[] = [];

      for (const market of markets) {
        const initialPrice = await reputationMarket.getVotePrice(market.profileId, true);

        // Buy 1 vote
        await marketUser.buyOneVote({
          profileId: market.profileId,
          reputationMarket,
        });

        const newPrice = await reputationMarket.getVotePrice(market.profileId, true);
        const priceChange = newPrice - initialPrice;
        priceChanges.push(priceChange);
      }

      // Price changes should decrease as initial votes increase
      for (let i = 1; i < priceChanges.length; i++) {
        expect(priceChanges[i]).to.be.lt(priceChanges[i - 1]);
      }
    });

    it('should show proportional price changes when buying same percentage of votes', async () => {
      const percentageChanges: bigint[] = [];

      for (const market of markets) {
        const initialPrice = await reputationMarket.getVotePrice(market.profileId, true);
        const marketInfo = await reputationMarket.getMarket(market.profileId);

        // Buy 10% of total votes
        const votesToBuy = marketInfo.trustVotes / 10n;
        const config = await reputationMarket.marketConfigs(market.configIndex);

        await marketUser.buyVotes({
          profileId: market.profileId,
          buyAmount: config.initialLiquidity,
          expectedVotes: votesToBuy,
          reputationMarket,
        });

        const newPrice = await reputationMarket.getVotePrice(market.profileId, true);
        const percentageChange = ((newPrice - initialPrice) * 100n) / initialPrice;

        percentageChanges.push(percentageChange);
      }

      // Percentage changes should be roughly similar
      const maxDifference =
        Number(Math.max(...percentageChanges.map(Number))) -
        Number(Math.min(...percentageChanges.map(Number)));
      expect(maxDifference).to.be.lte(5); // Allow for small variations due to rounding
    });

    it('should require proportionally more ETH to move prices with higher initial votes', async () => {
      const ethRequired: bigint[] = [];

      for (const market of markets) {
        const initialPrice = await reputationMarket.getVotePrice(market.profileId, true);
        let currentPrice = initialPrice;
        let totalEthSpent = 0n;

        // Keep buying until price increases by 20%
        while (currentPrice < (initialPrice * 120n) / 100n) {
          const { fundsPaid } = await marketUser.buyOneVote({
            profileId: market.profileId,
            reputationMarket,
          });
          totalEthSpent += fundsPaid ?? 0n;
          currentPrice = await reputationMarket.getVotePrice(market.profileId, true);
        }

        ethRequired.push(totalEthSpent);
      }

      // Higher liquidity configs should require more ETH
      for (let i = 1; i < ethRequired.length; i++) {
        expect(ethRequired[i]).to.be.gte(ethRequired[i - 1]);
      }
    });
  });

  describe('Market Depth Tests', () => {
    it('should allow more votes to be purchased before significant price impact in larger configs', async () => {
      const votesBeforeThreshold: bigint[] = [];
      const priceThreshold = 20; // 20% price increase

      for (const market of markets) {
        const initialPrice = await reputationMarket.getVotePrice(market.profileId, true);
        let currentPrice = initialPrice;
        let votesBought = 0n;

        // Buy votes until price increases by threshold percentage
        while (Number(((currentPrice - initialPrice) * 100n) / initialPrice) < priceThreshold) {
          const { trustVotes } = await marketUser.buyOneVote({
            profileId: market.profileId,
            reputationMarket,
          });
          votesBought = trustVotes;
          currentPrice = await reputationMarket.getVotePrice(market.profileId, true);
        }

        votesBeforeThreshold.push(votesBought);
      }

      // Larger configs should allow more votes before threshold
      for (let i = 1; i < votesBeforeThreshold.length; i++) {
        expect(votesBeforeThreshold[i]).to.be.gte(votesBeforeThreshold[i - 1]);
      }
    });
  });

  describe('Edge Case Tests', () => {
    it('should maintain price stability near maximum price', async () => {
      const priceMaximum = await reputationMarket.DEFAULT_PRICE();
      const priceStability: bigint[] = [];

      for (const market of markets) {
        // Buy votes until close to maximum price
        let currentPrice = await reputationMarket.getVotePrice(market.profileId, true);
        while (currentPrice < (priceMaximum * 90n) / 100n) {
          await marketUser.buyOneVote({
            profileId: market.profileId,
            reputationMarket,
          });
          currentPrice = await reputationMarket.getVotePrice(market.profileId, true);
        }

        const initialHighPrice = currentPrice;
        await marketUser.buyOneVote({
          profileId: market.profileId,
          reputationMarket,
        });
        const finalPrice = await reputationMarket.getVotePrice(market.profileId, true);

        priceStability.push(finalPrice - initialHighPrice);
      }

      // Higher initial vote configs should show more stability
      for (let i = 1; i < priceStability.length; i++) {
        expect(priceStability[i]).to.be.lt(priceStability[i - 1]);
      }
    });
  });
});
