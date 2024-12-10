import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import { ethers } from 'ethers';
import { type EthosVouch } from '../../typechain-types/index.js';
import { common } from '../utils/common.js';
import { REVIEW_PARAMS, DEFAULT } from '../utils/defaults.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { EthosUser } from '../utils/ethosUser.js';

describe('EthosVouch Vouching by Address', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  let ethosVouch: EthosVouch;
  let unregisteredUser: EthosUser;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);
    [userA, userB] = await Promise.all([deployer.createUser(), deployer.createUser()]);

    // Create a user without registering their profile
    const signer = await deployer.newWallet();
    unregisteredUser = new EthosUser(signer, 0n, deployer);

    if (!deployer.ethosVouch.contract) {
      throw new Error('EthosVouch contract not found');
    }
    ethosVouch = deployer.ethosVouch.contract;
  });

  it('should revert when vouching for an address without a profile', async () => {
    await expect(userA.vouch(unregisteredUser))
      .to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'InvalidEthosProfileForVouch')
      .withArgs(0);
  });

  it("should revert when vouching for an invited address that hasn't joined", async () => {
    // Grant invite to unregistered user but don't create profile
    await deployer.ethosProfile.contract
      ?.connect(deployer.OWNER)
      .inviteAddress(unregisteredUser.signer.address);

    await expect(userA.vouch(unregisteredUser))
      .to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'InvalidEthosProfileForVouch')
      .withArgs(0);
  });

  it('should successfully vouch for a valid profile address', async () => {
    await userA.vouch(userB);

    // Verify the vouch was created
    const vouch = await ethosVouch.verifiedVouchByAuthorForSubjectProfileId(
      userA.profileId,
      userB.profileId,
    );
    expect(vouch.authorProfileId).to.equal(userA.profileId);
    expect(vouch.subjectProfileId).to.equal(userB.profileId);
  });

  it('should create a vouch using vouchByAddress', async () => {
    const comment = 'Test comment';
    const metadata = 'Test metadata';
    const value = ethers.parseEther('0.001');

    await ethosVouch
      .connect(userA.signer)
      .vouchByAddress(userB.signer.address, comment, metadata, { value });

    const vouch = await ethosVouch.verifiedVouchByAuthorForSubjectAddress(
      userA.profileId,
      userB.signer.address,
    );

    expect(vouch.authorProfileId).to.equal(userA.profileId);
    expect(vouch.subjectProfileId).to.equal(userB.profileId);
    expect(vouch.comment).to.equal(comment);
    expect(vouch.metadata).to.equal(metadata);
  });

  it('should revert vouchByAddress with zero address', async () => {
    const comment = 'Test comment';
    const metadata = 'Test metadata';
    const value = ethers.parseEther('0.001');

    await expect(
      ethosVouch
        .connect(userA.signer)
        .vouchByAddress(ethers.ZeroAddress, comment, metadata, { value }),
    ).to.be.revertedWithCustomError(ethosVouch, 'ZeroAddress');
  });
});

