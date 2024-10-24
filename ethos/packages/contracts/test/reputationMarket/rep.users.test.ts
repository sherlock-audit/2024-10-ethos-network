import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { type ReputationMarket } from '../../typechain-types';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { DEFAULT, MarketUser } from './utils';

use(chaiAsPromised as Chai.ChaiPlugin);

describe('ReputationMarket Users', () => {
  let deployer: EthosDeployer;
  let userA: MarketUser;
  let userB: MarketUser;
  let reputationMarket: ReputationMarket;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    if (!deployer.reputationMarket.contract) {
      throw new Error('ReputationMarket contract not found');
    }
    const [marketUser, ethosUserA, ethosUserB] = await Promise.all([
      deployer.createUser(),
      deployer.createUser(),
      deployer.createUser(),
    ]);
    await Promise.all([ethosUserA.setBalance('2000'), ethosUserB.setBalance('2000')]);

    userA = new MarketUser(ethosUserA.signer);
    userB = new MarketUser(ethosUserB.signer);

    reputationMarket = deployer.reputationMarket.contract;
    DEFAULT.reputationMarket = reputationMarket;
    DEFAULT.profileId = Number(marketUser.profileId);

    await reputationMarket
      .connect(deployer.ADMIN)
      .createMarket(DEFAULT.profileId, { value: DEFAULT.initialLiquidity });
  });

  it('should allow multiple users to buy and sell votes', async () => {
    await userA.buyOneVote();
    let { trustVotes, distrustVotes } = await reputationMarket.getMarket(DEFAULT.profileId);
    expect(trustVotes).to.equal(2);
    expect(distrustVotes).to.equal(1);
    await userB.buyOneVote();
    ({ trustVotes, distrustVotes } = await reputationMarket.getMarket(DEFAULT.profileId));
    expect(trustVotes).to.equal(3);
    expect(distrustVotes).to.equal(1);
    await userA.buyOneVote({ isPositive: false });
    ({ trustVotes, distrustVotes } = await reputationMarket.getMarket(DEFAULT.profileId));
    expect(trustVotes).to.equal(3);
    expect(distrustVotes).to.equal(2);
    await userB.buyOneVote({ isPositive: false });
    ({ trustVotes, distrustVotes } = await reputationMarket.getMarket(DEFAULT.profileId));
    expect(trustVotes).to.equal(3);
    expect(distrustVotes).to.equal(3);
    await userA.sellOneVote();
    ({ trustVotes, distrustVotes } = await reputationMarket.getMarket(DEFAULT.profileId));
    expect(trustVotes).to.equal(2);
    expect(distrustVotes).to.equal(3);
    await userB.sellOneVote();
    ({ trustVotes, distrustVotes } = await reputationMarket.getMarket(DEFAULT.profileId));
    expect(trustVotes).to.equal(1);
    expect(distrustVotes).to.equal(3);
  });

  it('should allow users to buy and sell votes for different profiles', async () => {
    const [marketUser1, marketUser2] = await Promise.all([
      deployer.createUser(),
      deployer.createUser(),
    ]);
    const markets = {
      profileId1: {
        profileId: Number(marketUser1.profileId),
        trustVotes: 1,
        distrustVotes: 1,
      },
      profileId2: {
        profileId: Number(marketUser2.profileId),
        trustVotes: 1,
        distrustVotes: 1,
      },
    };

    async function checkMarketVotes(): Promise<void> {
      let { trustVotes, distrustVotes } = await reputationMarket.getMarket(
        markets.profileId1.profileId,
      );
      expect(trustVotes, `profileId1 trustVotes`).to.equal(markets.profileId1.trustVotes);
      expect(distrustVotes, `profileId1 distrustVotes`).to.equal(markets.profileId1.distrustVotes);
      ({ trustVotes, distrustVotes } = await reputationMarket.getMarket(
        markets.profileId2.profileId,
      ));
      expect(trustVotes, `profileId2 trustVotes`).to.equal(markets.profileId2.trustVotes);
      expect(distrustVotes, `profileId2 distrustVotes`).to.equal(markets.profileId2.distrustVotes);
    }
    // create both markets
    await reputationMarket.connect(deployer.ADMIN).createMarket(markets.profileId1.profileId, {
      value: DEFAULT.initialLiquidity,
    });
    await reputationMarket.connect(deployer.ADMIN).createMarket(markets.profileId2.profileId, {
      value: DEFAULT.initialLiquidity,
    });
    const marketId1 = { profileId: markets.profileId1.profileId };
    const marketId2 = { profileId: markets.profileId2.profileId };

    // start buying and selling votes!!! I LOVE CAPITALISM
    await userA.buyOneVote(marketId1);
    markets.profileId1.trustVotes += 1;
    await userA.buyOneVote(marketId2);
    markets.profileId2.trustVotes += 1;
    await checkMarketVotes();

    await userB.buyOneVote(marketId2);
    markets.profileId2.trustVotes += 1;
    await userB.buyOneVote(marketId1);
    markets.profileId1.trustVotes += 1;
    await checkMarketVotes();

    await userA.sellOneVote(marketId2);
    markets.profileId2.trustVotes -= 1;
    await checkMarketVotes();

    await userB.sellOneVote(marketId1);
    markets.profileId1.trustVotes -= 1;
    await checkMarketVotes();
  });

  it('should revert with ProfileNotFoundForAddress when buying votes for a non-existent profile', async () => {
    const nonEthosUser = await deployer.newWallet();
    await expect(reputationMarket.connect(nonEthosUser).buyVotes(DEFAULT.profileId, true, 0, 1))
      .to.be.revertedWithCustomError(deployer.ethosProfile.contract, 'ProfileNotFoundForAddress')
      .withArgs(nonEthosUser.address);
  });

  it('should revert with ProfileNotFoundForAddress when selling votes for a non-existent profile', async () => {
    const nonEthosUser = await deployer.newWallet();
    await expect(reputationMarket.connect(nonEthosUser).sellVotes(DEFAULT.profileId, true, 1))
      .to.be.revertedWithCustomError(deployer.ethosProfile.contract, 'ProfileNotFoundForAddress')
      .withArgs(nonEthosUser.address);
  });
});
