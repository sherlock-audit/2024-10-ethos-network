import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { type ReputationMarket } from '../../typechain-types/index.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { DEFAULT, MarketUser } from './utils.js';

/* eslint-disable react-hooks/rules-of-hooks */
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
    DEFAULT.profileId = marketUser.profileId;

    await reputationMarket
      .connect(deployer.ADMIN)
      .createMarketWithConfigAdmin(marketUser.signer.address, 0, {
        value: DEFAULT.initialLiquidity,
      });
  });

  it('should allow multiple users to buy and sell votes', async () => {
    await userA.buyOneVote({ profileId: DEFAULT.profileId });
    let { trustVotes, distrustVotes } = await reputationMarket.getMarket(DEFAULT.profileId);
    expect(trustVotes).to.equal(2);
    expect(distrustVotes).to.equal(1);
    await userB.buyOneVote({ profileId: DEFAULT.profileId });
    ({ trustVotes, distrustVotes } = await reputationMarket.getMarket(DEFAULT.profileId));
    expect(trustVotes).to.equal(3);
    expect(distrustVotes).to.equal(1);
    await userA.buyOneVote({ profileId: DEFAULT.profileId, isPositive: false });
    ({ trustVotes, distrustVotes } = await reputationMarket.getMarket(DEFAULT.profileId));
    expect(trustVotes).to.equal(3);
    expect(distrustVotes).to.equal(2);
    await userB.buyOneVote({ profileId: DEFAULT.profileId, isPositive: false });
    ({ trustVotes, distrustVotes } = await reputationMarket.getMarket(DEFAULT.profileId));
    expect(trustVotes).to.equal(3);
    expect(distrustVotes).to.equal(3);
    await userA.sellOneVote({ profileId: DEFAULT.profileId });
    ({ trustVotes, distrustVotes } = await reputationMarket.getMarket(DEFAULT.profileId));
    expect(trustVotes).to.equal(2);
    expect(distrustVotes).to.equal(3);
    await userB.sellOneVote({ profileId: DEFAULT.profileId });
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
        profileId: marketUser1.profileId,
        trustVotes: 1n,
        distrustVotes: 1n,
      },
      profileId2: {
        profileId: marketUser2.profileId,
        trustVotes: 1n,
        distrustVotes: 1n,
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
    await reputationMarket
      .connect(deployer.ADMIN)
      .createMarketWithConfigAdmin(marketUser1.signer.address, 0, {
        value: DEFAULT.initialLiquidity,
      });
    await reputationMarket
      .connect(deployer.ADMIN)
      .createMarketWithConfigAdmin(marketUser2.signer.address, 0, {
        value: DEFAULT.initialLiquidity,
      });
    const marketId1 = { profileId: markets.profileId1.profileId };
    const marketId2 = { profileId: markets.profileId2.profileId };

    // start buying and selling votes!!! I LOVE CAPITALISM
    await userA.buyOneVote(marketId1);
    markets.profileId1.trustVotes += 1n;
    await userA.buyOneVote(marketId2);
    markets.profileId2.trustVotes += 1n;
    await checkMarketVotes();

    await userB.buyOneVote(marketId2);
    markets.profileId2.trustVotes += 1n;
    await userB.buyOneVote(marketId1);
    markets.profileId1.trustVotes += 1n;
    await checkMarketVotes();

    await userA.sellOneVote(marketId2);
    markets.profileId2.trustVotes -= 1n;
    await checkMarketVotes();

    await userB.sellOneVote(marketId1);
    markets.profileId1.trustVotes -= 1n;
    await checkMarketVotes();
  });

  it('should allow buying and selling votes via an address with no profile', async () => {
    const nonEthosUser = new MarketUser(await deployer.newWallet());
    await expect(nonEthosUser.buyOneVote({ profileId: DEFAULT.profileId })).to.not.be.reverted;
    await expect(nonEthosUser.sellOneVote({ profileId: DEFAULT.profileId })).to.not.be.reverted;
  });
});
