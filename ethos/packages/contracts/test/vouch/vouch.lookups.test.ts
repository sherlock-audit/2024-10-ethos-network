import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import { type EthosVouch } from '../../typechain-types/index.js';
import { mapVouch } from '../utils/conversion.js';
import { DEFAULT, VOUCH_PARAMS } from '../utils/defaults.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

describe('EthosVouch Lookups', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    [userA, userB] = await Promise.all([deployer.createUser(), deployer.createUser()]);
  });

  it('should execute verifiedVouchByAuthorForSubjectProfileId with known good values', async () => {
    const { vouchedAt } = await userA.vouch(userB);
    const vouch = await deployer.ethosVouch.contract?.verifiedVouchByAuthorForSubjectProfileId(
      userA.profileId,
      userB.profileId,
    );

    const expectedVouch: EthosVouch.VouchStruct = {
      vouchId: 0n, // TODO how to track vouch ids ?
      authorProfileId: userA.profileId,
      authorAddress: userA.signer.address,
      subjectProfileId: userB.profileId,
      balance: DEFAULT.PAYMENT_AMOUNT,
      comment: DEFAULT.COMMENT,
      metadata: DEFAULT.METADATA,
      archived: false,
      unhealthy: false,
      activityCheckpoints: {
        vouchedAt,
        unvouchedAt: 0n,
        unhealthyAt: 0n,
      },
    };

    expect(mapVouch(vouch)).to.deep.contain(expectedVouch);
  });

  it('should revert verifiedVouchByAuthorForSubjectProfileId with WrongSubjectProfileIdForVouch', async () => {
    await userA.vouch(userB);
    await expect(
      deployer.ethosVouch.contract?.verifiedVouchByAuthorForSubjectProfileId(
        userA.profileId,
        userB.profileId + 1n,
      ),
    ).to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'WrongSubjectProfileIdForVouch');
  });

  it('should return 0 balance for archived vouches', async () => {
    // Setup: Create a vouch
    const { vouchId } = await userA.vouch(userB);

    // Check initial balance
    const initialBalance = await userA.getVouchBalance(vouchId);
    expect(initialBalance).to.be.gt(0);

    // Archive the vouch by unvouching
    await userA.unvouch(vouchId);

    // Check balances after archiving
    const archivedBalance = await userA.getVouchBalance(vouchId);
    expect(archivedBalance).to.equal(0);
  });

  it('should return correct balance for active vouches', async () => {
    // Create a vouch with a specific amount
    const { vouchId } = await userA.vouch(userB);

    // Get balances
    const balance = await userB.getVouchBalance(vouchId);

    // Balance should be greater than 0 but less than or equal to initial amount
    expect(balance).to.be.gt(0);
    expect(balance).to.be.lte(VOUCH_PARAMS.paymentAmount);
  });
});
