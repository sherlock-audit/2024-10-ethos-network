import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { type EthosAttestation, type EthosProfile, type EthosVote } from '../../typechain-types';
import { common } from '../utils/common';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { type EthosUser } from '../utils/ethosUser';

describe('EthosAttestation Create Attestation', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  let ethosProfile: EthosProfile;
  let ethosAttestation: EthosAttestation;
  let ethosVote: EthosVote;

  let EXPECTED_SIGNER: HardhatEthersSigner;

  const SERVICE_X = 'x.com';
  // const SERVICE_FB = 'fb.com';

  const ACCOUNT_NAME_BEN = 'benwalther256';
  // const ACCOUNT_NAME_IVAN = 'ivansolo512';

  const ATTESTATION_EVIDENCE_0 = 'ATTESTATION_EVIDENCE_0';
  // const ATTESTATION_EVIDENCE_1 = 'ATTESTATION_EVIDENCE_1';

  const reAttest = async (): Promise<string> => {
    let signature = await common.signatureForCreateAttestation(
      '2',
      '3592832',
      ACCOUNT_NAME_BEN,
      SERVICE_X,
      ATTESTATION_EVIDENCE_0,
      EXPECTED_SIGNER,
    );

    await ethosAttestation
      .connect(userA.signer)
      .createAttestation(
        2,
        3592832,
        { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
        ATTESTATION_EVIDENCE_0,
        signature,
      );
    const aHash = await ethosAttestation.getServiceAndAccountHash(SERVICE_X, ACCOUNT_NAME_BEN);
    await ethosAttestation.connect(userA.signer).archiveAttestation(aHash);

    signature = await common.signatureForCreateAttestation(
      '2',
      '3592833',
      ACCOUNT_NAME_BEN,
      SERVICE_X,
      ATTESTATION_EVIDENCE_0,
      EXPECTED_SIGNER,
    );
    await ethosAttestation
      .connect(userA.signer)
      .createAttestation(
        2,
        3592833,
        { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
        ATTESTATION_EVIDENCE_0,
        signature,
      );

    return aHash;
  };

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    userA = await deployer.createUser();
    userB = await deployer.createUser();
    EXPECTED_SIGNER = deployer.EXPECTED_SIGNER;

    if (!deployer.ethosVouch.contract) {
      throw new Error('EthosVouch contract not found');
    }
    ethosProfile = deployer.ethosProfile.contract;
    ethosAttestation = deployer.ethosAttestation.contract;
    ethosVote = deployer.ethosVote.contract;
  });

  it('should revert if profileId param is not verified profileId of sender', async () => {
    const signature = await common.signatureForCreateAttestation(
      '3',
      '3592832',
      ACCOUNT_NAME_BEN,
      SERVICE_X,
      ATTESTATION_EVIDENCE_0,
      EXPECTED_SIGNER,
    );
    // Impersonate the contract address

    await expect(
      ethosAttestation
        .connect(userA.signer)
        .createAttestation(
          3,
          3592832,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        ),
    )
      .to.be.revertedWithCustomError(ethosAttestation, 'AddressNotInProfile')
      .withArgs(await userA.signer.getAddress(), 3);

    // so that userB is used and lint error goes away
    await ethosProfile.connect(userB.signer).archiveProfile();
  });

  it('should revert profileNotFound if profile archived when restoring attestation', async () => {
    const signature = await common.signatureForCreateAttestation(
      '2',
      '3592832',
      ACCOUNT_NAME_BEN,
      SERVICE_X,
      ATTESTATION_EVIDENCE_0,
      EXPECTED_SIGNER,
    );

    await ethosAttestation
      .connect(userA.signer)
      .createAttestation(
        2,
        3592832,
        { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
        ATTESTATION_EVIDENCE_0,
        signature,
      );
    const aHash = await ethosAttestation.getServiceAndAccountHash(SERVICE_X, ACCOUNT_NAME_BEN);
    await ethosAttestation.connect(userA.signer).archiveAttestation(aHash);

    await ethosProfile.connect(userA.signer).archiveProfile();

    await expect(ethosAttestation.connect(userA.signer).restoreAttestation(aHash))
      .to.be.revertedWithCustomError(ethosAttestation, 'ProfileNotFound')
      .withArgs(2);
  });

  it('should revert getServiceAndAccountHash if empty params', async () => {
    await expect(ethosAttestation.getServiceAndAccountHash('', ACCOUNT_NAME_BEN))
      .to.be.revertedWithCustomError(ethosAttestation, 'AttestationInvalid')
      .withArgs('', ACCOUNT_NAME_BEN);

    await expect(ethosAttestation.getServiceAndAccountHash(SERVICE_X, ''))
      .to.be.revertedWithCustomError(ethosAttestation, 'AttestationInvalid')
      .withArgs(SERVICE_X, '');
  });

  it('should get attestation by hash', async () => {
    const signature = await common.signatureForCreateAttestation(
      '2',
      '3592832',
      ACCOUNT_NAME_BEN,
      SERVICE_X,
      ATTESTATION_EVIDENCE_0,
      EXPECTED_SIGNER,
    );

    await ethosAttestation
      .connect(userA.signer)
      .createAttestation(
        2,
        3592832,
        { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
        ATTESTATION_EVIDENCE_0,
        signature,
      );
    const aHash = await ethosAttestation.getServiceAndAccountHash(SERVICE_X, ACCOUNT_NAME_BEN);
    const attestation = await ethosAttestation.getAttestationByHash(aHash);

    expect(attestation.archived).to.be.equal(false);
    expect(attestation.attestationId).to.be.equal(1);
    expect(attestation.profileId).to.be.equal(2);
    expect(attestation.account).to.be.equal(ACCOUNT_NAME_BEN);
    expect(attestation.service).to.be.equal(SERVICE_X);
  });

  it('should reattest archived attestation', async () => {
    const aHash = await reAttest();

    const attestation = await ethosAttestation.getAttestationByHash(aHash);
    expect(attestation.archived).to.be.equal(false);
  });

  it('should not create new attestation when archived attestation restored', async () => {
    await reAttest();

    // should be 2 (because 1 is taken, 2 is next to be used)
    const count = await ethosAttestation.attestationCount();
    expect(count).to.be.equal(2);
  });

  it('should voteFor attestation by id', async () => {
    const signature = await common.signatureForCreateAttestation(
      '2',
      '3592832',
      ACCOUNT_NAME_BEN,
      SERVICE_X,
      ATTESTATION_EVIDENCE_0,
      EXPECTED_SIGNER,
    );

    await ethosAttestation
      .connect(userA.signer)
      .createAttestation(
        2,
        3592832,
        { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
        ATTESTATION_EVIDENCE_0,
        signature,
      );
    await ethosVote.connect(userB.signer).voteFor(await ethosAttestation.getAddress(), 1, true);
    const vote = await ethosVote.hasVotedFor(3, await ethosAttestation.getAddress(), 1);
    expect(vote).to.be.equal(true);
  });
});
