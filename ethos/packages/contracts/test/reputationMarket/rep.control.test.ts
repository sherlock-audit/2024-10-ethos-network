import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { type InteractionControl, type ReputationMarket } from '../../typechain-types/index.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';
import { smartContractNames } from '../utils/mock.names.js';
import { DEFAULT, MarketUser } from './utils.js';

const { ethers } = hre;
describe('Reputation Market Control', () => {
  let deployer: EthosDeployer;
  let userA: MarketUser;
  let ethosUserA: EthosUser;
  let ethosUserB: EthosUser;
  let reputationMarket: ReputationMarket;
  let interactionControl: InteractionControl;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    if (!deployer.reputationMarket.contract) {
      throw new Error('ReputationMarket contract not found');
    }
    ethosUserA = await deployer.createUser();
    ethosUserB = await deployer.createUser();
    await ethosUserA.setBalance('2000');
    await ethosUserB.setBalance('2000');

    userA = new MarketUser(ethosUserA.signer);

    reputationMarket = deployer.reputationMarket.contract;
    interactionControl = deployer.interactionControl.contract;
    DEFAULT.reputationMarket = reputationMarket;
    DEFAULT.profileId = ethosUserA.profileId;

    await reputationMarket
      .connect(deployer.ADMIN)
      .setUserAllowedToCreateMarket(ethosUserA.profileId, true);
    await reputationMarket
      .connect(ethosUserA.signer)
      .createMarket({ value: DEFAULT.initialLiquidity });
  });

  describe('Pauseable', () => {
    it('should not allow buying votes when paused', async () => {
      await interactionControl
        .connect(deployer.OWNER)
        .pauseContract(smartContractNames.reputationMarket);
      await expect(
        userA.buyOneVote({ profileId: DEFAULT.profileId }),
      ).to.be.revertedWithCustomError(reputationMarket, 'EnforcedPause');
    });

    it('should not allow selling votes when paused', async () => {
      await interactionControl
        .connect(deployer.OWNER)
        .pauseContract(smartContractNames.reputationMarket);
      await expect(userA.sellOneVote()).to.be.revertedWithCustomError(
        reputationMarket,
        'EnforcedPause',
      );
    });

    it('should not allow creating a market when paused', async () => {
      await interactionControl
        .connect(deployer.OWNER)
        .pauseContract(smartContractNames.reputationMarket);
      await expect(
        reputationMarket.connect(userA.signer).createMarket({ value: DEFAULT.initialLiquidity }),
      ).to.be.revertedWithCustomError(reputationMarket, 'EnforcedPause');
    });
  });

  describe('Allow List', () => {
    it('should toggle allow flag for profile', async () => {
      const newUser = await deployer.createUser();
      await reputationMarket
        .connect(deployer.ADMIN)
        .setUserAllowedToCreateMarket(newUser.profileId, true);

      const isAllowed = await reputationMarket
        .connect(deployer.ADMIN)
        .isAllowedToCreateMarket(newUser.profileId);

      expect(isAllowed).to.equal(true);
    });

    it('should revert with ProfileNotFoundForAddress when user has no Ethos Profile', async () => {
      const nonEthosUser = await deployer.newWallet();

      await reputationMarket.connect(deployer.ADMIN).setAllowListEnforcement(false);
      await expect(
        reputationMarket
          .connect(deployer.ADMIN)
          .createMarketWithConfigAdmin(nonEthosUser.address, 0, {
            value: ethers.parseEther('0.002'),
          }),
      )
        .to.be.revertedWithCustomError(deployer.ethosProfile.contract, 'ProfileNotFoundForAddress')
        .withArgs(nonEthosUser.address);
    });

    it('Should revert with MarketCreationUnauthorized when creating a market from a non-allowed profile', async () => {
      await expect(
        reputationMarket
          .connect(ethosUserB.signer)
          .createMarket({ value: DEFAULT.initialLiquidity }),
      )
        .to.be.revertedWithCustomError(reputationMarket, 'MarketCreationUnauthorized')
        .withArgs(0, ethosUserB.signer.address, ethosUserB.profileId);
    });

    it('Should allow creating a market from a non-allowed address when enforcement is disabled', async () => {
      await reputationMarket.connect(deployer.ADMIN).setAllowListEnforcement(false);
      await reputationMarket
        .connect(ethosUserB.signer)
        .createMarket({ value: DEFAULT.initialLiquidity });

      const market = await reputationMarket.getMarket(ethosUserB.profileId);

      expect(market.profileId).to.equal(ethosUserB.profileId);
      expect(market.trustVotes).to.equal(1);
      expect(market.distrustVotes).to.equal(1);
    });

    it('Should succeed when creating a market from an allowed address', async () => {
      await reputationMarket
        .connect(deployer.ADMIN)
        .setUserAllowedToCreateMarket(ethosUserB.profileId, true);
      await reputationMarket
        .connect(ethosUserB.signer)
        .createMarket({ value: DEFAULT.initialLiquidity });

      const market = await reputationMarket.getMarket(ethosUserB.profileId);

      expect(market.profileId).to.equal(ethosUserB.profileId);
      expect(market.trustVotes).to.equal(1);
      expect(market.distrustVotes).to.equal(1);
    });

    it('Should revert with MarketCreationUnauthorized when creating a market from a once-allowed later-disallowed profile', async () => {
      await reputationMarket
        .connect(deployer.ADMIN)
        .setUserAllowedToCreateMarket(ethosUserB.profileId, true);
      await reputationMarket
        .connect(deployer.ADMIN)
        .setUserAllowedToCreateMarket(ethosUserB.profileId, false);
      await expect(
        reputationMarket
          .connect(ethosUserB.signer)
          .createMarket({ value: DEFAULT.initialLiquidity }),
      )
        .to.be.revertedWithCustomError(reputationMarket, 'MarketCreationUnauthorized')
        .withArgs(0, ethosUserB.signer.address, ethosUserB.profileId);
    });
  });
});
