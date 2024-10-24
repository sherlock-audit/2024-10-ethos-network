import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { type ContractTransactionResponse } from 'ethers';
import { type EthosProfile } from '../../typechain-types';
import { common } from '../utils/common';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { type EthosUser } from '../utils/ethosUser';

const DEFAULT_MAX_ADDRESSES = 4;

describe('EthosProfile Address Registration', () => {
  let deployer: EthosDeployer;
  let ethosProfile: EthosProfile;
  let userA: EthosUser;
  let userB: EthosUser;
  let EXPECTED_SIGNER: HardhatEthersSigner;
  let newAddress: HardhatEthersSigner;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);
    ethosProfile = deployer.ethosProfile.contract;
    EXPECTED_SIGNER = deployer.EXPECTED_SIGNER;
    userA = await deployer.createUser();
    userB = await deployer.createUser();
    newAddress = await deployer.newWallet();
    await setMaxAddresses(DEFAULT_MAX_ADDRESSES);
  });

  async function registerAddress(
    user: EthosUser,
    address: string,
  ): Promise<ContractTransactionResponse> {
    const randValue = Math.floor(Math.random() * 1000000);
    const signature = await common.signatureForRegisterAddress(
      address,
      user.profileId.toString(),
      randValue.toString(),
      EXPECTED_SIGNER,
    );

    return await ethosProfile
      .connect(user.signer)
      .registerAddress(address, user.profileId, randValue, signature);
  }

  async function setMaxAddresses(maxAddresses: number): Promise<ContractTransactionResponse> {
    return await ethosProfile.connect(deployer.ADMIN).setMaxAddresses(maxAddresses);
  }

  async function bulkRegisterAddresses(user: EthosUser, count: number | bigint): Promise<void> {
    const registrationPromises = Array.from({ length: Number(count) }, async () => {
      const newWallet = await deployer.newWallet();
      await registerAddress(user, newWallet.address);
    });

    await Promise.all(registrationPromises);
  }

  it('should allow a user to register a new address', async () => {
    await expect(registerAddress(userA, newAddress.address))
      .to.emit(ethosProfile, 'AddressClaim')
      .withArgs(userA.profileId, newAddress.address, 1); // 1 is AddressClaimStatus.Claimed

    expect(await ethosProfile.profileIdByAddress(newAddress.address)).to.equal(userA.profileId);
  });

  it('should not allow registering an address that belongs to another profile', async () => {
    await registerAddress(userA, newAddress.address);

    await expect(registerAddress(userB, newAddress.address))
      .to.be.revertedWithCustomError(ethosProfile, 'ProfileExistsForAddress')
      .withArgs(newAddress.address);
  });

  it('should allow re-registering a previously deleted address', async () => {
    await registerAddress(userA, newAddress.address);
    const addresses = await ethosProfile.addressesForProfile(userA.profileId);
    const indexToDelete = addresses.findIndex((addr) => addr === newAddress.address);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(indexToDelete);

    await expect(registerAddress(userA, newAddress.address))
      .to.emit(ethosProfile, 'AddressClaim')
      .withArgs(userA.profileId, newAddress.address, 1);
  });

  it('should not allow registering an address for a non-existent profile', async () => {
    const nonExistentProfileId = 9999;
    const randValue = Math.floor(Math.random() * 1000000);
    const signature = await common.signatureForRegisterAddress(
      newAddress.address,
      nonExistentProfileId.toString(),
      randValue.toString(),
      EXPECTED_SIGNER,
    );

    await expect(
      ethosProfile
        .connect(userA.signer)
        .registerAddress(newAddress.address, nonExistentProfileId, randValue, signature),
    )
      .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFound')
      .withArgs(nonExistentProfileId);
  });

  it('should not allow registering an address for an archived profile', async () => {
    await ethosProfile.connect(userA.signer).archiveProfile();

    await expect(registerAddress(userA, newAddress.address))
      .to.be.revertedWithCustomError(ethosProfile, 'ProfileAccess')
      .withArgs(userA.profileId, 'Profile is archived');
  });

  it('should not allow registering a compromised address', async () => {
    await registerAddress(userA, newAddress.address);
    const addresses = await ethosProfile.addressesForProfile(userA.profileId);
    const indexToDelete = addresses.findIndex((addr) => addr === newAddress.address);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(indexToDelete);

    await expect(registerAddress(userB, newAddress.address))
      .to.be.revertedWithCustomError(ethosProfile, 'AddressCompromised')
      .withArgs(newAddress.address);
  });

  it('should not allow registering with an invalid signature', async () => {
    const randValue = Math.floor(Math.random() * 1000000);
    const invalidSignature = await common.signatureForRegisterAddress(
      newAddress.address,
      userA.profileId.toString(),
      (randValue + 1).toString(), // Use a different random value to create an invalid signature
      EXPECTED_SIGNER,
    );

    await expect(
      ethosProfile
        .connect(userA.signer)
        .registerAddress(newAddress.address, userA.profileId, randValue, invalidSignature),
    ).to.be.revertedWithCustomError(ethosProfile, 'InvalidSignature');
  });

  it('should not allow registering an address with a used signature', async () => {
    const randValue = Math.floor(Math.random() * 1000000);
    const signature = await common.signatureForRegisterAddress(
      newAddress.address,
      userA.profileId.toString(),
      randValue.toString(),
      EXPECTED_SIGNER,
    );

    // First registration should succeed
    await expect(
      ethosProfile
        .connect(userA.signer)
        .registerAddress(newAddress.address, userA.profileId, randValue, signature),
    )
      .to.emit(ethosProfile, 'AddressClaim')
      .withArgs(userA.profileId, newAddress.address, 1);

    // Delete the registered address
    const addresses = await ethosProfile.addressesForProfile(userA.profileId);
    const indexToDelete = addresses.findIndex((addr) => addr === newAddress.address);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(indexToDelete);

    // Attempt to register the same address again with the same signature
    await expect(
      ethosProfile
        .connect(userA.signer)
        .registerAddress(newAddress.address, userA.profileId, randValue, signature),
    ).to.be.revertedWithCustomError(ethosProfile, 'SignatureWasUsed');
  });

  it('should not allow registering more addresses than the maximum allowed', async () => {
    const maxAddresses = await ethosProfile.maxNumberOfAddresses();

    await expect(bulkRegisterAddresses(userA, maxAddresses - 1n)).to.not.be.reverted;
    const addresses = await ethosProfile.addressesForProfile(userA.profileId);
    expect(addresses.length).to.equal(maxAddresses);

    const excessAddress = await deployer.newWallet();
    await expect(registerAddress(userA, excessAddress.address))
      .to.be.revertedWithCustomError(ethosProfile, 'MaxAddressesReached')
      .withArgs(userA.profileId);
  });

  it('should count deleted addresses towards the maximum', async () => {
    const maxAddresses = await ethosProfile.maxNumberOfAddresses();

    await bulkRegisterAddresses(userA, maxAddresses - 1n);

    // Delete two addresses
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1);

    // Try to register one more
    const excessAddress = await deployer.newWallet();
    await expect(registerAddress(userA, excessAddress.address))
      .to.be.revertedWithCustomError(ethosProfile, 'MaxAddressesReached')
      .withArgs(userA.profileId);
  });

  it('should allow admin to set max addresses', async () => {
    const newMaxAddresses = 64;
    await setMaxAddresses(newMaxAddresses);
    expect(await ethosProfile.maxNumberOfAddresses()).to.equal(newMaxAddresses);
  });

  it('should not allow non-admin to set max addresses', async () => {
    await expect(
      ethosProfile.connect(userA.signer).setMaxAddresses(64),
    ).to.be.revertedWithCustomError(ethosProfile, 'AccessControlUnauthorizedAccount');
  });

  it('should not allow setting max addresses above 2048', async () => {
    await expect(setMaxAddresses(2049))
      .to.be.revertedWithCustomError(ethosProfile, 'MaxAddressesReached')
      .withArgs(0);
  });

  it('should allow registering addresses up to the new max', async () => {
    const newMaxAddresses = 3;
    await setMaxAddresses(newMaxAddresses);

    await expect(bulkRegisterAddresses(userA, newMaxAddresses - 1)).to.not.be.reverted;

    const addresses = await ethosProfile.addressesForProfile(userA.profileId);
    expect(addresses.length).to.equal(newMaxAddresses);
  });

  it('should not allow registering more addresses than the new max', async () => {
    const newMaxAddresses = 2;
    await setMaxAddresses(newMaxAddresses);

    await bulkRegisterAddresses(userA, newMaxAddresses - 1);

    const excessAddress = await deployer.newWallet();
    await expect(registerAddress(userA, excessAddress.address))
      .to.be.revertedWithCustomError(ethosProfile, 'MaxAddressesReached')
      .withArgs(userA.profileId);
  });
});
