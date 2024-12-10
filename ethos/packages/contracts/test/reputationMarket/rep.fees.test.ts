import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { type ReputationMarket } from '../../typechain-types/index.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';
import { DEFAULT, MarketUser } from './utils.js';

const { ethers } = hre;

describe('ReputationMarket Fees', () => {
  let deployer: EthosDeployer;
  let ethosUserA: EthosUser;
  let userA: MarketUser;
  let reputationMarket: ReputationMarket;
  let protocolFeeAddress: string;
  const MAX_FEE = 500;
  const entryFee = 200;
  const exitFee = 300;
  const donationFee = 100;
  const BASIS_POINTS = 10000n;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    if (!deployer.reputationMarket.contract) {
      throw new Error('ReputationMarket contract not found');
    }
    ethosUserA = await deployer.createUser();
    await ethosUserA.setBalance('2000');

    userA = new MarketUser(ethosUserA.signer);

    reputationMarket = deployer.reputationMarket.contract;
    DEFAULT.reputationMarket = reputationMarket;
    DEFAULT.profileId = ethosUserA.profileId;

    protocolFeeAddress = ethers.Wallet.createRandom().address;
    await reputationMarket.connect(deployer.ADMIN).setProtocolFeeAddress(protocolFeeAddress);

    await reputationMarket
      .connect(deployer.ADMIN)
      .createMarketWithConfigAdmin(userA.signer.address, 0, {
        value: DEFAULT.initialLiquidity,
      });
  });

  describe('Setting Fees', () => {
    it('should allow admin to set entry protocol fee', async () => {
      await reputationMarket.connect(deployer.ADMIN).setEntryProtocolFeeBasisPoints(entryFee);
      expect(await reputationMarket.entryProtocolFeeBasisPoints()).to.equal(entryFee);
    });

    it('should allow admin to set exit protocol fee', async () => {
      await reputationMarket.connect(deployer.ADMIN).setExitProtocolFeeBasisPoints(exitFee);
      expect(await reputationMarket.exitProtocolFeeBasisPoints()).to.equal(exitFee);
    });

    it('should allow admin to set donation basis points', async () => {
      await reputationMarket.connect(deployer.ADMIN).setDonationBasisPoints(donationFee);
      expect(await reputationMarket.donationBasisPoints()).to.equal(donationFee);
    });

    it('should revert when non-admin tries to set fees', async () => {
      await expect(
        reputationMarket.connect(userA.signer).setEntryProtocolFeeBasisPoints(entryFee),
      ).to.be.revertedWithCustomError(reputationMarket, 'AccessControlUnauthorizedAccount');
      await expect(
        reputationMarket.connect(userA.signer).setExitProtocolFeeBasisPoints(exitFee),
      ).to.be.revertedWithCustomError(reputationMarket, 'AccessControlUnauthorizedAccount');
      await expect(
        reputationMarket.connect(userA.signer).setDonationBasisPoints(donationFee),
      ).to.be.revertedWithCustomError(reputationMarket, 'AccessControlUnauthorizedAccount');
    });

    it('should revert when setting fee above maximum', async () => {
      await expect(
        reputationMarket.connect(deployer.ADMIN).setEntryProtocolFeeBasisPoints(MAX_FEE + 1),
      ).to.be.revertedWithCustomError(reputationMarket, 'InvalidMarketConfigOption');
      await expect(
        reputationMarket.connect(deployer.ADMIN).setExitProtocolFeeBasisPoints(MAX_FEE + 1),
      ).to.be.revertedWithCustomError(reputationMarket, 'InvalidMarketConfigOption');
      await expect(
        reputationMarket.connect(deployer.ADMIN).setDonationBasisPoints(MAX_FEE + 1),
      ).to.be.revertedWithCustomError(reputationMarket, 'InvalidMarketConfigOption');
    });
  });

  describe('Previewing Fees', () => {
    it('should correctly preview entry fees', async () => {
      const { simulatedFundsPaid: noFeesPayment } = await userA.simulateBuy();
      await reputationMarket.connect(deployer.ADMIN).setEntryProtocolFeeBasisPoints(entryFee);
      await reputationMarket.connect(deployer.ADMIN).setDonationBasisPoints(donationFee);
      const { simulatedFundsPaid: withFeesPayment } = await userA.simulateBuy();
      const expectedProtocolFee = (DEFAULT.buyAmount * BigInt(entryFee)) / BASIS_POINTS;
      const expectedDonation = (DEFAULT.buyAmount * BigInt(donationFee)) / BASIS_POINTS;
      const expectedFunds = noFeesPayment + expectedProtocolFee + expectedDonation;
      expect(withFeesPayment).to.equal(expectedFunds);
    });

    it('should correctly preview exit fees', async () => {
      await reputationMarket.connect(deployer.ADMIN).setExitProtocolFeeBasisPoints(exitFee);
      await userA.buyVotes();

      const { simulatedFundsReceived } = await userA.simulateSell({ sellVotes: 1n });

      // Reverse engineer the original amount before fees
      // If x is original amount and f is fee rate:
      // simulatedFundsReceived = x - (x * f)
      // simulatedFundsReceived = x * (1 - f)
      // x = simulatedFundsReceived / (1 - f)
      const originalAmount =
        (simulatedFundsReceived * BASIS_POINTS) / (BASIS_POINTS - BigInt(exitFee));
      const expectedProtocolFee = (originalAmount * BigInt(exitFee)) / BASIS_POINTS;
      const expectedFunds = originalAmount - expectedProtocolFee;

      expect(simulatedFundsReceived).to.equal(expectedFunds);
    });
  });

  describe('Applying Fees', () => {
    it('should correctly apply entry fees when buying votes', async () => {
      const protocolFeeBalanceBefore = await ethers.provider.getBalance(protocolFeeAddress);
      const contractBalanceBefore = await ethers.provider.getBalance(reputationMarket.target);
      await reputationMarket.connect(deployer.ADMIN).setEntryProtocolFeeBasisPoints(entryFee);
      await reputationMarket.connect(deployer.ADMIN).setDonationBasisPoints(donationFee);
      const { simulatedVotesBought, simulatedFundsPaid } = await userA.simulateBuy();
      const { trustVotes, fundsPaid } = await userA.buyVotes();
      const contractBalanceAfter = await ethers.provider.getBalance(reputationMarket.target);
      const contractFundsReceived = contractBalanceAfter - contractBalanceBefore;
      const protocolFeeBalanceAfter = await ethers.provider.getBalance(protocolFeeAddress);
      const protocolFeeReceived = protocolFeeBalanceAfter - protocolFeeBalanceBefore;

      expect(simulatedVotesBought).to.equal(
        trustVotes,
        'Simulated votes bought should equal trust votes',
      );
      expect(simulatedFundsPaid).to.be.equal(
        fundsPaid,
        'Simulated funds paid should be equal to actual funds paid',
      );
      expect(fundsPaid).to.equal(
        contractFundsReceived + protocolFeeReceived,
        'Actual funds paid should be equal to funds received by the contract and protocol fee',
      );
    });

    it('should correctly apply exit fees when selling votes', async () => {
      await reputationMarket.connect(deployer.ADMIN).setExitProtocolFeeBasisPoints(exitFee);
      const { fundsPaid } = await userA.buyVotes();
      const { fundsReceived } = await userA.sellVotes({ sellVotes: 1n });

      if (!fundsPaid) {
        throw new Error('Funds paid is undefined');
      }
      const expectedProtocolFee = (fundsPaid * BigInt(exitFee)) / BASIS_POINTS;
      expect(fundsReceived).to.equal(fundsPaid - expectedProtocolFee);
    });

    it('should transfer protocol fees to the designated address', async () => {
      await reputationMarket.connect(deployer.ADMIN).setEntryProtocolFeeBasisPoints(entryFee);

      const newFeeAddress = ethers.Wallet.createRandom().address;
      await reputationMarket.connect(deployer.ADMIN).setProtocolFeeAddress(newFeeAddress);

      const initialFeeBalance = await ethers.provider.getBalance(newFeeAddress);

      await userA.buyVotes();

      const finalFeeBalance = await ethers.provider.getBalance(newFeeAddress);
      const feeReceived = finalFeeBalance - initialFeeBalance;

      const expectedProtocolFee = (DEFAULT.buyAmount * BigInt(entryFee)) / BASIS_POINTS;

      expect(feeReceived).to.equal(expectedProtocolFee);
    });

    it('should accumulate donations in the donation escrow', async () => {
      await reputationMarket.connect(deployer.ADMIN).setDonationBasisPoints(donationFee);

      await userA.buyVotes();

      const donationRecipient = await reputationMarket.donationRecipient(DEFAULT.profileId);
      const donationEscrow = await reputationMarket.donationEscrow(donationRecipient);

      const expectedDonation = (DEFAULT.buyAmount * BigInt(donationFee)) / BASIS_POINTS;

      expect(donationEscrow).to.equal(expectedDonation);
    });

    describe('Donation Withdrawals', () => {
      let recipient: string;
      let recipientUser: MarketUser;
      let expectedDonation: bigint;
      beforeEach(async () => {
        await reputationMarket.connect(deployer.ADMIN).setDonationBasisPoints(donationFee);
        recipient = await reputationMarket.donationRecipient(DEFAULT.profileId);
        recipientUser = new MarketUser(await ethers.getSigner(recipient));
        expectedDonation = (DEFAULT.buyAmount * BigInt(donationFee)) / BASIS_POINTS;
      });

      it('should allow donation recipient to withdraw accumulated donations', async () => {
        await userA.buyVotes();
        let { donationsWithdrawn } = await recipientUser.withdrawDonations();
        expect(donationsWithdrawn).to.equal(expectedDonation);
        // do it again
        await userA.buyVotes();
        ({ donationsWithdrawn } = await recipientUser.withdrawDonations());
        expect(donationsWithdrawn).to.equal(expectedDonation);
        // do it for 5x as much
        await userA.buyVotes({ buyAmount: DEFAULT.buyAmount * 5n });
        ({ donationsWithdrawn } = await recipientUser.withdrawDonations());
        expect(donationsWithdrawn).to.equal(expectedDonation * 5n);
        // do it for distrust votes
        await userA.buyVotes({ isPositive: false });
        ({ donationsWithdrawn } = await recipientUser.withdrawDonations());
        expect(donationsWithdrawn).to.equal(expectedDonation);
        // Escrow should be emptied
        const escrowAfter = await reputationMarket.donationEscrow(recipient);
        expect(escrowAfter).to.equal(0);
      });

      it('should revert when trying to withdraw with zero balance', async () => {
        await expect(userA.withdrawDonations()).to.be.revertedWithCustomError(
          reputationMarket,
          'InsufficientFunds',
        );
      });

      it('should emit DonationWithdrawn event', async () => {
        await userA.buyVotes();
        await expect(reputationMarket.connect(recipientUser.signer).withdrawDonations())
          .to.emit(reputationMarket, 'DonationWithdrawn')
          .withArgs(recipient, expectedDonation);
      });

      it('should not allow withdrawing twice', async () => {
        await userA.buyVotes();
        // First withdrawal should succeed
        await recipientUser.withdrawDonations();

        // Second withdrawal should fail
        await expect(recipientUser.withdrawDonations()).to.be.revertedWithCustomError(
          reputationMarket,
          'InsufficientFunds',
        );
      });

      describe('Multiple Users', () => {
        let ethosUserB: EthosUser;
        let ethosUserC: EthosUser;
        let userB: MarketUser;
        let userC: MarketUser;

        beforeEach(async () => {
          ethosUserB = await deployer.createUser();
          await ethosUserB.setBalance('2000');
          userB = new MarketUser(ethosUserB.signer);

          ethosUserC = await deployer.createUser();
          await ethosUserC.setBalance('2000');
          userC = new MarketUser(ethosUserC.signer);

          // Create markets
          await reputationMarket
            .connect(deployer.ADMIN)
            .createMarketWithConfigAdmin(ethosUserB.signer.address, 0, {
              value: DEFAULT.initialLiquidity,
            });
          await reputationMarket
            .connect(deployer.ADMIN)
            .createMarketWithConfigAdmin(ethosUserC.signer.address, 0, {
              value: DEFAULT.initialLiquidity,
            });

          await userA.buyVotes();
          await userB.buyVotes({ profileId: ethosUserB.profileId });
          await userC.buyVotes({ profileId: ethosUserC.profileId });
        });

        it('should track and allow withdrawals for multiple donation recipients', async () => {
          const recipientB = await reputationMarket.donationRecipient(ethosUserB.profileId);
          const recipientC = await reputationMarket.donationRecipient(ethosUserC.profileId);
          const recipientUserB = new MarketUser(await ethers.getSigner(recipientB));
          const recipientUserC = new MarketUser(await ethers.getSigner(recipientC));

          // Verify initial escrow balances
          expect(await reputationMarket.donationEscrow(recipientB)).to.equal(
            expectedDonation,
            `A: Escrow for recipient B should be ${expectedDonation}`,
          );
          expect(await reputationMarket.donationEscrow(recipientC)).to.equal(
            expectedDonation,
            `B: Escrow for recipient C should be ${expectedDonation}`,
          );

          // First user withdraws
          await recipientUserB.withdrawDonations();

          // Verify first user's escrow is empty but second user's is unchanged
          expect(await reputationMarket.donationEscrow(recipientB)).to.equal(
            0,
            `C: Escrow for recipient B should be 0`,
          );
          expect(await reputationMarket.donationEscrow(recipientC)).to.equal(
            expectedDonation,
            `D: Escrow for recipient C should be ${expectedDonation}`,
          );

          // Second user withdraws
          await recipientUserC.withdrawDonations();

          // Verify both escrows are now empty
          expect(await reputationMarket.donationEscrow(recipientB)).to.equal(
            0,
            `E: Escrow for recipient B should be 0`,
          );
          expect(await reputationMarket.donationEscrow(recipientC)).to.equal(
            0,
            `F: Escrow for recipient C should be 0`,
          );
        });

        it('should accumulate donations separately for each recipient', async () => {
          const recipientB = await reputationMarket.donationRecipient(ethosUserB.profileId);
          const recipientC = await reputationMarket.donationRecipient(ethosUserC.profileId);

          // Buy votes multiple times for different markets
          await userA.buyVotes({ profileId: ethosUserB.profileId }); // Second purchase for market B
          await userA.buyVotes({ profileId: ethosUserC.profileId }); // Second purchase for market C
          const expectedDonationB = (DEFAULT.buyAmount * BigInt(donationFee) * 2n) / BASIS_POINTS; // 2 purchases
          const expectedDonationC = (DEFAULT.buyAmount * BigInt(donationFee) * 2n) / BASIS_POINTS; // 2 purchases

          expect(await reputationMarket.donationEscrow(recipientB)).to.equal(expectedDonationB);
          expect(await reputationMarket.donationEscrow(recipientC)).to.equal(expectedDonationC);
        });
      });

      describe('Updating Donation Recipient', () => {
        let newRecipient: HardhatEthersSigner;

        beforeEach(async () => {
          await reputationMarket.connect(deployer.ADMIN).setDonationBasisPoints(donationFee);
          await userA.buyVotes();
          recipient = await reputationMarket.donationRecipient(DEFAULT.profileId);
          newRecipient = await deployer.newWallet();
          await ethosUserA.registerAddress(newRecipient.address);
        });

        it('should allow market owner to update donation recipient', async () => {
          await reputationMarket
            .connect(ethosUserA.signer)
            .updateDonationRecipient(DEFAULT.profileId, newRecipient);

          expect(await reputationMarket.donationRecipient(DEFAULT.profileId)).to.equal(
            newRecipient,
          );
        });

        it('should emit DonationRecipientUpdated event', async () => {
          await expect(
            reputationMarket
              .connect(ethosUserA.signer)
              .updateDonationRecipient(DEFAULT.profileId, newRecipient),
          )
            .to.emit(reputationMarket, 'DonationRecipientUpdated')
            .withArgs(DEFAULT.profileId, recipient, newRecipient);
        });

        it('should revert when non-owner tries to update recipient', async () => {
          const nonOwner = new MarketUser((await deployer.createUser()).signer);
          await expect(
            reputationMarket
              .connect(nonOwner.signer)
              .updateDonationRecipient(DEFAULT.profileId, newRecipient),
          ).to.be.revertedWithCustomError(reputationMarket, 'InvalidProfileId');
        });

        it('should allow new recipient to withdraw accumulated donations', async () => {
          // Accumulate some donations
          await userA.buyVotes();

          // Update recipient
          await reputationMarket
            .connect(ethosUserA.signer)
            .updateDonationRecipient(DEFAULT.profileId, newRecipient);

          // New recipient should be able to withdraw
          await expect(reputationMarket.connect(newRecipient).withdrawDonations()).to.not.be
            .reverted;
        });

        it('should maintain separate escrow balances when recipient is updated', async () => {
          // First purchase creates donations for original recipient
          const firstDonation = (DEFAULT.buyAmount * BigInt(donationFee)) / BASIS_POINTS;

          // Update recipient
          await reputationMarket
            .connect(ethosUserA.signer)
            .updateDonationRecipient(DEFAULT.profileId, newRecipient);

          // Second purchase creates donations for new recipient
          await userA.buyVotes();
          const secondDonation = (DEFAULT.buyAmount * BigInt(donationFee)) / BASIS_POINTS;

          // Check escrow balances
          expect(await reputationMarket.donationEscrow(recipient)).to.equal(
            0,
            'Escrow for original recipient should be 0',
          );
          expect(await reputationMarket.donationEscrow(newRecipient)).to.equal(
            firstDonation + secondDonation,
            'Escrow for new recipient should be sum of old and new donations',
          );

          await reputationMarket.connect(newRecipient).withdrawDonations();
          await expect(recipientUser.withdrawDonations()).to.be.revertedWithCustomError(
            reputationMarket,
            'InsufficientFunds',
          );
        });
      });
    });
  });
});
