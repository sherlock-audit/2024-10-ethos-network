import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers, network } from 'hardhat';
import { zeroAddress } from 'viem';
import { smartContractNames } from '../utils/mock.names';

describe('EthosSlashPenalty', () => {
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
    // const ethosVouch = await ethers.getContractAt('EthosVouch', ethosVouchAddress);

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
    it('should set initial owners and addresses correctly', async () => {
      const { ethosSlashPenalty, OWNER } = await loadFixture(deployFixture);
      const OWNER_ROLE = await ethosSlashPenalty.OWNER_ROLE();
      expect(await ethosSlashPenalty.hasRole(OWNER_ROLE, await OWNER.getAddress())).to.equal(true);
    });
    it('should only allow the contract to be initialized once', async function () {
      const {
        ethosSlashPenalty,
        OWNER,
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        contractAddressManager,
      } = await loadFixture(deployFixture);
      await expect(
        ethosSlashPenalty.initialize(
          OWNER.address,
          ADMIN.address,
          EXPECTED_SIGNER.address,
          signatureVerifier,
          contractAddressManager,
        ),
      ).to.be.revertedWithCustomError(ethosSlashPenalty, 'InvalidInitialization');
    });
    it('should revert when owner zero address', async () => {
      const { ERC1967Proxy, ADMIN, EXPECTED_SIGNER, signatureVerifier, contractAddressManager } =
        await loadFixture(deployFixture);
      const slash = await ethers.getContractFactory('EthosSlashPenalty');
      const slashImplementation = await ethers.deployContract('EthosSlashPenalty', []);
      const slashImpAddress = await slashImplementation.getAddress();
      void expect(
        ERC1967Proxy.deploy(
          slashImpAddress,
          slash.interface.encodeFunctionData('initialize', [
            zeroAddress,
            ADMIN.address,
            EXPECTED_SIGNER.address,
            await signatureVerifier.getAddress(),
            await contractAddressManager.getAddress(),
          ]),
        ),
      ).to.be.revertedWithCustomError(slashImplementation, 'InvalidAddress');
    });

    it('should revert when admin zero address', async () => {
      const { ERC1967Proxy, OWNER, EXPECTED_SIGNER, signatureVerifier, contractAddressManager } =
        await loadFixture(deployFixture);
      const slash = await ethers.getContractFactory('EthosSlashPenalty');
      const slashImplementation = await ethers.deployContract('EthosSlashPenalty', []);
      const slashImpAddress = await slashImplementation.getAddress();
      void expect(
        ERC1967Proxy.deploy(
          slashImpAddress,
          slash.interface.encodeFunctionData('initialize', [
            OWNER.address,
            zeroAddress,
            EXPECTED_SIGNER.address,
            await signatureVerifier.getAddress(),
            await contractAddressManager.getAddress(),
          ]),
        ),
      ).to.be.revertedWithCustomError(slashImplementation, 'InvalidAddress');
    });

    it('should revert when expected signer zero address', async () => {
      const { ERC1967Proxy, OWNER, ADMIN, signatureVerifier, contractAddressManager } =
        await loadFixture(deployFixture);
      const slash = await ethers.getContractFactory('EthosSlashPenalty');
      const slashImplementation = await ethers.deployContract('EthosSlashPenalty', []);
      const slashImpAddress = await slashImplementation.getAddress();
      void expect(
        ERC1967Proxy.deploy(
          slashImpAddress,
          slash.interface.encodeFunctionData('initialize', [
            OWNER.address,
            ADMIN.address,
            zeroAddress,
            await signatureVerifier.getAddress(),
            await contractAddressManager.getAddress(),
          ]),
        ),
      ).to.be.revertedWithCustomError(slashImplementation, 'InvalidAddress');
    });

    it('should revert when signature verifier zero address', async () => {
      const { ERC1967Proxy, OWNER, ADMIN, EXPECTED_SIGNER, contractAddressManager } =
        await loadFixture(deployFixture);
      const slash = await ethers.getContractFactory('EthosSlashPenalty');
      const slashImplementation = await ethers.deployContract('EthosSlashPenalty', []);
      const slashImpAddress = await slashImplementation.getAddress();
      void expect(
        ERC1967Proxy.deploy(
          slashImpAddress,
          slash.interface.encodeFunctionData('initialize', [
            OWNER.address,
            ADMIN.address,
            EXPECTED_SIGNER.address,
            zeroAddress,
            await contractAddressManager.getAddress(),
          ]),
        ),
      ).to.be.revertedWithCustomError(slashImplementation, 'InvalidAddress');
    });

    it('should revert when contract manager zero address', async () => {
      const { ERC1967Proxy, OWNER, ADMIN, EXPECTED_SIGNER, signatureVerifier } =
        await loadFixture(deployFixture);
      const slash = await ethers.getContractFactory('EthosSlashPenalty');
      const slashImplementation = await ethers.deployContract('EthosSlashPenalty', []);
      const slashImpAddress = await slashImplementation.getAddress();
      void expect(
        ERC1967Proxy.deploy(
          slashImpAddress,
          slash.interface.encodeFunctionData('initialize', [
            OWNER.address,
            ADMIN.address,
            EXPECTED_SIGNER.address,
            await signatureVerifier.getAddress(),
            zeroAddress,
          ]),
        ),
      ).to.be.revertedWithCustomError(slashImplementation, 'InvalidAddress');
    });
  });
  describe('update slash points', function () {
    it('should revert if not authorized address (only vaults can call)', async function () {
      const { ethosSlashPenalty, OTHER_USER_1: randomUser } = await loadFixture(deployFixture);
      void expect(
        ethosSlashPenalty.connect(randomUser).updateSlashPoints(1, 2, 1000),
      ).to.be.revertedWithCustomError(ethosSlashPenalty, 'NotAuthorized');
    });
    it('should update slash points correctly', async function () {
      const { ethosSlashPenalty, user3Vault: randomCreatedVault } =
        await loadFixture(deployFixture);
      const randomCreatedVaultAddress = await randomCreatedVault.getAddress();
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [randomCreatedVaultAddress],
      });
      const newBalance = ethers.parseEther('500');
      await network.provider.send('hardhat_setBalance', [
        randomCreatedVaultAddress,
        '0x' + newBalance.toString(16),
      ]);
      const randomCreatedVaultSigner = await ethers.getSigner(randomCreatedVaultAddress);
      await ethosSlashPenalty.connect(randomCreatedVaultSigner).updateSlashPoints(1, 2, 1000);
      const points = await ethosSlashPenalty.getSlashPoints(1, 2);
      expect(points).to.equal(1000);
      expect(await ethosSlashPenalty.getTotalSlashPoints()).to.be.greaterThan(0);
    });
  });

  describe('slash', function () {
    it('should revert when not owner', async function () {
      const { ethosSlashPenalty, OTHER_USER_1: randomUser } = await loadFixture(deployFixture);
      await expect(
        ethosSlashPenalty.connect(randomUser).slash(1, 10),
      ).to.be.revertedWithCustomError(ethosSlashPenalty, 'AccessControlUnauthorizedAccount');
    });
    it('should revert when slash points are not initialized', async function () {
      const { ethosSlashPenalty, OWNER } = await loadFixture(deployFixture);
      await expect(ethosSlashPenalty.connect(OWNER).slash(1, 10)).to.be.revertedWithCustomError(
        ethosSlashPenalty,
        'SlashFactorNotInitalized',
      );
    });
  });
  describe('input Validation', function () {
    it('should revert when slashing with zero percentage', async function () {
      const { ethosSlashPenalty, OWNER } = await loadFixture(deployFixture);
      await expect(ethosSlashPenalty.connect(OWNER).slash(1, 0)).to.be.revertedWithCustomError(
        ethosSlashPenalty,
        'InvalidSlashingPercentage',
      );
    });

    it('should update total slash points accurately over multiple transactions', async function () {
      const { ethosSlashPenalty, user2Vault: randomCreatedVault } =
        await loadFixture(deployFixture);
      const randomCreatedVaultAddress = await randomCreatedVault.getAddress();
      await network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [randomCreatedVaultAddress],
      });
      const newBalance = ethers.parseEther('500');
      await network.provider.send('hardhat_setBalance', [
        randomCreatedVaultAddress,
        '0x' + newBalance.toString(16),
      ]);
      const randomCreatedVaultSigner = await ethers.getSigner(randomCreatedVaultAddress);
      await ethosSlashPenalty.connect(randomCreatedVaultSigner).updateSlashPoints(1, 2, 500);
      await ethosSlashPenalty.connect(randomCreatedVaultSigner).updateSlashPoints(1, 3, 500);
      const totalPoints = await ethosSlashPenalty.getTotalSlashPoints();
      expect(totalPoints).to.equal(1000);
    });
  });

  describe('Edge Cases', function () {});

  describe('upgradable', function () {
    it('should fail if upgraded not by owner', async () => {
      const {
        ERC1967Proxy,
        OWNER,
        ADMIN,
        EXPECTED_SIGNER,
        signatureVerifier,
        contractAddressManager,
        OTHER_USER_1,
      } = await loadFixture(deployFixture);

      const slash = await ethers.getContractFactory('EthosSlashPenalty');
      const slashImplementation = await ethers.deployContract('EthosSlashPenalty', []);
      const slashImpAddress = await slashImplementation.getAddress();
      const ethosSlashPenaltyProxy = await ERC1967Proxy.deploy(
        slashImpAddress,
        slash.interface.encodeFunctionData('initialize', [
          OWNER.address,
          ADMIN.address,
          EXPECTED_SIGNER.address,
          await signatureVerifier.getAddress(),
          await contractAddressManager.getAddress(),
        ]),
      );
      await ethosSlashPenaltyProxy.waitForDeployment();
      const ethosSlashPenaltyAddress = await ethosSlashPenaltyProxy.getAddress();
      const ethosSlashPenalty = await ethers.getContractAt(
        'EthosSlashPenalty',
        ethosSlashPenaltyAddress,
      );

      await expect(
        ethosSlashPenalty.connect(OTHER_USER_1).upgradeToAndCall(ethosSlashPenaltyAddress, '0x'),
      ).to.be.revertedWithCustomError(ethosSlashPenalty, 'AccessControlUnauthorizedAccount');
    });
    it('should fail if upgraded contract is zero address', async () => {
      const { OWNER, ethosSlashPenalty } = await loadFixture(deployFixture);

      await expect(ethosSlashPenalty.connect(OWNER).upgradeToAndCall(ethers.ZeroAddress, '0x')).to
        .be.reverted;
    });

    it('should upgrade to new implementation address', async () => {
      const { OWNER, ethosSlashPenalty, provider } = await loadFixture(deployFixture);
      const proxyAddr = await ethosSlashPenalty.getAddress();

      const implementation = await ethers.deployContract('EthosSlashPenalty', []);
      const implementationAddress = await implementation.getAddress();
      await ethosSlashPenalty.connect(OWNER).upgradeToAndCall(implementationAddress, '0x');

      const implementationStorage = await provider.getStorage(
        proxyAddr,
        BigInt('0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'),
      );

      const addressHex = '0x' + implementationStorage.slice(-40);

      expect(ethers.getAddress(addressHex)).to.equal(implementationAddress);
    });
  });
});
