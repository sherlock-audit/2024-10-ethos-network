import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import { type EthosProfile, type EthosAttestation } from '../../typechain-types/index.js';
import { common } from '../utils/common.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

function generateRandomValue(): string {
  return String(Date.now());
}

describe('EthosAttestation Claim Attestation', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  let userC: EthosUser;
  let EXPECTED_SIGNER: HardhatEthersSigner;
  let RANDOM_ACC: HardhatEthersSigner;
  let ethosAttestation: EthosAttestation;
  let ethosProfile: EthosProfile;

  const SERVICE_X = 'x.com';
  const ACCOUNT_NAME = 'nasa';
  const ATTESTATION_EVIDENCE_0 = `https://x.com/${ACCOUNT_NAME}/status/1234`;
  const ATTESTATION_EVIDENCE_1 = `https://x.com/${ACCOUNT_NAME}/status/5678`;

  async function getSignature(
    profileId: string,
    evidence: string,
    signer: HardhatEthersSigner,
    service = SERVICE_X,
    account = ACCOUNT_NAME,
  ): Promise<[string, string]> {
    const randomValue = generateRandomValue();
    const signature = await common.signatureForCreateAttestation(
      profileId,
      randomValue,
      account,
      service,
      evidence,
      signer,
    );

    return [signature, randomValue];
  }

  async function createFirstAttestation(
    service = SERVICE_X,
    account = ACCOUNT_NAME,
  ): Promise<string> {
    const profileId = String(userA.profileId);

    const [signatureA, randomValueA] = await getSignature(
      profileId,
      ATTESTATION_EVIDENCE_0,
      EXPECTED_SIGNER,
      service,
      account,
    );

    // Create an attestation for user A
    await ethosAttestation
      .connect(userA.signer)
      .createAttestation(
        profileId,
        randomValueA,
        { account, service },
        ATTESTATION_EVIDENCE_0,
        signatureA,
      );

    const attestationHash = await ethosAttestation.getServiceAndAccountHash(service, account);

    return attestationHash;
  }

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    [userA, userB, userC] = await Promise.all([
      deployer.createUser(),
      deployer.createUser(),
      deployer.createUser(),
    ]);
    EXPECTED_SIGNER = deployer.EXPECTED_SIGNER;
    RANDOM_ACC = deployer.RANDOM_ACC;

    ethosAttestation = deployer.ethosAttestation.contract;
    ethosProfile = deployer.ethosProfile.contract;
  });

  it('should not claim an attestation if the profileId did not change', async () => {
    const attestationHash = await createFirstAttestation();

    const [signatureB, randomValueB] = await getSignature(
      String(userA.profileId),
      ATTESTATION_EVIDENCE_0,
      EXPECTED_SIGNER,
    );

    // Claim attestation with the same X account for user A again
    await expect(
      ethosAttestation
        .connect(userA.signer)
        .createAttestation(
          String(userA.profileId),
          randomValueB,
          { account: ACCOUNT_NAME, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signatureB,
        ),
    )
      .to.be.revertedWithCustomError(ethosAttestation, 'AttestationAlreadyExists')
      .withArgs(attestationHash);
  });

  it('should not claim for non-existing profileId', async () => {
    await createFirstAttestation();

    const nonExistingProfileId = '999';

    const [signatureB, randomValueB] = await getSignature(
      nonExistingProfileId,
      ATTESTATION_EVIDENCE_1,
      EXPECTED_SIGNER,
    );

    // Claim attestation with the same X account for a user with no Ethos profile
    await expect(
      ethosAttestation
        .connect(RANDOM_ACC)
        .createAttestation(
          nonExistingProfileId,
          randomValueB,
          { account: ACCOUNT_NAME, service: SERVICE_X },
          ATTESTATION_EVIDENCE_1,
          signatureB,
        ),
    )
      .to.be.revertedWithCustomError(ethosAttestation, 'ProfileNotFound')
      .withArgs(nonExistingProfileId);
  });

  it('should not claim when profileId does not belong to sender', async () => {
    await createFirstAttestation();

    const [signatureB, randomValueB] = await getSignature(
      String(userC.profileId),
      ATTESTATION_EVIDENCE_1,
      EXPECTED_SIGNER,
    );

    // Claim attestation with the same X account for a userB but profileId does not belong to userB
    await expect(
      ethosAttestation
        .connect(userB.signer)
        .createAttestation(
          String(userC.profileId),
          randomValueB,
          { account: ACCOUNT_NAME, service: SERVICE_X },
          ATTESTATION_EVIDENCE_1,
          signatureB,
        ),
    )
      .to.be.revertedWithCustomError(ethosAttestation, 'AddressNotInProfile')
      .withArgs(userB.signer.address, String(userC.profileId));
  });

  it('should claim an attestation', async () => {
    const attestationHash = await createFirstAttestation();

    // Get an intermediate state
    const [
      initialAttestation,
      initialHashesOfUserA,
      initialHashesOfUserB,
      initialAttestationIndexByUserA,
      initialAttestationIndexByUserB,
      initialProfileIdByAttestation,
    ] = await Promise.all([
      ethosAttestation.getAttestationByHash(attestationHash),
      ethosAttestation.getAttestationHashesByProfileId(userA.profileId),
      ethosAttestation.getAttestationHashesByProfileId(userB.profileId),
      ethosAttestation.getAttestationIndexByProfileIdAndHash(userA.profileId, attestationHash),
      ethosAttestation
        .getAttestationIndexByProfileIdAndHash(userB.profileId, attestationHash)
        .catch(() => null),
      ethosProfile.profileIdByAttestation(attestationHash),
    ]);

    const [signatureB, randomValueB] = await getSignature(
      String(userB.profileId),
      ATTESTATION_EVIDENCE_1,
      EXPECTED_SIGNER,
    );

    await expect(
      ethosAttestation
        .connect(userB.signer)
        .createAttestation(
          String(userB.profileId),
          randomValueB,
          { account: ACCOUNT_NAME, service: SERVICE_X },
          ATTESTATION_EVIDENCE_1,
          signatureB,
        ),
    )
      .to.emit(ethosAttestation, 'AttestationClaimed')
      .withArgs(
        initialAttestation.attestationId,
        SERVICE_X,
        ACCOUNT_NAME,
        ATTESTATION_EVIDENCE_1,
        userB.profileId,
      );

    // Get the final state
    const [
      claimedAttestation,
      afterHashesOfUserA,
      afterHashesOfUserB,
      afterAttestationIndexByUserA,
      afterAttestationIndexByUserB,
      afterProfileIdByAttestation,
    ] = await Promise.all([
      ethosAttestation.getAttestationByHash(attestationHash),
      ethosAttestation.getAttestationHashesByProfileId(userA.profileId),
      ethosAttestation.getAttestationHashesByProfileId(userB.profileId),
      ethosAttestation
        .getAttestationIndexByProfileIdAndHash(userA.profileId, attestationHash)
        .catch(() => null),
      ethosAttestation.getAttestationIndexByProfileIdAndHash(userB.profileId, attestationHash),
      ethosProfile.profileIdByAttestation(attestationHash),
    ]);

    expect(initialAttestation.profileId).to.be.equal(userA.profileId);
    expect(claimedAttestation.profileId).to.be.equal(userB.profileId);

    expect(initialProfileIdByAttestation).to.be.equal(userA.profileId);
    expect(afterProfileIdByAttestation).to.be.equal(userB.profileId);

    expect(initialAttestation.archived).to.be.equal(false);
    expect(claimedAttestation.archived).to.be.equal(false);

    expect(initialHashesOfUserA).to.be.deep.equal([attestationHash]);
    expect(initialHashesOfUserB).to.be.deep.equal([]);
    expect(afterHashesOfUserA).to.be.deep.equal([]);
    expect(afterHashesOfUserB).to.be.deep.equal([attestationHash]);

    expect(initialAttestationIndexByUserA).to.be.equal(0);
    expect(afterAttestationIndexByUserA).to.be.equal(null);
    expect(initialAttestationIndexByUserB).to.be.equal(null);
    expect(afterAttestationIndexByUserB).to.be.equal(0);
  });

  it('should claim and unarchive an attestation if it was archived', async () => {
    const attestationHash = await createFirstAttestation();

    // Archive attestation on behalf of user A
    await ethosAttestation.connect(userA.signer).archiveAttestation(attestationHash);

    // Get an intermediate state
    const [
      initialAttestation,
      initialHashesOfUserA,
      initialHashesOfUserB,
      initialProfileIdByAttestation,
    ] = await Promise.all([
      ethosAttestation.getAttestationByHash(attestationHash),
      ethosAttestation.getAttestationHashesByProfileId(userA.profileId),
      ethosAttestation.getAttestationHashesByProfileId(userB.profileId),
      ethosProfile.profileIdByAttestation(attestationHash),
    ]);

    const [signatureB, randomValueB] = await getSignature(
      String(userB.profileId),
      ATTESTATION_EVIDENCE_1,
      EXPECTED_SIGNER,
    );

    await expect(
      ethosAttestation
        .connect(userB.signer)
        .createAttestation(
          String(userB.profileId),
          randomValueB,
          { account: ACCOUNT_NAME, service: SERVICE_X },
          ATTESTATION_EVIDENCE_1,
          signatureB,
        ),
    )
      .to.emit(ethosAttestation, 'AttestationClaimed')
      .withArgs(
        initialAttestation.attestationId,
        SERVICE_X,
        ACCOUNT_NAME,
        ATTESTATION_EVIDENCE_1,
        userB.profileId,
      );

    // Get the final state
    const [
      claimedAttestation,
      afterHashesOfUserA,
      afterHashesOfUserB,
      afterProfileIdByAttestation,
    ] = await Promise.all([
      ethosAttestation.getAttestationByHash(attestationHash),
      ethosAttestation.getAttestationHashesByProfileId(userA.profileId),
      ethosAttestation.getAttestationHashesByProfileId(userB.profileId),
      ethosProfile.profileIdByAttestation(attestationHash),
    ]);

    expect(initialAttestation.profileId).to.be.equal(userA.profileId);
    expect(claimedAttestation.profileId).to.be.equal(userB.profileId);

    expect(initialProfileIdByAttestation).to.be.equal(userA.profileId);
    expect(afterProfileIdByAttestation).to.be.equal(userB.profileId);

    expect(initialAttestation.archived).to.be.equal(true);
    expect(claimedAttestation.archived).to.be.equal(false);

    expect(initialHashesOfUserA).to.be.deep.equal([attestationHash]);
    expect(initialHashesOfUserB).to.be.deep.equal([]);
    expect(afterHashesOfUserA).to.be.deep.equal([]);
    expect(afterHashesOfUserB).to.be.deep.equal([attestationHash]);
  });

  it('should claim one of the attestation of userA', async () => {
    const secondAccountUserA = 'spacex';
    const attestationHashA = await createFirstAttestation(SERVICE_X, secondAccountUserA);
    const attestationHashB = await createFirstAttestation();

    // Get an intermediate state
    const [
      initialAttestationA,
      initialAttestationB,
      initialHashesOfUserA,
      initialHashesOfUserB,
      initialAttestationAIndexByUserA,
      initialAttestationBIndexByUserA,
      initialAttestationBIndexByUserB,
      initialProfileIdByAttestationA,
      initialProfileIdByAttestationB,
    ] = await Promise.all([
      ethosAttestation.getAttestationByHash(attestationHashA),
      ethosAttestation.getAttestationByHash(attestationHashB),
      ethosAttestation.getAttestationHashesByProfileId(userA.profileId),
      ethosAttestation.getAttestationHashesByProfileId(userB.profileId),
      ethosAttestation.getAttestationIndexByProfileIdAndHash(userA.profileId, attestationHashA),
      ethosAttestation.getAttestationIndexByProfileIdAndHash(userA.profileId, attestationHashB),
      ethosAttestation
        .getAttestationIndexByProfileIdAndHash(userB.profileId, attestationHashB)
        .catch(() => null),
      ethosProfile.profileIdByAttestation(attestationHashA),
      ethosProfile.profileIdByAttestation(attestationHashB),
    ]);

    const [signatureB, randomValueB] = await getSignature(
      String(userB.profileId),
      ATTESTATION_EVIDENCE_1,
      EXPECTED_SIGNER,
    );

    await expect(
      ethosAttestation
        .connect(userB.signer)
        .createAttestation(
          String(userB.profileId),
          randomValueB,
          { account: ACCOUNT_NAME, service: SERVICE_X },
          ATTESTATION_EVIDENCE_1,
          signatureB,
        ),
    )
      .to.emit(ethosAttestation, 'AttestationClaimed')
      .withArgs(
        initialAttestationB.attestationId,
        SERVICE_X,
        ACCOUNT_NAME,
        ATTESTATION_EVIDENCE_1,
        userB.profileId,
      );

    // Get the final state
    const [
      untouchedAttestation,
      claimedAttestation,
      afterHashesOfUserA,
      afterHashesOfUserB,
      afterAttestationAIndexByUserA,
      afterAttestationBIndexByUserA,
      afterAttestationBIndexByUserB,
      untouchedProfileIdByAttestation,
      claimedProfileIdByAttestation,
    ] = await Promise.all([
      ethosAttestation.getAttestationByHash(attestationHashA),
      ethosAttestation.getAttestationByHash(attestationHashB),
      ethosAttestation.getAttestationHashesByProfileId(userA.profileId),
      ethosAttestation.getAttestationHashesByProfileId(userB.profileId),
      ethosAttestation.getAttestationIndexByProfileIdAndHash(userA.profileId, attestationHashA),
      ethosAttestation
        .getAttestationIndexByProfileIdAndHash(userA.profileId, attestationHashB)
        .catch(() => null),
      ethosAttestation.getAttestationIndexByProfileIdAndHash(userB.profileId, attestationHashB),
      ethosProfile.profileIdByAttestation(attestationHashA),
      ethosProfile.profileIdByAttestation(attestationHashB),
    ]);

    expect(initialAttestationA.profileId).to.be.equal(userA.profileId);
    expect(untouchedAttestation.profileId).to.be.equal(userA.profileId);
    expect(claimedAttestation.profileId).to.be.equal(userB.profileId);

    expect(initialProfileIdByAttestationA).to.be.equal(userA.profileId);
    expect(untouchedProfileIdByAttestation).to.be.equal(userA.profileId);
    expect(initialProfileIdByAttestationB).to.be.equal(userA.profileId);
    expect(claimedProfileIdByAttestation).to.be.equal(userB.profileId);

    expect(initialHashesOfUserA).to.be.deep.equal([attestationHashA, attestationHashB]);
    expect(initialHashesOfUserB).to.be.deep.equal([]);
    expect(afterHashesOfUserA).to.be.deep.equal([attestationHashA]);
    expect(afterHashesOfUserB).to.be.deep.equal([attestationHashB]);

    expect(initialAttestationAIndexByUserA).to.be.equal(0);
    expect(afterAttestationAIndexByUserA).to.be.equal(0);
    expect(initialAttestationBIndexByUserA).to.be.equal(1);
    expect(afterAttestationBIndexByUserA).to.be.equal(null);
    expect(initialAttestationBIndexByUserB).to.be.equal(null);
    expect(afterAttestationBIndexByUserB).to.be.equal(0);
  });

  describe('getAttestationIndexByProfileIdAndHash', () => {
    it('getAttestationIndexByProfileIdAndHash should return correct index of revert', async () => {
      const secondAccountUserA = 'spacex';
      const attestationHashA = await createFirstAttestation(SERVICE_X, secondAccountUserA);
      const attestationHashB = await createFirstAttestation();
      const attestationHashC = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        'example',
      );

      expect(
        await ethosAttestation.getAttestationIndexByProfileIdAndHash(
          userA.profileId,
          attestationHashA,
        ),
      ).to.be.equal(0);
      expect(
        await ethosAttestation.getAttestationIndexByProfileIdAndHash(
          userA.profileId,
          attestationHashB,
        ),
      ).to.be.equal(1);
      await expect(
        ethosAttestation.getAttestationIndexByProfileIdAndHash(userA.profileId, attestationHashC),
      )
        .to.revertedWithCustomError(ethosAttestation, 'AttestationNotFound')
        .withArgs(attestationHashC);
    });
  });

  it('should revert when archived profile attempts to claim attestation', async () => {
    // Create initial attestation with userA
    const [signatureA, randomValueA] = await getSignature(
      String(userA.profileId),
      ATTESTATION_EVIDENCE_0,
      EXPECTED_SIGNER,
      SERVICE_X,
      ACCOUNT_NAME,
    );

    await ethosAttestation
      .connect(userA.signer)
      .createAttestation(
        String(userA.profileId),
        randomValueA,
        { account: ACCOUNT_NAME, service: SERVICE_X },
        ATTESTATION_EVIDENCE_0,
        signatureA,
      );

    // Archive userB's profile using EthosUser method
    await userB.archiveProfile();

    // Attempt to claim attestation with archived profile
    const [signatureB, randomValueB] = await getSignature(
      String(userB.profileId),
      ATTESTATION_EVIDENCE_0,
      EXPECTED_SIGNER,
      SERVICE_X,
      ACCOUNT_NAME,
    );

    await expect(
      ethosAttestation
        .connect(userB.signer)
        .createAttestation(
          String(userB.profileId),
          randomValueB,
          { account: ACCOUNT_NAME, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signatureB,
        ),
    )
      .to.be.revertedWithCustomError(ethosAttestation, 'ProfileNotFound')
      .withArgs(String(userB.profileId));
  });

  it('should revert when archived profile attempts to archive attestation', async () => {
    // Create initial attestation with userA
    const attestationHash = await createFirstAttestation();

    // Archive userA's profile
    await userA.archiveProfile();

    // Attempt to archive attestation with archived profile
    await expect(ethosAttestation.connect(userA.signer).archiveAttestation(attestationHash))
      .to.be.revertedWithCustomError(ethosAttestation, 'ProfileNotFound')
      .withArgs(String(userA.profileId));
  });
});
