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
      amount: amountToBuy,
      votes: 500n,
    });
    expect(positive).to.equal(104);
    expect(negative).to.equal(0);
  });

  it('should allow a user to buy unlimited negative votes', async () => {
    const amountToBuy = ethers.parseEther('0.1');

    const { trustVotes: positive, distrustVotes: negative } = await userA.buyVotes({
      isPositive: false,
      amount: amountToBuy,
      votes: 500n,
    });
    expect(positive).to.equal(0);
    expect(negative).to.equal(104);
  });

  it('should allow a user to buy limited positive votes', async () => {
    const amountToBuy = ethers.parseEther('0.1');

    const { trustVotes: positive, distrustVotes: negative } = await userA.buyVotes({
      amount: amountToBuy,
      votes: 3n,
    });
    expect(positive).to.equal(3);
    expect(negative).to.equal(0);
  });

  it('should allow a user to buy limited negative votes', async () => {
    const amountToBuy = ethers.parseEther('0.1');

    const { trustVotes: positive, distrustVotes: negative } = await userA.buyVotes({
      isPositive: false,
      amount: amountToBuy,
      votes: 3n,
    });
    expect(positive).to.equal(0);
    expect(negative).to.equal(3);
  });

  it('should allow a user to buy one positive stake', async () => {
    // buy positive votes
    await userA.buyOneVote();

    const { trustVotes, distrustVotes } = await userA.getVotes();
    expect(trustVotes).to.equal(1);
    expect(distrustVotes).to.equal(0);
  });

  it('should allow a user to buy one negative stake', async () => {
    const amountToBuy = ethers.parseEther('0.01');

    // buy negative votes
    await userA.buyOneVote({
      isPositive: false,
      amount: amountToBuy,
    });

    const { trustVotes, distrustVotes } = await userA.getVotes();
    expect(trustVotes).to.equal(0);
    expect(distrustVotes).to.equal(1);
  });

  it('should allow a user to sell one positive stake', async () => {
    const amountToBuy = ethers.parseEther('0.01');

    // buy positive votes
    await userA.buyVotes({
      amount: amountToBuy,
    });

    const { trustVotes: positiveBefore } = await userA.getVotes();

    await userA.sellOneVote();

    const { trustVotes: positiveAfter } = await userA.getVotes();
    expect(positiveAfter).to.equal(positiveBefore - 1n);
  });

  it('should allow a user to sell one negative stake', async () => {
    const amountToBuy = ethers.parseEther('0.01');

    // buy negative votes
    await userA.buyVotes({
      isPositive: false,
      amount: amountToBuy,
    });

    const { distrustVotes: negativeBefore } = await userA.getVotes();

    await userA.sellOneVote({ isPositive: false });

    const { distrustVotes: negativeAfter } = await userA.getVotes();
    expect(negativeAfter).to.equal(negativeBefore - 1n);
  });

  it('should update the price of votes when buying', async () => {
    const amountToBuy = ethers.parseEther('0.01');

    let price = await DEFAULT.reputationMarket.getVotePrice(DEFAULT.profileId, DEFAULT.isPositive);
    expect(price).to.equal(DEFAULT.maximumPrice / 2n);

    await userA.buyOneVote();
    price = await DEFAULT.reputationMarket.getVotePrice(DEFAULT.profileId, DEFAULT.isPositive);
    expect(price).to.equal((DEFAULT.maximumPrice * 2n) / 3n);

    await userA.buyVotes({
      amount: amountToBuy,
    });

    price = await DEFAULT.reputationMarket.getVotePrice(DEFAULT.profileId, DEFAULT.isPositive);
    const expectedPrice = await getExpectedVotePrice();
    expect(price).to.equal(expectedPrice);
  });

  it('should update the price of votes when selling', async () => {
    await userA.buyOneVote();
    let price = await DEFAULT.reputationMarket.getVotePrice(DEFAULT.profileId, DEFAULT.isPositive);
    expect(price).to.equal((DEFAULT.maximumPrice * 2n) / 3n);
    // sell positive votes
    await userA.sellOneVote();
    price = await DEFAULT.reputationMarket.getVotePrice(DEFAULT.profileId, DEFAULT.isPositive);
    expect(price).to.equal(DEFAULT.maximumPrice / 2n);
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

    await userA.buyVotes({ amount: amountToBuy });
    const { trustVotes: initialPositiveVotes, balance: initialBalance } = await userA.getVotes();
    const { trustVotes: finalPositiveVotes, balance: finalBalance, gas } = await userA.sellVotes();
    expect(initialPositiveVotes - finalPositiveVotes).to.equal(DEFAULT.votes);
    const balanceDifference = finalBalance - initialBalance - gas;
    expect(balanceDifference).to.be.gt(0);
  });

  it('should correctly return user votes', async () => {
    const amountToBuy = ethers.parseEther('0.1');

    // Buy some trust votes
    await userA.buyVotes({
      amount: amountToBuy,
      votes: 5n,
    });

    // Buy some distrust votes
    await userA.buyVotes({
      isPositive: false,
      amount: amountToBuy,
      votes: 3n,
    });

    // Get user votes directly from the contract
    const userVotes = await reputationMarket.getUserVotes(
      await userA.signer.getAddress(),
      DEFAULT.profileId,
    );

    // Check if the returned values match the expected votes
    expect(userVotes.profileId).to.equal(DEFAULT.profileId);
    expect(userVotes.trustVotes).to.equal(5n);
    expect(userVotes.distrustVotes).to.equal(3n);
  });

  describe('Simulations', () => {
    it('should correctly simulate buying votes', async () => {
      const amountToBuy = ethers.parseEther('0.1');
      const votesToBuy = 5n;

      // Simulate buying votes
      const { simulatedVotesBought, simulatedFundsPaid, simulatedNewVotePrice } =
        await userA.simulateBuy({
          votes: votesToBuy,
          amount: amountToBuy,
        });

      // Actually buy votes
      const { trustVotes: actualVotesBought, fundsPaid: actualFundsPaid } = await userA.buyVotes({
        amount: amountToBuy,
        votes: votesToBuy,
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

    it('should correctly simulate buying zero votes', async () => {
      const amountToBuy = ethers.parseEther('0.1');
      const votesToBuy = 0n;

      // Simulate buying votes
      const { simulatedVotesBought, simulatedFundsPaid, simulatedNewVotePrice } =
        await userA.simulateBuy({
          votes: votesToBuy,
          amount: amountToBuy,
        });

      // Actually buy votes
      const { trustVotes: actualVotesBought, fundsPaid: actualFundsPaid } = await userA.buyVotes({
        amount: amountToBuy,
        votes: votesToBuy,
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
      const votesToBuyAndSell = 5n;

      // Buy votes first
      await userA.buyVotes({
        amount: amountToBuy,
        votes: votesToBuyAndSell,
      });

      // Simulate selling votes
      const { simulatedVotesSold, simulatedFundsReceived, simulatedNewVotePrice } =
        await userA.simulateSell({
          votes: votesToBuyAndSell,
        });

      // Actually sell votes
      const { trustVotes: trustVotesRemaining, fundsReceived: actualFundsReceived } =
        await userA.sellVotes({
          votes: votesToBuyAndSell,
        });

      const actualNewVotePrice = await reputationMarket.getVotePrice(
        DEFAULT.profileId,
        DEFAULT.isPositive,
      );
      // Compare simulated results with actual results
      expect(trustVotesRemaining).to.equal(votesToBuyAndSell - simulatedVotesSold);
      expect(simulatedFundsReceived).to.equal(actualFundsReceived);
      expect(simulatedNewVotePrice).to.equal(actualNewVotePrice);
    });

    it('should correctly simulate selling zero votes', async () => {
      const amountToBuy = ethers.parseEther('0.1');
      const votesToBuyAndSell = 0n;

      // Buy votes first
      await userA.buyVotes({
        amount: amountToBuy,
        votes: votesToBuyAndSell,
      });

      // Simulate selling votes
      const { simulatedVotesSold, simulatedFundsReceived, simulatedNewVotePrice } =
        await userA.simulateSell({
          votes: votesToBuyAndSell,
        });

      // Actually sell votes
      const { trustVotes: trustVotesRemaining, fundsReceived: actualFundsReceived } =
        await userA.sellVotes({
          votes: votesToBuyAndSell,
        });

      const actualNewVotePrice = await reputationMarket.getVotePrice(
        DEFAULT.profileId,
        DEFAULT.isPositive,
      );
      // Compare simulated results with actual results
      expect(trustVotesRemaining).to.equal(votesToBuyAndSell - simulatedVotesSold);
      expect(simulatedFundsReceived).to.equal(actualFundsReceived);
      expect(simulatedNewVotePrice).to.equal(actualNewVotePrice);
    });

    it('should not change contract state when simulating buy', async () => {
      const amountToBuy = ethers.parseEther('0.1');
      const votesToBuy = 5n;

      const initialMarketState = await reputationMarket.getMarket(DEFAULT.profileId);
      const initialUserVotes = await userA.getVotes();

      // Simulate buying votes
      await reputationMarket.simulateBuy(
        DEFAULT.profileId,
        DEFAULT.isPositive,
        votesToBuy,
        amountToBuy,
      );

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
        amount: amountToBuy,
        votes: votesToBuyAndSell,
      });

      const initialMarketState = await reputationMarket.getMarket(DEFAULT.profileId);
      const initialUserVotes = await userA.getVotes();

      // Simulate selling votes
      await userA.simulateSell({
        votes: votesToBuyAndSell,
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
      await userA.buyVotes({ amount: amountToBuy });

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
      await userA.buyVotes({ amount: amountToBuy });
      await userA.buyVotes({ amount: amountToBuy });

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
      const amountToBuy = ethers.parseEther('0.01');

      // Buy votes
      await userA.buyVotes({ amount: amountToBuy });

      // Check that the user is a participant
      expect(
        await reputationMarket.isParticipant(DEFAULT.profileId, await userA.signer.getAddress()),
      ).to.equal(true);

      // Sell all votes
      await userA.sellVotes();

      // Check that the user is no longer a participant
      expect(
        await reputationMarket.isParticipant(DEFAULT.profileId, await userA.signer.getAddress()),
      ).to.equal(false);

      // Note: The user's address will still be in the participants array, but isParticipant will be false
    });

    it('should keep a user as a participant when selling only some votes', async () => {
      const amountToBuy = ethers.parseEther('0.02');

      // Buy votes
      await userA.buyVotes({ amount: amountToBuy });

      // Sell half of the votes
      await userA.sellVotes({ votes: DEFAULT.votes / 2n });

      // Check that the user is still a participant
      expect(
        await reputationMarket.isParticipant(DEFAULT.profileId, await userA.signer.getAddress()),
      ).to.equal(true);
    });
  });
});