describe('EthosVouch Profile Status Tests', () => {
  let deployer: EthosDeployer;
  let ethosVouch: EthosVouch;
  let userA: EthosUser;
  let mockProfileByAddress: EthosUser;
  let mockProfileByAttestation: EthosUser;
  let archivedProfileUser: EthosUser;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);
    ethosVouch = deployer.ethosVouch.contract;
    userA = await deployer.createUser();

    // Create a mock profile by leaving a review for an attestation
    await userA.review({
      ...REVIEW_PARAMS,
      attestationDetails: { account: DEFAULT.ACCOUNT_NAME_EXAMPLE, service: DEFAULT.SERVICE_X },
    });
    // get the profile id of the mock profile by attestation
    const mockAttestationHash = await common.attestationHash(
      DEFAULT.ACCOUNT_NAME_EXAMPLE,
      DEFAULT.SERVICE_X,
    );
    const mockAttestationProfileId =
      await deployer.ethosProfile.contract?.profileIdByAttestation(mockAttestationHash);
    const mockAttestationSigner = await deployer.newWallet();
    mockProfileByAttestation = new EthosUser(
      mockAttestationSigner,
      mockAttestationProfileId,
      deployer,
    );

    // create a mock profile by leaving a review for an address
    const mockAddressSigner = await deployer.newWallet();
    await userA.review({
      ...REVIEW_PARAMS,
      address: mockAddressSigner.address,
    });
    // get the profile id of the mock profile by address
    const mockAddressProfileId = await deployer.ethosProfile.contract?.profileIdByAddress(
      mockAddressSigner.address,
    );
    mockProfileByAddress = new EthosUser(mockAddressSigner, mockAddressProfileId, deployer);

    // Create and then archive a profile
    archivedProfileUser = await deployer.createUser();
    await archivedProfileUser.archiveProfile();
  });

  it('should allow vouching for a mock profile created via address review', async () => {
    await userA.vouch(mockProfileByAddress);

    const vouch = await ethosVouch.verifiedVouchByAuthorForSubjectProfileId(
      userA.profileId,
      mockProfileByAddress.profileId,
    );
    expect(vouch.authorProfileId).to.equal(userA.profileId);
    expect(vouch.subjectProfileId).to.equal(mockProfileByAddress.profileId);
  });

  it('should not allow vouching for an archived profile', async () => {
    await expect(userA.vouch(archivedProfileUser))
      .to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'InvalidEthosProfileForVouch')
      .withArgs(archivedProfileUser.profileId);
  });

  it('should not allow vouching for an unverified, non-mock profile', async () => {
    const unverifiedSigner = await deployer.newWallet();
    const unverifiedUser = new EthosUser(unverifiedSigner, 0n, deployer);

    await expect(userA.vouch(unverifiedUser))
      .to.be.revertedWithCustomError(deployer.ethosVouch.contract, 'InvalidEthosProfileForVouch')
      .withArgs(0);
  });

  it('should handle profile transitions from mock to verified for mocks created via address review', async () => {
    // First vouch for mock profile
    await userA.vouch(mockProfileByAddress);

    // Verify the mock profile by creating a real profile
    await deployer.ethosProfile.contract
      ?.connect(deployer.OWNER)
      .inviteAddress(mockProfileByAddress.signer.address);
    await deployer.ethosProfile.contract?.connect(mockProfileByAddress.signer).createProfile(1);

    // Because the original vouch is still there, another vouch should fail
    await expect(userA.vouch(mockProfileByAddress)).to.be.revertedWithCustomError(
      deployer.ethosVouch.contract,
      'AlreadyVouched',
    );

    // Verify the original vouch still exists
    const vouch = await ethosVouch.verifiedVouchByAuthorForSubjectProfileId(
      userA.profileId,
      mockProfileByAddress.profileId,
    );
    expect(vouch.authorProfileId).to.equal(userA.profileId);
    expect(vouch.subjectProfileId).to.equal(mockProfileByAddress.profileId);
  });

  it('should allow vouching for a mock profile created via attestation review', async () => {
    await userA.vouch(mockProfileByAttestation);

    const vouch = await ethosVouch.verifiedVouchByAuthorForSubjectProfileId(
      userA.profileId,
      mockProfileByAttestation.profileId,
    );
    expect(vouch.authorProfileId).to.equal(userA.profileId);
    expect(vouch.subjectProfileId).to.equal(mockProfileByAttestation.profileId);
  });

  it('should handle profile transitions from mock to verified for mocks created via attestation review', async () => {
    // First vouch for mock profile
    await userA.vouch(mockProfileByAttestation);

    // Verify the mock profile by creating a real profile
    await deployer.ethosProfile.contract
      ?.connect(deployer.OWNER)
      .inviteAddress(mockProfileByAttestation.signer.address);
    await deployer.ethosProfile.contract?.connect(mockProfileByAttestation.signer).createProfile(1);

    // Because the original vouch is still there, another vouch should fail
    await expect(userA.vouch(mockProfileByAttestation)).to.be.revertedWithCustomError(
      deployer.ethosVouch.contract,
      'AlreadyVouched',
    );

    const vouch = await ethosVouch.verifiedVouchByAuthorForSubjectProfileId(
      userA.profileId,
      mockProfileByAttestation.profileId,
    );
    expect(vouch.authorProfileId).to.equal(userA.profileId);
    expect(vouch.subjectProfileId).to.equal(mockProfileByAttestation.profileId);
  });
});
