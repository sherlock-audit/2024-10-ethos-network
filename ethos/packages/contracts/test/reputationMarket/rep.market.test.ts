import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { type ReputationMarket } from '../../typechain-types/index.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';
import { DEFAULT, getExpectedVotePrice, MarketUser } from './utils.js';

const { ethers } = hre;

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
    DEFAULT.profileId = ethosUserA.profileId;
    await reputationMarket
      .connect(deployer.ADMIN)
      .setUserAllowedToCreateMarket(DEFAULT.profileId, true);
    await reputationMarket.connect(userA.signer).createMarket({ value: DEFAULT.initialLiquidity });
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

    it('should revert with MarketAlreadyExists when creating a market that already exists', async () => {
      await expect(
        reputationMarket.connect(userA.signer).createMarket({ value: DEFAULT.initialLiquidity }),
      )
        .to.be.revertedWithCustomError(reputationMarket, 'MarketAlreadyExists')
        .withArgs(DEFAULT.profileId);
    });

    it('should revert with MarketDoesNotExist when buying votes for a non-existent market', async () => {
      const nonExistentProfileId = 999n;
      await expect(userA.buyOneVote({ profileId: nonExistentProfileId }))
        .to.be.revertedWithCustomError(reputationMarket, 'MarketDoesNotExist')
        .withArgs(nonExistentProfileId);
    });

    it('should allow ADMIN to create a market for any profileId', async () => {
      await reputationMarket
        .connect(deployer.ADMIN)
        .createMarketWithConfigAdmin(ethosUserB.signer.address, 0, {
          value: DEFAULT.initialLiquidity,
        });
      const market = await reputationMarket.getMarket(ethosUserB.profileId);

      expect(market.profileId).to.equal(ethosUserB.profileId);
      expect(market.trustVotes).to.equal(1);
      expect(market.distrustVotes).to.equal(1);
    });

    it('should revert when ADMIN attempts to create a market for an address that does not have a profile', async () => {
      const newWallet = await deployer.newWallet();
      await expect(
        reputationMarket.connect(deployer.ADMIN).createMarketWithConfigAdmin(newWallet.address, 0, {
          value: DEFAULT.initialLiquidity,
        }),
      ).to.be.revertedWithCustomError(deployer.ethosProfile.contract, 'ProfileNotFoundForAddress');
    });

    it('should not allow ADMIN to create a market for an invalid profileId', async () => {
      await reputationMarket
        .connect(deployer.ADMIN)
        .createMarketWithConfigAdmin(ethosUserB.signer.address, 0, {
          value: DEFAULT.initialLiquidity,
        });
      const market = await reputationMarket.getMarket(ethosUserB.profileId);

      expect(market.profileId).to.equal(ethosUserB.profileId);
      expect(market.trustVotes).to.equal(1);
      expect(market.distrustVotes).to.equal(1);
    });
  });

  it('should allow a user to buy unlimited positive votes', async () => {
    const amountToBuy = DEFAULT.buyAmount * 100n;

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
    const amountToBuy = DEFAULT.buyAmount * 100n;

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

  it('should emit VotesBought event with correct parameters when buying votes', async () => {
    const buyAmount = ethers.parseEther('0.1');
    const { simulatedVotesBought, simulatedFundsPaid, simulatedNewVotePrice } =
      await userA.simulateBuy({ buyAmount });
    const minVotePrice = await reputationMarket.getVotePrice(DEFAULT.profileId, DEFAULT.isPositive);

    const address = await userA.signer.getAddress();
    const transaction = await reputationMarket
      .connect(userA.signer)
      .buyVotes(DEFAULT.profileId, DEFAULT.isPositive, simulatedVotesBought, 1n, {
        value: buyAmount,
      });
    await expect(transaction)
      .to.emit(reputationMarket, 'VotesBought')
      .withArgs(
        DEFAULT.profileId,
        address,
        DEFAULT.isPositive,
        simulatedVotesBought,
        simulatedFundsPaid,
        (await transaction.getBlock())?.timestamp,
        minVotePrice,
        simulatedNewVotePrice,
      );
  });

  it('should emit VotesSold event with correct parameters when selling votes', async () => {
    const buyAmount = ethers.parseEther('0.1');
    await userA.buyVotes({ buyAmount });

    const { simulatedVotesSold, simulatedFundsReceived, simulatedNewVotePrice } =
      await userA.simulateSell({ sellVotes: DEFAULT.sellVotes });
    const maxVotePrice = await reputationMarket.getVotePrice(DEFAULT.profileId, DEFAULT.isPositive);

    const address = await userA.signer.getAddress();
    const transaction = await reputationMarket
      .connect(userA.signer)
      .sellVotes(DEFAULT.profileId, DEFAULT.isPositive, DEFAULT.sellVotes);

    await expect(transaction)
      .to.emit(reputationMarket, 'VotesSold')
      .withArgs(
        DEFAULT.profileId,
        address,
        DEFAULT.isPositive,
        simulatedVotesSold,
        simulatedFundsReceived,
        (await transaction.getBlock())?.timestamp,
        simulatedNewVotePrice,
        maxVotePrice,
      );
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
      // User A prepares to buy some votes
      const buyAmount = DEFAULT.buyAmount * 100n;
      const { simulatedVotesBought } = await userA.simulateBuy({ buyAmount });

      // UserB makes a tiny purchase to create minimal price impact
      await userB.buyVotes();

      // Should succeed with 1% slippage tolerance
      await expect(
        userA.buyVotes({
          buyAmount,
          expectedVotes: simulatedVotesBought,
          slippageBasisPoints: 100, // 100 basis points = 1%
        }),
      ).to.not.be.reverted;
    });

    it('should succeed with moderate price changes when given sufficient slippage', async () => {
      // User A prepares to buy some votes
      const buyAmount = DEFAULT.buyAmount * 100n;
      const { simulatedVotesBought } = await userA.simulateBuy({ buyAmount });

      // UserB makes a moderate purchase that impacts price
      await userB.buyVotes({
        buyAmount: DEFAULT.buyAmount * 5n,
      });

      // Should succeed with 5% slippage tolerance
      await expect(
        userA.buyVotes({
          buyAmount,
          expectedVotes: simulatedVotesBought,
          slippageBasisPoints: 500, // 500 basis points = 5%
        }),
      ).to.not.be.reverted;
    });

    describe('Slippage rounding at low volumes', () => {
      const slippageBasisPoints = 100; // 1% slippage tolerance
      const magicNumber = 11n;
      let buyAmount: bigint;
      let expectedVotes: bigint;

      beforeEach(async () => {
        buyAmount =
          (await reputationMarket.getVotePrice(DEFAULT.profileId, DEFAULT.isPositive)) *
          magicNumber;
        const { simulatedVotesBought } = await userA.simulateBuy({ buyAmount });
        expectedVotes = simulatedVotesBought;
        // Verify baseline assumption
        expect(simulatedVotesBought).to.equal(7n);
      });

      it('should fail when actual votes are less than expected', async () => {
        await expect(
          userA.buyVotes({
            buyAmount,
            expectedVotes: expectedVotes + 1n, // Expecting 8 but will get 7
            slippageBasisPoints,
          }),
        ).to.be.revertedWithCustomError(reputationMarket, 'SlippageLimitExceeded');
      });

      it('should succeed when actual votes match expected', async () => {
        await expect(
          userA.buyVotes({
            buyAmount,
            expectedVotes, // Expecting 7 and will get 7
            slippageBasisPoints,
          }),
        ).to.not.be.reverted;
      });

      it('should succeed when actual votes are more than expected', async () => {
        await expect(
          userA.buyVotes({
            buyAmount,
            expectedVotes: expectedVotes - 1n, // Expecting 6 but will get 7
            slippageBasisPoints,
          }),
        ).to.not.be.reverted;
      });
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

    it('should return correct min/max prices when simulating buying votes', async () => {
      const amountToBuy = ethers.parseEther('0.1');
      const initialPrice = await reputationMarket.getVotePrice(
        DEFAULT.profileId,
        DEFAULT.isPositive,
      );

      const { simulatedMinVotePrice, simulatedMaxVotePrice } = await userA.simulateBuy({
        buyAmount: amountToBuy,
      });
      await userA.buyVotes({ buyAmount: amountToBuy });
      const expectedNewPrice = await getExpectedVotePrice({ buyAmount: amountToBuy });

      expect(simulatedMinVotePrice).to.equal(initialPrice);
      expect(simulatedMaxVotePrice).to.equal(expectedNewPrice);
    });

    it('should return correct min/max prices when simulating selling votes', async () => {
      // First buy some votes to sell
      const amountToBuy = ethers.parseEther('0.1');
      await userA.buyVotes({ buyAmount: amountToBuy });

      const initialPrice = await reputationMarket.getVotePrice(
        DEFAULT.profileId,
        DEFAULT.isPositive,
      );

      const { simulatedMinVotePrice, simulatedMaxVotePrice } = await userA.simulateSell({
        sellVotes: 5n,
      });

      await userA.sellVotes({ sellVotes: 5n });
      const expectedNewPrice = await getExpectedVotePrice();

      expect(simulatedMaxVotePrice).to.equal(initialPrice);
      expect(simulatedMinVotePrice).to.equal(expectedNewPrice);
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

    it('should show a user as a participant even after selling all votes', async () => {
      // Buy votes
      await userA.buyOneVote();

      // Check that the user is a participant
      expect(
        await reputationMarket.isParticipant(DEFAULT.profileId, await userA.signer.getAddress()),
      ).to.equal(true);

      // Sell all votes
      await userA.sellOneVote();

      // Check that the user is still a participant
      expect(
        await reputationMarket.isParticipant(DEFAULT.profileId, await userA.signer.getAddress()),
      ).to.equal(true);
    });

    it('should keep a user as a participant when selling only some votes', async () => {
      const amountToBuy = DEFAULT.buyAmount * 20n;

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
