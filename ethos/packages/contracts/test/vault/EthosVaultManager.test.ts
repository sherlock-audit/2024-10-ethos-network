import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers, network } from 'hardhat';
import { zeroAddress } from 'viem';
import { smartContractNames } from '../utils/mock.names';

describe('EthosVaultManager', () => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async function deployFixture() {
    const [
      OWNER,
      ADMIN,
      EXPECTED_SIGNER,
      USER_1,
      USER_2,
      USER_3,
      USER_4,
      FEE_PROTOCOL_ACC,
      OTHER_USER_1,
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

    const weth9 = await ethers.deployContract('WETH9', []);

    const feeProtocolAddress = await FEE_PROTOCOL_ACC.getAddress();
    const entryfeeProtocolBasisPoint = 100n; // 1%
    const entryfeeDonationBasisPoint = 100n; // 1%
    const entryfeeVouchersPoolBasisPoint = 300n; // 3%
    const exitFeeBasisPoint = 100n; // 1%

    const vaultManager = await ethers.getContractFactory('EthosVaultManager');
    const vaultManagerImplementation = await ethers.deployContract('EthosVaultManager', []);
    const ethosVaultManagerImpAddress = await vaultManagerImplementation.getAddress();

    const ethosVaultManagerProxy = await ERC1967Proxy.deploy(
      ethosVaultManagerImpAddress,
      vaultManager.interface.encodeFunctionData('initialize', [
        OWNER.address,
        ADMIN.address,
        EXPECTED_SIGNER.address,
        signatureVerifierAddress,
        contractAddressManagerAddress,
        feeProtocolAddress,
        entryfeeProtocolBasisPoint,
        entryfeeDonationBasisPoint,
        entryfeeVouchersPoolBasisPoint,
        exitFeeBasisPoint,
      ]),
    );
    await ethosVaultManagerProxy.waitForDeployment();
    const ethosVaultManagerAddress = await ethosVaultManagerProxy.getAddress();
    const ethosVaultManager = await ethers.getContractAt(
      'EthosVaultManager',
      ethosVaultManagerAddress,
    );

    expect(await ethosVaultManager.getFeeProtocolAddress()).to.equal(feeProtocolAddress);
    expect(await ethosVaultManager.getEntryProtocolFeeBasisPoints()).to.equal(100);

    const ethosEscrow = await ethers.deployContract('EthosEscrow', [contractAddressManagerAddress]);
    const ethosEscrowAddress = await ethosEscrow.getAddress();

    const slash = await ethers.getContractFactory('EthosSlashPenalty');
    const slashImplementation = await ethers.deployContract('EthosSlashPenalty', []);
    const slashImpAddress = await slashImplementation.getAddress();
    const ethosSlashPenaltyProxy = await ERC1967Proxy.deploy(
      slashImpAddress,
      slash.interface.encodeFunctionData('initialize', [
        OWNER.address,
        ADMIN.address,
        EXPECTED_SIGNER.address,
        signatureVerifierAddress,
        contractAddressManagerAddress,
      ]),
    );
    await ethosSlashPenaltyProxy.waitForDeployment();
    const ethosSlashPenaltyAddress = await ethosSlashPenaltyProxy.getAddress();
    const ethosSlashPenalty = await ethers.getContractAt(
      'EthosSlashPenalty',
      ethosSlashPenaltyAddress,
    );

    const vouch = await ethers.getContractFactory('EthosVouch');
    const vouchImplementation = await ethers.deployContract('EthosVouch', []);
    const vouchImpAddress = await vouchImplementation.getAddress();

    const ethosVouchProxy = await ERC1967Proxy.deploy(
      vouchImpAddress,
      vouch.interface.encodeFunctionData('initialize', [
        OWNER.address,
        ADMIN.address,
        EXPECTED_SIGNER.address,
        signatureVerifierAddress,
        contractAddressManagerAddress,
        await weth9.getAddress(),
      ]),
    );
    await ethosVouchProxy.waitForDeployment();
    const ethosVouchAddress = await ethosVouchProxy.getAddress();
    const ethosVouch = await ethers.getContractAt('EthosVouch', ethosVouchAddress);

    const ethosVaultFactory = await ethers.deployContract('EthosVaultFactory', []);
    const ethosVaultFactoryAddress = await ethosVaultFactory.getAddress();

    // update Smart Contracts
    await contractAddressManager.updateContractAddressesForNames(
      [
        ethosProfileAddress,
        interactionControlAddress,
        ethosVaultManagerAddress,
        ethosEscrowAddress,
        ethosSlashPenaltyAddress,
        ethosVouchAddress,
        ethosVaultFactoryAddress,
      ],
      [
        smartContractNames.profile,
        smartContractNames.interactionControl,
        smartContractNames.vaultManager,
        smartContractNames.escrow,
        smartContractNames.slashPenalty,
        smartContractNames.vouch,
        smartContractNames.vaultFactory,
      ],
    );

    await interactionControl.addControlledContractNames([smartContractNames.profile]);

    const provider = ethers.provider;

    await ethosProfile.connect(OWNER).inviteAddress(USER_1.address);
    await ethosProfile.connect(USER_1).createProfile(1);

    await ethosProfile.connect(OWNER).inviteAddress(USER_2.address);
    await ethosProfile.connect(USER_2).createProfile(1);

    await ethosProfile.connect(OWNER).inviteAddress(USER_3.address);
    await ethosProfile.connect(USER_3).createProfile(1);

    await ethosProfile.connect(OWNER).inviteAddress(USER_4.address);
    await ethosProfile.connect(USER_4).createProfile(1);

    const user1Address = await USER_1.getAddress();
    const user2Address = await USER_2.getAddress();
    const user3Address = await USER_3.getAddress();
    const user4Address = await USER_4.getAddress();

    const user1ProfileId = await ethosProfile.verifiedProfileIdForAddress(user1Address);
    const user2ProfileId = await ethosProfile.verifiedProfileIdForAddress(user2Address);
    const user3ProfileId = await ethosProfile.verifiedProfileIdForAddress(user3Address);
    const user4ProfileId = await ethosProfile.verifiedProfileIdForAddress(user4Address);

    // voults creation
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [ethosVouchAddress],
    });
    const newBalance = ethers.parseEther('500');
    await network.provider.send('hardhat_setBalance', [
      ethosVouchAddress,
      '0x' + newBalance.toString(16),
    ]);

    const ethosVouchSigner = await ethers.getSigner(ethosVouchAddress);
    const allowedAddressToCreateNewVaults = ethosVouchSigner; // TODO for now createVault is not protected, in case it will change just change value here

    await ethosVaultManager
      .connect(allowedAddressToCreateNewVaults)
      .createVault(user1ProfileId, await weth9.getAddress());
    const user1VaultAddress = await ethosVaultManager.getVaultByProfileId(user1ProfileId);

    await ethosVaultManager
      .connect(allowedAddressToCreateNewVaults)
      .createVault(user2ProfileId, await weth9.getAddress());
    const user2VaultAddress = await ethosVaultManager.getVaultByProfileId(user2ProfileId);

    await ethosVaultManager
      .connect(allowedAddressToCreateNewVaults)
      .createVault(user3ProfileId, await weth9.getAddress());
    const user3VaultAddress = await ethosVaultManager.getVaultByProfileId(user3ProfileId);

    await ethosVaultManager
      .connect(allowedAddressToCreateNewVaults)
      .createVault(user4ProfileId, await weth9.getAddress());
    const user4VaultAddress = await ethosVaultManager.getVaultByProfileId(user4ProfileId);

    const user1Vault = await ethers.getContractAt('EthosVaultETHUnderlying', user1VaultAddress);
    const user2Vault = await ethers.getContractAt('EthosVaultETHUnderlying', user2VaultAddress);
    const user3Vault = await ethers.getContractAt('EthosVaultETHUnderlying', user3VaultAddress);
    const user4Vault = await ethers.getContractAt('EthosVaultETHUnderlying', user4VaultAddress);

    return {
      OWNER,
      ADMIN,
      EXPECTED_SIGNER,
      USER_1,
      USER_2,
      USER_3,
      USER_4,
      FEE_PROTOCOL_ACC,
      OTHER_USER_1,
      ZERO_ADDRESS,
      signatureVerifier,
      interactionControl,
      ethosProfile,
      contractAddressManager,
      ERC1967Proxy,
      weth9,
      allowedAddressToCreateNewVaults,
      ethosVaultManager,
      ethosVouch,
      ethosSlashPenalty,
      user1ProfileId,
      user1Vault,
      user2Vault,
      user3Vault,
      user4Vault,
      entryfeeProtocolBasisPoint,
      entryfeeDonationBasisPoint,
      provider,
    };
  }
  describe('Initialization', function () {
    it('should set initial values correctly', async () => {
      const { ethosVaultManager, OWNER, FEE_PROTOCOL_ACC } = await loadFixture(deployFixture);
      const OWNER_ROLE = await ethosVaultManager.OWNER_ROLE();
      expect(await ethosVaultManager.hasRole(OWNER_ROLE, await OWNER.getAddress())).to.equal(true);
      expect(await ethosVaultManager.getFeeProtocolAddress()).to.equal(FEE_PROTOCOL_ACC.address);
      expect(await ethosVaultManager.getEntryProtocolFeeBasisPoints()).to.equal(100);
      expect(await ethosVaultManager.getEntryDonationFeeBasisPoints()).to.equal(100);
      expect(await ethosVaultManager.getEntryVouchersPoolFeeBasisPoints()).to.equal(300);
    });
    it('should only allow the contract to be initialized once', async function () {
      const {
        ethosVaultManager,
        OWNER,
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        contractAddressManager,
        FEE_PROTOCOL_ACC,
      } = await loadFixture(deployFixture);
      await expect(
        ethosVaultManager.initialize(
          OWNER.address,
          ADMIN.address,
          EXPECTED_SIGNER.address,
          await signatureVerifier.getAddress(),
          await contractAddressManager.getAddress(),
          FEE_PROTOCOL_ACC.address,
          1n,
          1n,
          1n,
          1n,
        ),
      ).to.be.revertedWithCustomError(ethosVaultManager, 'InvalidInitialization');
    });
    it('should revert when owner zero address', async () => {
      const {
        ERC1967Proxy,
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        contractAddressManager,
        FEE_PROTOCOL_ACC,
      } = await loadFixture(deployFixture);
      const vaultManager = await ethers.getContractFactory('EthosVaultManager');
      const vaultManagerImplementation = await ethers.deployContract('EthosVaultManager', []);
      const ethosVaultManagerImpAddress = await vaultManagerImplementation.getAddress();

      void expect(
        ERC1967Proxy.deploy(
          ethosVaultManagerImpAddress,
          vaultManager.interface.encodeFunctionData('initialize', [
            zeroAddress,
            ADMIN.address,
            EXPECTED_SIGNER.address,
            await signatureVerifier.getAddress(),
            await contractAddressManager.getAddress(),
            FEE_PROTOCOL_ACC.address,
            1n,
            1n,
            1n,
            1n,
          ]),
        ),
      ).to.be.revertedWithCustomError(vaultManagerImplementation, 'InvalidAddress');
    });

    it('should revert when admin zero address', async () => {
      const {
        ERC1967Proxy,
        OWNER,
        EXPECTED_SIGNER,
        signatureVerifier,
        contractAddressManager,
        FEE_PROTOCOL_ACC,
      } = await loadFixture(deployFixture);
      const vaultManager = await ethers.getContractFactory('EthosVaultManager');
      const vaultManagerImplementation = await ethers.deployContract('EthosVaultManager', []);
      const ethosVaultManagerImpAddress = await vaultManagerImplementation.getAddress();

      void expect(
        ERC1967Proxy.deploy(
          ethosVaultManagerImpAddress,
          vaultManager.interface.encodeFunctionData('initialize', [
            OWNER.address,
            zeroAddress,
            EXPECTED_SIGNER.address,
            await signatureVerifier.getAddress(),
            await contractAddressManager.getAddress(),
            FEE_PROTOCOL_ACC.address,
            1n,
            1n,
            1n,
            1n,
          ]),
        ),
      ).to.be.revertedWithCustomError(vaultManagerImplementation, 'InvalidAddress');
    });

    it('should revert when expected signer zero address', async () => {
      const {
        ERC1967Proxy,
        OWNER,
        ADMIN,
        signatureVerifier,
        contractAddressManager,
        FEE_PROTOCOL_ACC,
      } = await loadFixture(deployFixture);
      const vaultManager = await ethers.getContractFactory('EthosVaultManager');
      const vaultManagerImplementation = await ethers.deployContract('EthosVaultManager', []);
      const ethosVaultManagerImpAddress = await vaultManagerImplementation.getAddress();

      void expect(
        ERC1967Proxy.deploy(
          ethosVaultManagerImpAddress,
          vaultManager.interface.encodeFunctionData('initialize', [
            OWNER.address,
            ADMIN.address,
            zeroAddress,
            await signatureVerifier.getAddress(),
            await contractAddressManager.getAddress(),
            FEE_PROTOCOL_ACC.address,
            1n,
            1n,
            1n,
            1n,
          ]),
        ),
      ).to.be.revertedWithCustomError(vaultManagerImplementation, 'InvalidAddress');
    });

    it('should revert when signature verifier zero address', async () => {
      const {
        ERC1967Proxy,
        OWNER,
        ADMIN,
        EXPECTED_SIGNER,
        contractAddressManager,
        FEE_PROTOCOL_ACC,
      } = await loadFixture(deployFixture);
      const vaultManager = await ethers.getContractFactory('EthosVaultManager');
      const vaultManagerImplementation = await ethers.deployContract('EthosVaultManager', []);
      const ethosVaultManagerImpAddress = await vaultManagerImplementation.getAddress();

      void expect(
        ERC1967Proxy.deploy(
          ethosVaultManagerImpAddress,
          vaultManager.interface.encodeFunctionData('initialize', [
            OWNER.address,
            ADMIN.address,
            EXPECTED_SIGNER.address,
            zeroAddress,
            await contractAddressManager.getAddress(),
            FEE_PROTOCOL_ACC.address,
            1n,
            1n,
            1n,
            1n,
          ]),
        ),
      ).to.be.revertedWithCustomError(vaultManagerImplementation, 'InvalidAddress');
    });

    it('should revert when contract manager zero address', async () => {
      const { ERC1967Proxy, OWNER, ADMIN, EXPECTED_SIGNER, signatureVerifier, FEE_PROTOCOL_ACC } =
        await loadFixture(deployFixture);
      const vaultManager = await ethers.getContractFactory('EthosVaultManager');
      const vaultManagerImplementation = await ethers.deployContract('EthosVaultManager', []);
      const ethosVaultManagerImpAddress = await vaultManagerImplementation.getAddress();

      void expect(
        ERC1967Proxy.deploy(
          ethosVaultManagerImpAddress,
          vaultManager.interface.encodeFunctionData('initialize', [
            OWNER.address,
            ADMIN.address,
            EXPECTED_SIGNER.address,
            await signatureVerifier.getAddress(),
            zeroAddress,
            FEE_PROTOCOL_ACC.address,
            1n,
            1n,
            1n,
            1n,
          ]),
        ),
      ).to.be.revertedWithCustomError(vaultManagerImplementation, 'InvalidAddress');
    });

    it('should revert when protocol fee address is  zero address', async () => {
      const {
        ERC1967Proxy,
        OWNER,
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        contractAddressManager,
      } = await loadFixture(deployFixture);
      const vaultManager = await ethers.getContractFactory('EthosVaultManager');
      const vaultManagerImplementation = await ethers.deployContract('EthosVaultManager', []);
      const ethosVaultManagerImpAddress = await vaultManagerImplementation.getAddress();

      void expect(
        ERC1967Proxy.deploy(
          ethosVaultManagerImpAddress,
          vaultManager.interface.encodeFunctionData('initialize', [
            OWNER.address,
            ADMIN.address,
            EXPECTED_SIGNER.address,
            await signatureVerifier.getAddress(),
            await contractAddressManager.getAddress(),
            zeroAddress,
            1n,
            1n,
            1n,
            1n,
          ]),
        ),
      ).to.be.revertedWithCustomError(vaultManagerImplementation, 'InvalidAddress');
    });
  });
  describe('Vault Creation', function () {
    it('should revert vault creation because only vouch contract should be able to do it', async function () {
      const { ethosVaultManager } = await loadFixture(deployFixture);
      await expect(ethosVaultManager.createVault(1, zeroAddress)).to.be.revertedWithCustomError(
        ethosVaultManager,
        'OnlyVouchContract',
      );
    });

    it('should revert when vault already exists', async function () {
      const { ethosVaultManager, ethosVouch } = await loadFixture(deployFixture);
      const ethosVouchAddress = await ethosVouch.getAddress();
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [ethosVouchAddress],
      });
      const newBalance = ethers.parseEther('500');
      await network.provider.send('hardhat_setBalance', [
        ethosVouchAddress,
        '0x' + newBalance.toString(16),
      ]);
      const ethosVouchManagerSigner = await ethers.getSigner(ethosVouchAddress);
      await expect(
        ethosVaultManager.connect(ethosVouchManagerSigner).createVault(2, zeroAddress),
      ).to.be.revertedWithCustomError(ethosVaultManager, 'VaultAlreadyExists');
    });

    it('should create a vault and emit an event', async function () {
      const { ethosVaultManager, ethosVouch } = await loadFixture(deployFixture);
      const ethosVouchAddress = await ethosVouch.getAddress();
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [ethosVouchAddress],
      });
      const newBalance = ethers.parseEther('500');
      await network.provider.send('hardhat_setBalance', [
        ethosVouchAddress,
        '0x' + newBalance.toString(16),
      ]);
      const ethosVouchManagerSigner = await ethers.getSigner(ethosVouchAddress);
      await expect(ethosVaultManager.connect(ethosVouchManagerSigner).createVault(123, zeroAddress))
        .to.emit(ethosVaultManager, 'VaultDeployed')
        .withArgs(anyValue, 123, true);
    });
  });
});
