import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { type ReputationMarket } from '../../typechain-types';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { type EthosUser } from '../utils/ethosUser';
import { DEFAULT, getExpectedVotePrice, MarketUser } from './utils';

describe('ReputationMarket', () => {
  let deployer: EthosDeployer;
  let ethosUserA: EthosUser;
  let ethosUserB: EthosUser;
  let userA: MarketUser;
  let userB: MarketUser;
  let reputationMarket: ReputationMarket;

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
    DEFAULT.profileId = Number(ethosUserA.profileId);

    await reputationMarket
      .connect(deployer.ADMIN)
      .createMarket(DEFAULT.profileId, { value: DEFAULT.initialLiquidity });
  });

  describe('createMarket', () => {
    it('should create a new market for self', async () => {
      // check market is created
      const market = await reputationMarket.getMarket(DEFAULT.profileId);
      expect(market.profileId).to.equal(DEFAULT.profileId);
      expect(market.trustVotes).to.equal(1);
      expect(market.distrustVotes).to.equal(1);
      // Check number of votes for userA
      let { trustVotes, distrustVotes } = await userA.getVotes();
      expect(trustVotes).to.equal(0);
      expect(distrustVotes).to.equal(0);
      // Check number of votes for userB
      ({ trustVotes, distrustVotes } = await userB.getVotes());
      expect(trustVotes).to.equal(0);
      expect(distrustVotes).to.equal(0);
    });

    it('should revert with InvalidProfileId when creating a market with profileId 0', async () => {
      await expect(
        reputationMarket.connect(userA.signer).createMarket(0, { value: DEFAULT.initialLiquidity }),
      ).to.be.revertedWithCustomError(reputationMarket, 'InvalidProfileId');
    });

    it('should revert with MarketAlreadyExists when creating a market that already exists', async () => {
      await expect(
        reputationMarket.connect(deployer.ADMIN).createMarket(DEFAULT.profileId, DEFAULT.value),
      )
        .to.be.revertedWithCustomError(reputationMarket, 'MarketAlreadyExists')
        .withArgs(DEFAULT.profileId);
    });

    it('should revert with MarketDoesNotExist when buying votes for a non-existent market', async () => {
      const nonExistentProfileId = 999;
      await expect(userA.buyOneVote({ profileId: nonExistentProfileId }))
        .to.be.revertedWithCustomError(reputationMarket, 'MarketDoesNotExist')
        .withArgs(nonExistentProfileId);
    });

    it('should allow ADMIN to create a market for any profileId', async () => {
      await reputationMarket
        .connect(deployer.ADMIN)
        .createMarket(ethosUserB.profileId, { value: DEFAULT.initialLiquidity });
      const market = await reputationMarket.getMarket(ethosUserB.profileId);

      expect(market.profileId).to.equal(ethosUserB.profileId);
      expect(market.trustVotes).to.equal(1);
      expect(market.distrustVotes).to.equal(1);
    });

    it('should revert with InvalidProfileId when ADMIN attempts to create a market for a profile that does not exist', async () => {
      const nonExistentProfileId = 999;

      await expect(
        reputationMarket
          .connect(deployer.ADMIN)
          .createMarket(nonExistentProfileId, { value: DEFAULT.initialLiquidity }),
      ).to.be.revertedWithCustomError(reputationMarket, 'InvalidProfileId');
    });

    it('should not allow ADMIN to create a market for an invalid profileId', async () => {
      await reputationMarket
        .connect(deployer.ADMIN)
        .createMarket(ethosUserB.profileId, { value: DEFAULT.initialLiquidity });
      const market = await reputationMarket.getMarket(ethosUserB.profileId);

      expect(market.profileId).to.equal(ethosUserB.profileId);
      expect(market.trustVotes).to.equal(1);
      expect(market.distrustVotes).to.equal(1);
    });

    it('should revert with MarketCreationUnauthorized when creating a market for a different profileId', async () => {
      await reputationMarket
        .connect(deployer.ADMIN)
        .setUserAllowedToCreateMarket(ethosUserA.profileId, true);
      const otherProfileId = ethosUserB.profileId;
      await expect(
        reputationMarket.connect(userA.signer).createMarket(otherProfileId, DEFAULT.value),
      )
        .to.be.revertedWithCustomError(reputationMarket, 'MarketCreationUnauthorized')
        .withArgs(1, userA.signer.address, otherProfileId);
    });
  });

  it('should allow a user to buy unlimited positive votes', async () => {
    const amountToBuy = ethers.parseEther('0.1');

    const { trustVotes: positive, distrustVotes: negative } = await userA.buyVotes({
      buyAmount: amountToBuy,
    });
    expect(positive).to.equal(104);
    expect(negative).to.equal(0);
  });

  it('should allow a user to buy one positive stake', async () => {
    // buy positive votes
    await userA.buyOneVote();

    const { trustVotes, distrustVotes } = await userA.getVotes();
    expect(trustVotes).to.equal(1);
    expect(distrustVotes).to.equal(0);
  });

  it('should allow a user to buy negative stake', async () => {
    // buy negative votes
    await userA.buyOneVote({
      isPositive: false,
    });

    const { trustVotes, distrustVotes } = await userA.getVotes();
    expect(trustVotes).to.equal(0);
    expect(distrustVotes).to.equal(1);
  });

  it('should allow a user to sell positive stake', async () => {
    // buy positive votes
    await userA.buyVotes({ buyAmount: ethers.parseEther('0.01') });

    const { trustVotes: positiveBefore } = await userA.getVotes();

    await userA.sellOneVote();

    const { trustVotes: positiveAfter } = await userA.getVotes();
    expect(positiveAfter).to.equal(positiveBefore - 1n);
  });

  it('should allow a user to sell negative stake', async () => {
    // buy negative votes
    await userA.buyVotes({
      isPositive: false,
    });

    const { distrustVotes: negativeBefore } = await userA.getVotes();

    await userA.sellOneVote({ isPositive: false });

    const { distrustVotes: negativeAfter } = await userA.getVotes();
    expect(negativeAfter).to.equal(negativeBefore - 1n);
  });

  it('should update the price of votes when buying', async () => {
    const amountToBuy = ethers.parseEther('0.01');

    let price = await DEFAULT.reputationMarket.getVotePrice(DEFAULT.profileId, DEFAULT.isPositive);
    expect(price).to.equal(DEFAULT.buyAmount / 2n);

    await userA.buyOneVote();
    price = await DEFAULT.reputationMarket.getVotePrice(DEFAULT.profileId, DEFAULT.isPositive);
    expect(price).to.equal((DEFAULT.buyAmount * 2n) / 3n);

    await userA.buyVotes({
      buyAmount: amountToBuy,
    });

    price = await DEFAULT.reputationMarket.getVotePrice(DEFAULT.profileId, DEFAULT.isPositive);
    const expectedPrice = await getExpectedVotePrice();
    expect(price).to.equal(expectedPrice);
  });

  it('should update the price of votes when selling', async () => {
    await userA.buyOneVote();
    let price = await DEFAULT.reputationMarket.getVotePrice(DEFAULT.profileId, DEFAULT.isPositive);
    expect(price).to.equal((DEFAULT.buyAmount * 2n) / 3n);
    // sell positive votes
    await userA.sellOneVote();
    price = await DEFAULT.reputationMarket.getVotePrice(DEFAULT.profileId, DEFAULT.isPositive);
    expect(price).to.equal(DEFAULT.buyAmount / 2n);
    // stake price should match stake distribution
    const expectedPrice = await getExpectedVotePrice();
    expect(price).to.equal(expectedPrice);
  });

  it('should pay the seller of a stake', async () => {
    const { fundsPaid } = await userA.buyOneVote();
    const { fundsReceived } = await userA.sellOneVote();
    const price = await DEFAULT.reputationMarket.getVotePrice(
      DEFAULT.profileId,
      DEFAULT.isPositive,
    );
    expect(fundsPaid).to.equal(price);
    expect(fundsReceived).to.equal(price);
  });

  it('should allow a user to sell multiple votes', async () => {
    const amountToBuy = ethers.parseEther('0.01');

    await userA.buyVotes({ buyAmount: amountToBuy });
    const { trustVotes: initialPositiveVotes, balance: initialBalance } = await userA.getVotes();
    const { trustVotes: finalPositiveVotes, balance: finalBalance, gas } = await userA.sellVotes();
    expect(initialPositiveVotes - finalPositiveVotes).to.equal(DEFAULT.sellVotes);
    const balanceDifference = finalBalance - initialBalance - gas;
    expect(balanceDifference).to.be.gt(0);
  });

  it('should correctly return user votes', async () => {
    // Buy some trust votes
    await userA.buyOneVote({
      isPositive: true,
    });

    // Buy some distrust votes
    await userA.buyOneVote({
      isPositive: false,
    });
    await userA.buyOneVote({
      isPositive: false,
    });

    // Get user votes directly from the contract
    const userVotes = await reputationMarket.getUserVotes(
      await userA.signer.getAddress(),
      DEFAULT.profileId,
    );

    // Check if the returned values match the expected votes
    expect(userVotes.profileId).to.equal(DEFAULT.profileId);
    expect(userVotes.trustVotes).to.equal(1n);
    expect(userVotes.distrustVotes).to.equal(2n);
  });

  describe('Slippage', () => {
    it('should revert with SlippageLimitExceeded error when slippage limit is exceeded', async () => {
      const buyAmount = ethers.parseEther('0.1');
      const slippageBasisPoints = 100; // 100 basis points = 1%
      const { simulatedVotesBought } = await userA.simulateBuy({ buyAmount });

      // Expect to purchase votes beyond double the slippage tolerance.
      const incorrectExpectedVotes = Math.ceil(
        Number(simulatedVotesBought) * (1 + slippageBasisPoints * 10 * 2 * 0.01),
      );

      await expect(
        userA.buyVotes({
          buyAmount,
          expectedVotes: BigInt(incorrectExpectedVotes),
          slippageBasisPoints,
        }),
      ).to.be.revertedWithCustomError(reputationMarket, 'SlippageLimitExceeded');
    });

    it('should allow a user to buy votes with maximum slippage', async () => {
      const amountToBuy = ethers.parseEther('1');

      await expect(
        userA.buyVotes({
          buyAmount: amountToBuy,
          slippageBasisPoints: 10000, // 100% slippage tolerance (maximum)
        }),
      ).to.not.be.reverted;
    });

    it('should revert with SlippageLimitExceeded when price changes from another user buying', async () => {
      // User A prepares to buy some votes.
      const buyAmount = ethers.parseEther('0.1');
      const { simulatedVotesBought } = await userA.simulateBuy({ buyAmount });

      // But userB bought a lot of votes, raising the price.
      await userB.buyVotes({
        buyAmount: ethers.parseEther('0.2'),
      });

      // This should fail with 1% slippage tolerance
      await expect(
        userA.buyVotes({
          buyAmount,
          expectedVotes: simulatedVotesBought,
          slippageBasisPoints: 100, // 100 basis points = 1%
        }),
      ).to.be.revertedWithCustomError(reputationMarket, 'SlippageLimitExceeded');
    });

    it('should succeed when price marginally changes from another user buying', async () => {
      // User A prepares to buy some votes.
      const buyAmount = ethers.parseEther('0.1');
      const { simulatedVotesBought } = await userA.simulateBuy({ buyAmount });

      // But userB bought a few votes, marginally changing the price.
      await userB.buyVotes({
        buyAmount: ethers.parseEther('0.005'),
      });

      // This should fail with 1% slippage tolerance
      await expect(
        userA.buyVotes({
          buyAmount,
          expectedVotes: simulatedVotesBought,
          slippageBasisPoints: 100, // 100 basis points = 1%
        }),
      ).to.not.be.reverted;
    });
  });

  describe('Simulations', () => {
    it('should correctly simulate buying votes', async () => {
      const amountToBuy = ethers.parseEther('0.1');

      // Simulate buying votes
      const { simulatedVotesBought, simulatedFundsPaid, simulatedNewVotePrice } =
        await userA.simulateBuy({
          buyAmount: amountToBuy,
        });

      // Actually buy votes
      const { trustVotes: actualVotesBought, fundsPaid: actualFundsPaid } = await userA.buyVotes({
        buyAmount: amountToBuy,
      });
      const actualNewVotePrice = await reputationMarket.getVotePrice(
        DEFAULT.profileId,
        DEFAULT.isPositive,
      );

      // Compare simulated results with actual results
      expect(simulatedVotesBought).to.equal(actualVotesBought);
      expect(simulatedFundsPaid).to.equal(actualFundsPaid);
      expect(simulatedNewVotePrice).to.equal(actualNewVotePrice);
    });

    it('should correctly simulate selling votes', async () => {
      const amountToBuy = ethers.parseEther('0.1');
      const votesToSell = 5n;

      // Buy votes first
      const { trustVotes: initialTrustVotesOwned } = await userA.buyVotes({
        buyAmount: amountToBuy,
      });

      // Simulate selling votes
      const { simulatedVotesSold, simulatedFundsReceived, simulatedNewVotePrice } =
        await userA.simulateSell({
          sellVotes: votesToSell,
        });

      // Actually sell votes
      const { trustVotes: trustVotesRemaining, fundsReceived: actualFundsReceived } =
        await userA.sellVotes({
          sellVotes: votesToSell,
        });

      const actualNewVotePrice = await reputationMarket.getVotePrice(
        DEFAULT.profileId,
        DEFAULT.isPositive,
      );
      // Compare simulated results with actual results
      expect(trustVotesRemaining).to.equal(initialTrustVotesOwned - simulatedVotesSold);
      expect(simulatedFundsReceived).to.equal(actualFundsReceived);
      expect(simulatedNewVotePrice).to.equal(actualNewVotePrice);
    });

    it('should correctly simulate selling zero votes', async () => {
      const amountToBuy = ethers.parseEther('0.1');
      const votesToBuyAndSell = 0n;

      // Buy votes first
      const { trustVotes: initialTrustVotesOwned } = await userA.buyVotes({
        buyAmount: amountToBuy,
      });

      // Simulate selling votes
      const { simulatedVotesSold, simulatedFundsReceived, simulatedNewVotePrice } =
        await userA.simulateSell({
          sellVotes: votesToBuyAndSell,
        });

      // Actually sell votes
      const { trustVotes: trustVotesRemaining, fundsReceived: actualFundsReceived } =
        await userA.sellVotes({
          sellVotes: votesToBuyAndSell,
        });

      const actualNewVotePrice = await reputationMarket.getVotePrice(
        DEFAULT.profileId,
        DEFAULT.isPositive,
      );
      // Compare simulated results with actual results
      expect(trustVotesRemaining).to.equal(initialTrustVotesOwned - simulatedVotesSold);
      expect(simulatedFundsReceived).to.equal(actualFundsReceived);
      expect(simulatedNewVotePrice).to.equal(actualNewVotePrice);
    });

    it('should not change contract state when simulating buy', async () => {
      const amountToBuy = ethers.parseEther('0.1');

      const initialMarketState = await reputationMarket.getMarket(DEFAULT.profileId);
      const initialUserVotes = await userA.getVotes();

      // Simulate buying votes
      await reputationMarket.simulateBuy(DEFAULT.profileId, DEFAULT.isPositive, amountToBuy);

      const finalMarketState = await reputationMarket.getMarket(DEFAULT.profileId);
      const finalUserVotes = await userA.getVotes();

      // Verify that the market state and user votes haven't changed
      expect(initialMarketState.trustVotes).to.equal(finalMarketState.trustVotes);
      expect(initialMarketState.distrustVotes).to.equal(finalMarketState.distrustVotes);
      expect(initialUserVotes.trustVotes).to.equal(finalUserVotes.trustVotes);
      expect(initialUserVotes.distrustVotes).to.equal(finalUserVotes.distrustVotes);
    });

    it('should not change contract state when simulating sell', async () => {
      const amountToBuy = ethers.parseEther('0.1');
      const votesToBuyAndSell = 5n;

      // Buy votes first
      await userA.buyVotes({
        buyAmount: amountToBuy,
      });

      const initialMarketState = await reputationMarket.getMarket(DEFAULT.profileId);
      const initialUserVotes = await userA.getVotes();

      // Simulate selling votes
      await userA.simulateSell({
        sellVotes: votesToBuyAndSell,
      });

      const finalMarketState = await reputationMarket.getMarket(DEFAULT.profileId);
      const finalUserVotes = await userA.getVotes();

      // Verify that the market state and user votes haven't changed
      expect(initialMarketState.trustVotes).to.equal(finalMarketState.trustVotes);
      expect(initialMarketState.distrustVotes).to.equal(finalMarketState.distrustVotes);
      expect(initialUserVotes.trustVotes).to.equal(finalUserVotes.trustVotes);
      expect(initialUserVotes.distrustVotes).to.equal(finalUserVotes.distrustVotes);
    });
  });

  describe('Participants', () => {
    it('should add a user to participants when buying votes', async () => {
      const amountToBuy = ethers.parseEther('0.01');

      // Check that the user is not a participant initially
      expect(
        await reputationMarket.isParticipant(DEFAULT.profileId, await userA.signer.getAddress()),
      ).to.equal(false);

      // Buy votes
      await userA.buyVotes({ buyAmount: amountToBuy });

      // Check that the user is now a participant
      expect(
        await reputationMarket.isParticipant(DEFAULT.profileId, await userA.signer.getAddress()),
      ).to.equal(true);

      // Check that the user is in the participants array
      const participantCount = await reputationMarket.getParticipantCount(DEFAULT.profileId);
      let userFound = false;

      for (let i = 0; i < participantCount; i++) {
        const participant = await reputationMarket.participants(DEFAULT.profileId, i);

        if (participant === (await userA.signer.getAddress())) {
          userFound = true;
          break;
        }
      }
      expect(userFound).to.equal(true);
    });

    it('should not add a user to participants multiple times', async () => {
      const amountToBuy = ethers.parseEther('0.01');

      // Buy votes twice
      await userA.buyVotes({ buyAmount: amountToBuy });
      await userA.buyVotes({ buyAmount: amountToBuy });

      // Check that the user is a participant
      expect(
        await reputationMarket.isParticipant(DEFAULT.profileId, await userA.signer.getAddress()),
      ).to.equal(true);

      // Check that the user appears only once in the participants array
      const participantCount = await reputationMarket.getParticipantCount(DEFAULT.profileId);
      let userCount = 0;

      for (let i = 0; i < participantCount; i++) {
        const participant = await reputationMarket.participants(DEFAULT.profileId, i);

        if (participant === (await userA.signer.getAddress())) {
          userCount++;
        }
      }
      expect(userCount).to.equal(1);
    });

    it('should remove a user from participants when selling all votes', async () => {
      // Buy votes
      await userA.buyOneVote();

      // Check that the user is a participant
      expect(
        await reputationMarket.isParticipant(DEFAULT.profileId, await userA.signer.getAddress()),
      ).to.equal(true);

      // Sell all votes
      await userA.sellOneVote();

      // Check that the user is no longer a participant
      expect(
        await reputationMarket.isParticipant(DEFAULT.profileId, await userA.signer.getAddress()),
      ).to.equal(false);

      // Note: The user's address will still be in the participants array, but isParticipant will be false
    });

    it('should keep a user as a participant when selling only some votes', async () => {
      const amountToBuy = ethers.parseEther('0.02');

      // Buy votes
      await userA.buyVotes({ buyAmount: amountToBuy });

      // Sell half of the votes
      await userA.sellVotes({ sellVotes: DEFAULT.sellVotes / 2n });

      // Check that the user is still a participant
      expect(
        await reputationMarket.isParticipant(DEFAULT.profileId, await userA.signer.getAddress()),
      ).to.equal(true);
    });
  });
});
