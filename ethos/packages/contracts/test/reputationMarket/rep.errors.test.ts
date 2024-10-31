import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { type ReputationMarket } from '../../typechain-types';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { DEFAULT, MarketUser } from './utils';

use(chaiAsPromised as Chai.ChaiPlugin);

describe('ReputationMarket Errors', () => {
  let deployer: EthosDeployer;
  let userA: MarketUser;
  let reputationMarket: ReputationMarket;

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

    await reputationMarket
      .connect(deployer.ADMIN)
      .createMarket(DEFAULT.profileId, { value: DEFAULT.initialLiquidity });
  });

  it('should revert with InsufficientFunds when buying a vote with insufficient funds', async () => {
    await expect(userA.buyVotes({ buyAmount: 1n })).to.be.revertedWithCustomError(
      reputationMarket,
      'InsufficientFunds',
    );
  });

  it('should revert with InsufficientInitialLiquidity when creating a market with insufficient initial liquidity', async () => {
    const newProfileId = 2;
    await expect(
      reputationMarket.connect(deployer.ADMIN).createMarket(newProfileId, DEFAULT.value),
    ).to.be.revertedWithCustomError(reputationMarket, 'InsufficientInitialLiquidity');
  });

  it('should revert with InsufficientVotesOwned when selling positive votes without owning any', async () => {
    await expect(reputationMarket.connect(userA.signer).sellVotes(DEFAULT.profileId, true, 1))
      .to.be.revertedWithCustomError(reputationMarket, 'InsufficientVotesOwned')
      .withArgs(DEFAULT.profileId, userA.signer.getAddress());
  });

  it('should revert with InsufficientVotesToSell when selling negative votes without owning any', async () => {
    await userA.buyOneVote();
    await expect(reputationMarket.connect(userA.signer).sellVotes(DEFAULT.profileId, false, 1))
      .to.be.revertedWithCustomError(reputationMarket, 'InsufficientVotesOwned')
      .withArgs(DEFAULT.profileId, userA.signer.getAddress());
  });
});
