import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import {
  type EthosAttestation,
  type EthosProfile,
  type EthosVote,
} from '../../typechain-types/index.js';
import { common } from '../utils/common.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

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

  async function reAttest(): Promise<string> {
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
  }

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

  it('should keep attestationByHash and attestationById in sync after updates', async () => {
    // Create initial attestation
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
    const attestationId = await ethosAttestation.attestationIdByHash(aHash);

    // Get attestation using both methods
    const byHash = await ethosAttestation.attestationByHash(aHash);
    const byId = await ethosAttestation.attestationById(attestationId);

    // Verify initial state matches
    expect(byHash.attestationId).to.equal(byId.attestationId);
    expect(byHash.profileId).to.equal(byId.profileId);
    expect(byHash.archived).to.equal(byId.archived);
    expect(byHash.account).to.equal(byId.account);
    expect(byHash.service).to.equal(byId.service);
    expect(byHash.createdAt).to.equal(byId.createdAt);

    // Archive the attestation
    await ethosAttestation.connect(userA.signer).archiveAttestation(aHash);

    // Get updated attestation using both methods
    const byHashAfterArchive = await ethosAttestation.attestationByHash(aHash);
    const byIdAfterArchive = await ethosAttestation.attestationById(attestationId);

    // Verify state still matches after update
    expect(byHashAfterArchive.archived).to.equal(true);
    expect(byIdAfterArchive.archived).to.equal(true);
    expect(byHashAfterArchive.attestationId).to.equal(byIdAfterArchive.attestationId);
    expect(byHashAfterArchive.profileId).to.equal(byIdAfterArchive.profileId);
    expect(byHashAfterArchive.account).to.equal(byIdAfterArchive.account);
    expect(byHashAfterArchive.service).to.equal(byIdAfterArchive.service);
    expect(byHashAfterArchive.createdAt).to.equal(byIdAfterArchive.createdAt);
  });

  describe('Hash Collision Prevention', () => {
    // from https://github.com/sherlock-audit/2024-10-ethos-network-judging/issues/3
    /* createAttestation uses the functions: _keccakForCreateAttestation and getServiceAndAccountHash,
    which both apply keccak256 to abi.encodePacked output.
    Both functions accept strings as their input parameters,
    as such when abi.encodePacked concatenates them,
    there is an ambiguity where one string ends and starts. */
    it('should prevent hash collisions with similar string inputs', async () => {
      // Create signature with original parameters
      const signature = await common.signatureForCreateAttestation(
        '2',
        '3592832',
        'real_user',
        'discord.com',
        'discord.com/my_evidence_url',
        EXPECTED_SIGNER,
      );

      // Attempt to create attestation with manipulated parameters
      // This would have worked with abi.encodePacked but should fail with abi.encode
      await expect(
        ethosAttestation.connect(userA.signer).createAttestation(
          2,
          3592832,
          {
            account: 'real_userdiscord.com', // Manipulated account string
            service: 'discord.com',
          },
          '/my_evidence_url', // Manipulated evidence string
          signature,
        ),
      ).to.be.reverted; // Should revert due to invalid signature

      // Verify original parameters still work
      await expect(
        ethosAttestation.connect(userA.signer).createAttestation(
          2,
          3592832,
          {
            account: 'real_user',
            service: 'discord.com',
          },
          'discord.com/my_evidence_url',
          signature,
        ),
      ).to.not.be.reverted;
    });

    it('should generate different hashes for similar but distinct inputs', async () => {
      const hash1 = await ethosAttestation.getServiceAndAccountHash('discord.com', 'real_user');

      const hash2 = await ethosAttestation.getServiceAndAccountHash('discord', '.comreal_user');

      // Hashes should be different even though concatenated strings would be identical
      expect(hash1).to.not.equal(hash2);
    });
  });
});
