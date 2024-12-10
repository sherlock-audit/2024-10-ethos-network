import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { common } from './utils/common.js';
import { smartContractNames } from './utils/mock.names.js';

const { ethers } = hre;

describe('EthosAttestation', () => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async function deployFixture() {
    const [
      OWNER,
      ADMIN,
      EXPECTED_SIGNER,
      WRONG_ADDRESS_0,
      WRONG_ADDRESS_1,
      OTHER_0,
      OTHER_1,
      PROFILE_CREATOR_0,
      PROFILE_CREATOR_1,
    ] = await ethers.getSigners();
    const ZERO_ADDRESS = ethers.ZeroAddress;

    // deploy Smart Contracts
    const ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy');

    const contractAddressManager = await ethers.deployContract('ContractAddressManager', []);
    const contractAddressManagerAddress = await contractAddressManager.getAddress();

    const signatureVerifier = await ethers.deployContract('SignatureVerifier', []);
    const signatureVerifierAddress = await signatureVerifier.getAddress();

    const interactionControl = await ethers.deployContract('InteractionControl', [
      OWNER.address,
      contractAddressManagerAddress,
    ]);
    const interactionControlAddress = await interactionControl.getAddress();

    const attestation = await ethers.getContractFactory('EthosAttestation');
    const attestationImplementation = await ethers.deployContract('EthosAttestation', []);
    const ethosAttestationImpAddress = await attestationImplementation.getAddress();

    const ethosAttestationProxy = await ERC1967Proxy.deploy(
      ethosAttestationImpAddress,
      attestation.interface.encodeFunctionData('initialize', [
        OWNER.address,
        ADMIN.address,
        EXPECTED_SIGNER.address,
        signatureVerifierAddress,
        contractAddressManagerAddress,
      ]),
    );
    await ethosAttestationProxy.waitForDeployment();
    const ethosAttestationAddress = await ethosAttestationProxy.getAddress();

    const ethosAttestation = await ethers.getContractAt(
      'EthosAttestation',
      ethosAttestationAddress,
    );

    const profile = await ethers.getContractFactory('EthosProfile');
    const profileImplementation = await ethers.deployContract('EthosProfile', []);
    const profileImpAddress = await profileImplementation.getAddress();

    const ethosProfileProxy = await ERC1967Proxy.deploy(
      profileImpAddress,
      profile.interface.encodeFunctionData('initialize', [
        OWNER.address,
        ADMIN.address,
        EXPECTED_SIGNER.address,
        signatureVerifierAddress,
        contractAddressManagerAddress,
      ]),
    );
    await ethosProfileProxy.waitForDeployment();
    const ethosProfileAddress = await ethosProfileProxy.getAddress();

    const ethosProfile = await ethers.getContractAt('EthosProfile', ethosProfileAddress);

    const review = await ethers.getContractFactory('EthosReview');
    const reviewImplementation = await ethers.deployContract('EthosReview', []);
    const reviewImpAddress = await reviewImplementation.getAddress();

    const ethosReviewProxy = await ERC1967Proxy.deploy(
      reviewImpAddress,
      review.interface.encodeFunctionData('initialize', [
        OWNER.address,
        ADMIN.address,
        EXPECTED_SIGNER.address,
        signatureVerifierAddress,
        contractAddressManagerAddress,
      ]),
    );
    await ethosReviewProxy.waitForDeployment();
    const ethosReviewAddress = await ethosReviewProxy.getAddress();

    const ethosReview = await ethers.getContractAt('EthosReview', ethosReviewAddress);

    // update Smart Contracts
    await contractAddressManager.updateContractAddressesForNames(
      [ethosAttestationAddress, ethosProfileAddress, ethosReviewAddress, interactionControlAddress],
      [
        smartContractNames.attestation,
        smartContractNames.profile,
        smartContractNames.review,
        smartContractNames.interactionControl,
      ],
    );

    await interactionControl.addControlledContractNames([
      smartContractNames.attestation,
      smartContractNames.profile,
      smartContractNames.review,
    ]);

    const SERVICE_X = 'x.com';
    const SERVICE_FB = 'fb.com';

    const ACCOUNT_NAME_BEN = 'benwalther256';
    const ACCOUNT_NAME_IVAN = 'ivansolo512';

    const ATTESTATION_EVIDENCE_0 = 'ATTESTATION_EVIDENCE_0';
    const ATTESTATION_EVIDENCE_1 = 'ATTESTATION_EVIDENCE_1';

    const provider = ethers.provider;

    return {
      OWNER,
      ADMIN,
      EXPECTED_SIGNER,
      WRONG_ADDRESS_0,
      WRONG_ADDRESS_1,
      OTHER_0,
      OTHER_1,
      ZERO_ADDRESS,
      PROFILE_CREATOR_0,
      PROFILE_CREATOR_1,
      SERVICE_X,
      SERVICE_FB,
      ACCOUNT_NAME_BEN,
      ACCOUNT_NAME_IVAN,
      ATTESTATION_EVIDENCE_0,
      ATTESTATION_EVIDENCE_1,
      signatureVerifier,
      interactionControl,
      ethosAttestation,
      ethosProfile,
      ethosReview,
      contractAddressManager,
      ERC1967Proxy,
      provider,
    };
  }

  describe('upgradeable', () => {
    it('should fail if upgraded not by owner', async () => {
      const { ADMIN, ethosAttestation } = await loadFixture(deployFixture);

      const implementation = await ethers.deployContract('EthosAttestation', []);
      const implementationAddress = await implementation.getAddress();

      await expect(
        ethosAttestation.connect(ADMIN).upgradeToAndCall(implementationAddress, '0x'),
      ).to.be.revertedWithCustomError(ethosAttestation, 'AccessControlUnauthorizedAccount');
    });

    it('should fail if upgraded contract is zero address', async () => {
      const { OWNER, ethosAttestation } = await loadFixture(deployFixture);

      await expect(
        ethosAttestation.connect(OWNER).upgradeToAndCall(ethers.ZeroAddress, '0x'),
      ).to.be.revertedWithCustomError(ethosAttestation, 'ZeroAddress');
    });

    it('should upgrade to new implementation address', async () => {
      const { OWNER, ethosAttestation, provider } = await loadFixture(deployFixture);
      const proxyAddr = await ethosAttestation.getAddress();

      const implementation = await ethers.deployContract('EthosAttestation', []);
      const implementationAddress = await implementation.getAddress();
      await ethosAttestation.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);
    });

    it('should persist storage after upgrade', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
        OTHER_0,
        provider,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      const randValue = '123';

      // create normally
      const signature = await common.signatureForCreateAttestation(
        String(await ethosProfile.profileIdByAddress(OTHER_0.address)),
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          String(await ethosProfile.profileIdByAddress(OTHER_0.address)),
          randValue,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      // create for failure
      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      const proxyAddr = await ethosAttestation.getAddress();

      const implementation = await ethers.deployContract('EthosAttestationMock', []);
      const implementationAddress = await implementation.getAddress();
      await ethosAttestation.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);

      const doesExist = await ethosAttestation.attestationExistsForHash(attestationHash);
      expect(doesExist).to.equal(true);
    });

    it('should upgrade and enable new storage', async () => {
      const { OWNER, ethosAttestation, provider } = await loadFixture(deployFixture);
      const proxyAddr = await ethosAttestation.getAddress();

      const implementation = await ethers.deployContract('EthosAttestationMock', []);
      const implementationAddress = await implementation.getAddress();
      await ethosAttestation.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);

      const proxy = await ethers.getContractAt('EthosAttestationMock', proxyAddr);
      await proxy.setTestValue(22);
      const testValue = await proxy.testValue();
      expect(testValue).to.equal(22);
    });

    it('should revert calling initialize a second time', async () => {
      const {
        OWNER,
        ethosAttestation,
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        contractAddressManager,
      } = await loadFixture(deployFixture);

      const attestation = await ethers.getContractFactory('EthosAttestationMock');
      const implementation = await ethers.deployContract('EthosAttestationMock', []);
      const implementationAddress = await implementation.getAddress();
      await expect(
        ethosAttestation
          .connect(OWNER)
          .upgradeToAndCall(
            implementationAddress,
            attestation.interface.encodeFunctionData('initialize', [
              OWNER.address,
              ADMIN.address,
              EXPECTED_SIGNER.address,
              await signatureVerifier.getAddress(),
              await contractAddressManager.getAddress(),
            ]),
          ),
      ).to.revertedWithCustomError(ethosAttestation, 'InvalidInitialization');
    });
  });

  describe('constructor', () => {
    it('should set correct params', async () => {
      const {
        OWNER,
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        ethosAttestation,
        contractAddressManager,
      } = await loadFixture(deployFixture);

      const OWNER_ROLE = await ethosAttestation.OWNER_ROLE();
      expect(await ethosAttestation.getRoleMember(OWNER_ROLE, 0)).to.equal(
        OWNER.address,
        'Wrong owner',
      );

      const ADMIN_ROLE = await ethosAttestation.ADMIN_ROLE();
      expect(await ethosAttestation.getRoleMember(ADMIN_ROLE, 0)).to.equal(
        ADMIN.address,
        'Wrong admin',
      );

      expect(await ethosAttestation.expectedSigner()).to.equal(
        EXPECTED_SIGNER.address,
        'Wrong expectedSigner',
      );

      expect(await ethosAttestation.signatureVerifier()).to.equal(
        await signatureVerifier.getAddress(),
        'Wrong signatureVerifier',
      );

      expect(await ethosAttestation.contractAddressManager()).to.equal(
        await contractAddressManager.getAddress(),
        'Wrong contractAddressManager',
      );
    });
  });

  describe('createAttestation', () => {
    it('should fail if paused', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        interactionControl,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const creator0profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address),
      );

      await interactionControl.connect(OWNER).pauseAll();

      const randValue = '123';

      const signature = await common.signatureForCreateAttestation(
        creator0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await expect(
        ethosAttestation
          .connect(PROFILE_CREATOR_0)
          .createAttestation(
            creator0profileId,
            randValue,
            { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
            ATTESTATION_EVIDENCE_0,
            signature,
          ),
      ).to.be.revertedWithCustomError(ethosProfile, 'EnforcedPause');
    });

    it('should fail if SignatureWasUsed', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        PROFILE_CREATOR_1,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
        OTHER_0,
        OTHER_1,
      } = await loadFixture(deployFixture);
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      await ethosProfile.connect(OWNER).inviteAddress(OTHER_1.address);
      await ethosProfile.connect(OTHER_1).createProfile(1);

      const randValue = '123';

      const signature = await common.signatureForCreateAttestation(
        String(await ethosProfile.profileIdByAddress(OTHER_0.address)),
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          String(await ethosProfile.profileIdByAddress(OTHER_0.address)),
          randValue,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      // same profile id
      await expect(
        ethosAttestation
          .connect(OTHER_1)
          .createAttestation(
            String(await ethosProfile.profileIdByAddress(OTHER_0.address)),
            randValue,
            { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
            ATTESTATION_EVIDENCE_0,
            signature,
          ),
      ).to.be.revertedWithCustomError(ethosAttestation, 'SignatureWasUsed');

      // another profile id
      await expect(
        ethosAttestation
          .connect(OTHER_1)
          .createAttestation(
            String(await ethosProfile.profileIdByAddress(OTHER_1.address)),
            randValue,
            { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
            ATTESTATION_EVIDENCE_0,
            signature,
          ),
      ).to.be.revertedWithCustomError(ethosAttestation, 'SignatureWasUsed');
    });

    it('should fail if InvalidSignature', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const creator0profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address),
      );

      const randValue = '123';

      const signature = await common.signatureForCreateAttestation(
        creator0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      // wrong profileId
      await expect(
        ethosAttestation
          .connect(PROFILE_CREATOR_0)
          .createAttestation(
            '123',
            randValue,
            { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
            ATTESTATION_EVIDENCE_0,
            signature,
          ),
      ).to.be.revertedWithCustomError(ethosAttestation, 'InvalidSignature');

      // wrong randValue
      await expect(
        ethosAttestation
          .connect(PROFILE_CREATOR_0)
          .createAttestation(
            creator0profileId,
            '1234',
            { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
            ATTESTATION_EVIDENCE_0,
            signature,
          ),
      ).to.be.revertedWithCustomError(ethosAttestation, 'InvalidSignature');

      // wrong accountName
      await expect(
        ethosAttestation
          .connect(PROFILE_CREATOR_0)
          .createAttestation(
            creator0profileId,
            randValue,
            { account: 'ACCOUNT_NAME_BEN_NOT', service: SERVICE_X },
            ATTESTATION_EVIDENCE_0,
            signature,
          ),
      ).to.be.revertedWithCustomError(ethosAttestation, 'InvalidSignature');

      // wrong service
      await expect(
        ethosAttestation
          .connect(PROFILE_CREATOR_0)
          .createAttestation(
            creator0profileId,
            randValue,
            { account: ACCOUNT_NAME_BEN, service: 'SERVICE_X_NOT' },
            ATTESTATION_EVIDENCE_0,
            signature,
          ),
      ).to.be.revertedWithCustomError(ethosAttestation, 'InvalidSignature');

      // wrong attestationEvidence
      await expect(
        ethosAttestation
          .connect(PROFILE_CREATOR_0)
          .createAttestation(
            creator0profileId,
            randValue,
            { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
            'ATTESTATION_EVIDENCE_0_NOT',
            signature,
          ),
      ).to.be.revertedWithCustomError(ethosAttestation, 'InvalidSignature');
    });

    it('should fail if attestation details are blank', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const creator0profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address),
      );
      const randValue = '123';

      const signature = await common.signatureForCreateAttestation(
        creator0profileId,
        randValue,
        '',
        '',
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await expect(
        ethosAttestation
          .connect(PROFILE_CREATOR_0)
          .createAttestation(
            creator0profileId,
            randValue,
            { account: '', service: '' },
            ATTESTATION_EVIDENCE_0,
            signature,
          ),
      ).to.be.revertedWithCustomError(ethosAttestation, 'AttestationInvalid');
    });

    it('should set signatureUsed == true', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const creator0profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address),
      );
      const randValue = '123';

      const signature = await common.signatureForCreateAttestation(
        creator0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      expect(await ethosAttestation.signatureUsed(signature)).to.equal(
        false,
        'Wrong signatureUsed before',
      );

      await ethosAttestation
        .connect(PROFILE_CREATOR_0)
        .createAttestation(
          creator0profileId,
          randValue,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      expect(await ethosAttestation.signatureUsed(signature)).to.equal(
        true,
        'Wrong signatureUsed after',
      );
    });

    it('should fail if AttestationAlreadyExists', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
        OTHER_0,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const creator0profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address),
      );

      // create normally
      let signature = await common.signatureForCreateAttestation(
        creator0profileId,
        '1234',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(PROFILE_CREATOR_0)
        .createAttestation(
          creator0profileId,
          '1234',
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      // create for failure
      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      signature = await common.signatureForCreateAttestation(
        creator0profileId,
        '5678',
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await expect(
        ethosAttestation
          .connect(OTHER_0)
          .createAttestation(
            creator0profileId,
            '5678',
            { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
            ATTESTATION_EVIDENCE_0,
            signature,
          ),
      )
        .to.be.revertedWithCustomError(ethosAttestation, 'AttestationAlreadyExists')
        .withArgs(attestationHash);
    });

    it('should push attestation hash into attestationHashesByProfileId, if profile exists & not archived', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const creator0profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address),
      );
      const randValue = '123';

      const signature = await common.signatureForCreateAttestation(
        creator0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      expect(
        await ethosAttestation.getAttestationHashesByProfileId(creator0profileId),
      ).to.deep.equal([], 'Wrong attestationHashesByProfileId before');

      await ethosAttestation
        .connect(PROFILE_CREATOR_0)
        .createAttestation(
          creator0profileId,
          randValue,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      expect(
        await ethosAttestation.getAttestationHashesByProfileId(creator0profileId),
      ).to.deep.equal([attestationHash], 'Wrong attestationHashesByProfileId after');
    });

    it('should create Attestation with correct params, if profile exists & not archived', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const creator0profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address),
      );
      const randValue = '123';

      const signature = await common.signatureForCreateAttestation(
        creator0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      await ethosAttestation
        .connect(PROFILE_CREATOR_0)
        .createAttestation(
          creator0profileId,
          randValue,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );
      const timeNow = await time.latest();

      const attestation = await ethosAttestation.attestationByHash(attestationHash);

      expect(attestation.archived).to.be.equal(false, 'Wrong archived');
      expect(attestation.createdAt).to.be.equal(timeNow, 'Wrong createdAt');
      expect(attestation.profileId).to.equal(creator0profileId, 'Wrong profileId');
      expect(attestation.account).to.equal(ACCOUNT_NAME_BEN, 'Wrong accountName');
      expect(attestation.service).to.equal(SERVICE_X, 'Wrong service');
    });

    it('should emit AttestationCreated event with correct params', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const creator0profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address),
      );
      const randValue = '123';

      const signature = await common.signatureForCreateAttestation(
        creator0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await expect(
        ethosAttestation
          .connect(PROFILE_CREATOR_0)
          .createAttestation(
            creator0profileId,
            randValue,
            { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
            ATTESTATION_EVIDENCE_0,
            signature,
          ),
      )
        .to.emit(ethosAttestation, 'AttestationCreated')
        .withArgs(creator0profileId, SERVICE_X, ACCOUNT_NAME_BEN, ATTESTATION_EVIDENCE_0, 1);
    });

    it('should continue to increment attestationids', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ACCOUNT_NAME_IVAN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const creator0profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address),
      );
      const randValue = '123';

      const signature = await common.signatureForCreateAttestation(
        creator0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await expect(
        ethosAttestation
          .connect(PROFILE_CREATOR_0)
          .createAttestation(
            creator0profileId,
            randValue,
            { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
            ATTESTATION_EVIDENCE_0,
            signature,
          ),
      )
        .to.emit(ethosAttestation, 'AttestationCreated')
        .withArgs(creator0profileId, SERVICE_X, ACCOUNT_NAME_BEN, ATTESTATION_EVIDENCE_0, 1);

      const signature2 = await common.signatureForCreateAttestation(
        creator0profileId,
        randValue,
        ACCOUNT_NAME_IVAN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await expect(
        ethosAttestation
          .connect(PROFILE_CREATOR_0)
          .createAttestation(
            creator0profileId,
            randValue,
            { account: ACCOUNT_NAME_IVAN, service: SERVICE_X },
            ATTESTATION_EVIDENCE_0,
            signature2,
          ),
      )
        .to.emit(ethosAttestation, 'AttestationCreated')
        .withArgs(creator0profileId, SERVICE_X, ACCOUNT_NAME_IVAN, ATTESTATION_EVIDENCE_0, 2);
    });
  });

  describe('archiveAttestation', () => {
    it('should fail if paused', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        interactionControl,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      } = await loadFixture(deployFixture);

      const randValue = '123';

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const creator0profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address),
      );

      const signature = await common.signatureForCreateAttestation(
        creator0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(PROFILE_CREATOR_0)
        .createAttestation(
          creator0profileId,
          randValue,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      await interactionControl.connect(OWNER).pauseAll();

      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      await expect(
        ethosAttestation.connect(PROFILE_CREATOR_0).archiveAttestation(attestationHash),
      ).to.be.revertedWithCustomError(ethosProfile, 'EnforcedPause');
    });

    it('should fail if AddressNotInProfile', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        PROFILE_CREATOR_1,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        SERVICE_FB,
        ACCOUNT_NAME_BEN,
        ACCOUNT_NAME_IVAN,
        ATTESTATION_EVIDENCE_0,
        ATTESTATION_EVIDENCE_1,
        EXPECTED_SIGNER,
      } = await loadFixture(deployFixture);

      // create profile 0
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const creator0profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address),
      );
      let randValue = '123';

      let signature = await common.signatureForCreateAttestation(
        creator0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(PROFILE_CREATOR_0)
        .createAttestation(
          creator0profileId,
          randValue,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      // create profile 1
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
      await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
      const creator1profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_1.address),
      );
      randValue = '1234';

      signature = await common.signatureForCreateAttestation(
        creator1profileId,
        randValue,
        ACCOUNT_NAME_IVAN,
        SERVICE_FB,
        ATTESTATION_EVIDENCE_1,
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(PROFILE_CREATOR_1)
        .createAttestation(
          creator1profileId,
          randValue,
          { account: ACCOUNT_NAME_IVAN, service: SERVICE_FB },
          ATTESTATION_EVIDENCE_1,
          signature,
        );

      let attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_FB,
        ACCOUNT_NAME_IVAN,
      );

      // test PROFILE_CREATOR_0
      await expect(ethosAttestation.connect(PROFILE_CREATOR_0).archiveAttestation(attestationHash))
        .to.be.revertedWithCustomError(ethosAttestation, 'AddressNotInProfile')
        .withArgs(PROFILE_CREATOR_0.address, creator1profileId);

      // test PROFILE_CREATOR_1
      attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      await expect(ethosAttestation.connect(PROFILE_CREATOR_1).archiveAttestation(attestationHash))
        .to.be.revertedWithCustomError(ethosAttestation, 'AddressNotInProfile')
        .withArgs(PROFILE_CREATOR_1.address, creator0profileId);
    });

    it('should fail if attestation doesn’t exist', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        SERVICE_FB,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
        OTHER_0,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const randValue = '123';

      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      const other0profileId = String(await ethosProfile.profileIdByAddress(OTHER_0.address));
      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );
      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          randValue,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      const attestationHashSubmit = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_FB,
        ACCOUNT_NAME_BEN,
      );

      await expect(
        ethosAttestation.connect(PROFILE_CREATOR_0).archiveAttestation(attestationHashSubmit),
      )
        .to.be.revertedWithCustomError(ethosAttestation, 'AttestationNotFound')
        .withArgs(attestationHashSubmit);
    });

    it('should set attestation archived = true', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
        OTHER_0,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const randValue = '123';

      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      const other0profileId = String(await ethosProfile.profileIdByAddress(OTHER_0.address));
      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );
      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          randValue,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      await ethosAttestation.connect(OTHER_0).archiveAttestation(attestationHash);

      const attestation = await ethosAttestation.attestationByHash(attestationHash);

      expect(attestation.archived).to.be.equal(true, 'Wrong archived');
    });

    it('should emit AttestationArchived event with correct params', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const creator0profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address),
      );
      const randValue = '123';

      const signature = await common.signatureForCreateAttestation(
        creator0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(PROFILE_CREATOR_0)
        .createAttestation(
          creator0profileId,
          randValue,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      await expect(ethosAttestation.connect(PROFILE_CREATOR_0).archiveAttestation(attestationHash))
        .to.emit(ethosAttestation, 'AttestationArchived')
        .withArgs(creator0profileId, SERVICE_X, ACCOUNT_NAME_BEN, 1);
    });
  });

  describe('restoreAttestation', () => {
    it('should fail if paused', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        interactionControl,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      } = await loadFixture(deployFixture);

      const randValue = '123';

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const creator0profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address),
      );

      const signature = await common.signatureForCreateAttestation(
        creator0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(PROFILE_CREATOR_0)
        .createAttestation(
          creator0profileId,
          randValue,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );
      await ethosAttestation.connect(PROFILE_CREATOR_0).archiveAttestation(attestationHash);

      await interactionControl.connect(OWNER).pauseAll();

      await expect(
        ethosAttestation.connect(PROFILE_CREATOR_0).restoreAttestation(attestationHash),
      ).to.be.revertedWithCustomError(ethosProfile, 'EnforcedPause');
    });

    it('should fail if no profile', async () => {
      const {
        ethosAttestation,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
        OTHER_0,
        ethosProfile,
        OWNER,
      } = await loadFixture(deployFixture);

      const randValue = '123';
      const noProfileId = '11111';

      const signature = await common.signatureForCreateAttestation(
        noProfileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      await expect(
        ethosAttestation
          .connect(OTHER_0)
          .createAttestation(
            noProfileId,
            randValue,
            { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
            ATTESTATION_EVIDENCE_0,
            signature,
          ),
      )
        .to.be.revertedWithCustomError(ethosAttestation, 'ProfileNotFound')
        .withArgs(noProfileId);
    });

    it('should fail if profile was archived', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
        OTHER_0,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const creator0profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address),
      );

      const randValue = '123';

      const signature = await common.signatureForCreateAttestation(
        creator0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(PROFILE_CREATOR_0)
        .createAttestation(
          creator0profileId,
          randValue,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      await ethosAttestation.connect(PROFILE_CREATOR_0).archiveAttestation(attestationHash);

      await ethosProfile.connect(PROFILE_CREATOR_0).archiveProfile();

      await expect(ethosAttestation.connect(OTHER_0).restoreAttestation(attestationHash))
        .to.be.revertedWithCustomError(ethosAttestation, 'ProfileNotFound')
        .withArgs(creator0profileId);
    });

    it('should fail if AddressNotInProfile', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        PROFILE_CREATOR_1,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        SERVICE_FB,
        ACCOUNT_NAME_BEN,
        ACCOUNT_NAME_IVAN,
        ATTESTATION_EVIDENCE_0,
        ATTESTATION_EVIDENCE_1,
        EXPECTED_SIGNER,
      } = await loadFixture(deployFixture);

      // create profile 0
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const creator0profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address),
      );

      const randValue0 = '123';

      let signature = await common.signatureForCreateAttestation(
        creator0profileId,
        randValue0,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(PROFILE_CREATOR_0)
        .createAttestation(
          creator0profileId,
          randValue0,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      const attestationHash0 = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      await ethosAttestation.connect(PROFILE_CREATOR_0).archiveAttestation(attestationHash0);

      // create profile 1
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
      await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
      const creator1profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_1.address),
      );

      const randValue1 = '1234';

      signature = await common.signatureForCreateAttestation(
        creator1profileId,
        randValue1,
        ACCOUNT_NAME_IVAN,
        SERVICE_FB,
        ATTESTATION_EVIDENCE_1,
        EXPECTED_SIGNER,
      );

      await ethosAttestation
        .connect(PROFILE_CREATOR_1)
        .createAttestation(
          creator1profileId,
          randValue1,
          { account: ACCOUNT_NAME_IVAN, service: SERVICE_FB },
          ATTESTATION_EVIDENCE_1,
          signature,
        );

      const attestationHash1 = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_FB,
        ACCOUNT_NAME_IVAN,
      );

      await ethosAttestation.connect(PROFILE_CREATOR_1).archiveAttestation(attestationHash1);

      // test PROFILE_CREATOR_0
      await expect(ethosAttestation.connect(PROFILE_CREATOR_1).restoreAttestation(attestationHash0))
        .to.be.revertedWithCustomError(ethosAttestation, 'AddressNotInProfile')
        .withArgs(PROFILE_CREATOR_1.address, creator0profileId);

      // test PROFILE_CREATOR_1
      await expect(ethosAttestation.connect(PROFILE_CREATOR_0).restoreAttestation(attestationHash1))
        .to.be.revertedWithCustomError(ethosAttestation, 'AddressNotInProfile')
        .withArgs(PROFILE_CREATOR_0.address, creator1profileId);
    });

    it('should fail if AttestationNotArchived', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
        OTHER_0,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const creator0profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_0.address),
      );
      const randValue = '123';

      const signature = await common.signatureForCreateAttestation(
        creator0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );

      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      await ethosAttestation
        .connect(PROFILE_CREATOR_0)
        .createAttestation(
          creator0profileId,
          randValue,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      await expect(ethosAttestation.connect(PROFILE_CREATOR_0).restoreAttestation(attestationHash))
        .to.be.revertedWithCustomError(ethosAttestation, 'AttestationNotArchived')
        .withArgs(attestationHash);
    });

    it('should set attestation archived = false', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
        OTHER_0,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const randValue = '123';

      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      const other0profileId = String(await ethosProfile.profileIdByAddress(OTHER_0.address));
      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );
      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          randValue,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      await ethosAttestation.connect(OTHER_0).archiveAttestation(attestationHash);

      await ethosAttestation.connect(OTHER_0).restoreAttestation(attestationHash);

      const attestation = await ethosAttestation.attestationByHash(attestationHash);

      expect(attestation.archived).to.be.equal(false, 'Wrong archived');
    });
  });

  describe('attestationExistsForHash', () => {
    it('should return false if attestation does not exist', async () => {
      const { ethosAttestation, SERVICE_X, ACCOUNT_NAME_BEN } = await loadFixture(deployFixture);

      let attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      expect(await ethosAttestation.attestationExistsForHash(attestationHash)).to.equal(
        false,
        'should be false for attestationHash',
      );

      attestationHash = ethers.encodeBytes32String('');

      expect(await ethosAttestation.attestationExistsForHash(attestationHash)).to.equal(
        false,
        'should be false for empty attestationHash',
      );
    });

    it('should return true if attestation exists', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        ACCOUNT_NAME_BEN,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
        OTHER_0,
      } = await loadFixture(deployFixture);

      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const randValue = '123';

      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      const other0profileId = String(await ethosProfile.profileIdByAddress(OTHER_0.address));
      const signature = await common.signatureForCreateAttestation(
        other0profileId,
        randValue,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );
      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          randValue,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      const attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      expect(await ethosAttestation.attestationExistsForHash(attestationHash)).to.equal(
        true,
        'should be true',
      );
    });
  });

  describe('getServiceAndAccountHash', () => {
    it('should return correct hash', async () => {
      const { ethosAttestation, SERVICE_X, SERVICE_FB, ACCOUNT_NAME_BEN, ACCOUNT_NAME_IVAN } =
        await loadFixture(deployFixture);

      // 0
      let attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      let expectedHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['string', 'string'],
          [SERVICE_X, ACCOUNT_NAME_BEN],
        ),
      );

      expect(attestationHash).equal(expectedHash, 'Wrong attestationHash for 0');

      // 1
      attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_FB,
        ACCOUNT_NAME_IVAN,
      );

      expectedHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['string', 'string'],
          [SERVICE_FB, ACCOUNT_NAME_IVAN],
        ),
      );

      expect(attestationHash).equal(expectedHash, 'Wrong attestationHash for 1');

      // 3
      await expect(ethosAttestation.getServiceAndAccountHash('', '')).to.be.revertedWithCustomError(
        ethosAttestation,
        'AttestationInvalid',
      );

      // 4
      attestationHash = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      expectedHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['string', 'string'],
          [ACCOUNT_NAME_BEN, SERVICE_X],
        ),
      );

      expect(attestationHash).not.equal(expectedHash, 'Wrong attestationHash for 4');
    });
  });

  describe('getAttestationHashesByProfileId', () => {
    it('should return empty array if no attestations for the profile id', async () => {
      const { ethosAttestation } = await loadFixture(deployFixture);

      expect(await ethosAttestation.getAttestationHashesByProfileId('0')).to.deep.equal(
        [],
        'Wrong attestationHash for 0',
      );

      expect(await ethosAttestation.getAttestationHashesByProfileId('1')).to.deep.equal(
        [],
        'Wrong attestationHash for 1',
      );

      expect(await ethosAttestation.getAttestationHashesByProfileId('2')).to.deep.equal(
        [],
        'Wrong attestationHash for 2',
      );
    });

    it('should return correct attestationHashes', async () => {
      const {
        OWNER,
        PROFILE_CREATOR_0,
        PROFILE_CREATOR_1,
        ethosProfile,
        ethosAttestation,
        SERVICE_X,
        SERVICE_FB,
        ACCOUNT_NAME_BEN,
        ACCOUNT_NAME_IVAN,
        ATTESTATION_EVIDENCE_0,
        ATTESTATION_EVIDENCE_1,
        EXPECTED_SIGNER,
        OTHER_0,
        OTHER_1,
      } = await loadFixture(deployFixture);

      // profile 0 created before
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_0.address);
      await ethosProfile.connect(PROFILE_CREATOR_0).createProfile(1);
      const randValue0 = '123';

      await ethosProfile.connect(OWNER).inviteAddress(OTHER_0.address);
      await ethosProfile.connect(OTHER_0).createProfile(1);
      const other0profileId = String(await ethosProfile.profileIdByAddress(OTHER_0.address));
      let signature = await common.signatureForCreateAttestation(
        other0profileId,
        randValue0,
        ACCOUNT_NAME_BEN,
        SERVICE_X,
        ATTESTATION_EVIDENCE_0,
        EXPECTED_SIGNER,
      );
      await ethosAttestation
        .connect(OTHER_0)
        .createAttestation(
          other0profileId,
          randValue0,
          { account: ACCOUNT_NAME_BEN, service: SERVICE_X },
          ATTESTATION_EVIDENCE_0,
          signature,
        );

      const attestationHash0 = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_X,
        ACCOUNT_NAME_BEN,
      );

      expect(await ethosAttestation.getAttestationHashesByProfileId(other0profileId)).to.deep.equal(
        [attestationHash0],
        'Wrong attestationHash for 1',
      );

      // profile 1 claimed
      await ethosProfile.connect(OWNER).inviteAddress(PROFILE_CREATOR_1.address);
      await ethosProfile.connect(PROFILE_CREATOR_1).createProfile(1);
      const creator1profileId = String(
        await ethosProfile.profileIdByAddress(PROFILE_CREATOR_1.address),
      );
      const randValue1 = '1234';

      await ethosProfile.connect(OWNER).inviteAddress(OTHER_1.address);
      await ethosProfile.connect(OTHER_1).createProfile(1);
      const other1profileId = String(await ethosProfile.profileIdByAddress(OTHER_1.address));
      signature = await common.signatureForCreateAttestation(
        other1profileId,
        randValue1,
        ACCOUNT_NAME_IVAN,
        SERVICE_FB,
        ATTESTATION_EVIDENCE_1,
        EXPECTED_SIGNER,
      );
      await ethosAttestation
        .connect(OTHER_1)
        .createAttestation(
          other1profileId,
          randValue1,
          { account: ACCOUNT_NAME_IVAN, service: SERVICE_FB },
          ATTESTATION_EVIDENCE_1,
          signature,
        );

      const attestationHash1 = await ethosAttestation.getServiceAndAccountHash(
        SERVICE_FB,
        ACCOUNT_NAME_IVAN,
      );

      expect(await ethosAttestation.getAttestationHashesByProfileId(other1profileId)).to.deep.equal(
        [attestationHash1],
        'Wrong attestationHash for 1',
      );

      expect(
        await ethosAttestation.getAttestationHashesByProfileId(ethers.MaxUint256),
      ).to.deep.equal([], 'Wrong attestationHashUnclaimed');

      // empty
      expect(
        await ethosAttestation.getAttestationHashesByProfileId(creator1profileId),
      ).to.deep.equal([], 'Wrong attestationHash');

      expect(await ethosAttestation.getAttestationHashesByProfileId('1234')).to.deep.equal(
        [],
        'Wrong attestationHash',
      );
    });
  });
});
