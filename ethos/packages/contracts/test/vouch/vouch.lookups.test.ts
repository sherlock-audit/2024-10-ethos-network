import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { type EthosVouch } from '../../typechain-types';
import { mapVouch } from '../utils/conversion';
import { DEFAULT } from '../utils/defaults';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { type EthosUser } from '../utils/ethosUser';

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
      stakeToken: DEFAULT.PAYMENT_TOKEN,
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
});
