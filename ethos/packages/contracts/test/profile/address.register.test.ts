import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import { type ContractTransactionResponse } from 'ethers';
import { type EthosProfile } from '../../typechain-types/index.js';
import { common } from '../utils/common.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

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

  async function setMaxAddresses(maxAddresses: number): Promise<ContractTransactionResponse> {
    return await ethosProfile.connect(deployer.ADMIN).setMaxAddresses(maxAddresses);
  }

  async function bulkRegisterAddresses(user: EthosUser, count: number | bigint): Promise<void> {
    const registrationPromises = Array.from({ length: Number(count) }, async () => {
      const newWallet = await deployer.newWallet();
      await user.registerAddress(newWallet.address);
    });

    await Promise.all(registrationPromises);
  }

  it('should allow a user to register a new address', async () => {
    await expect(userA.registerAddress(newAddress.address))
      .to.emit(ethosProfile, 'AddressClaim')
      .withArgs(userA.profileId, newAddress.address, 1);

    expect(await ethosProfile.profileIdByAddress(newAddress.address)).to.equal(userA.profileId);
  });

  it('should not allow registering an address that belongs to another profile', async () => {
    await userA.registerAddress(newAddress.address);

    await expect(userB.registerAddress(newAddress.address))
      .to.be.revertedWithCustomError(ethosProfile, 'ProfileExistsForAddress')
      .withArgs(newAddress.address);
  });

  it('should allow re-registering a previously deleted address', async () => {
    await userA.registerAddress(newAddress.address);
    const addresses = await ethosProfile.addressesForProfile(userA.profileId);
    const indexToDelete = addresses.findIndex((addr) => addr === newAddress.address);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(indexToDelete, false);

    await expect(userA.registerAddress(newAddress.address))
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
      .to.be.revertedWithCustomError(ethosProfile, 'ProfileNotFoundForAddress')
      .withArgs(userA.signer.address);
  });

  it('should not allow registering an address for an archived profile', async () => {
    await ethosProfile.connect(userA.signer).archiveProfile();

    await expect(userA.registerAddress(newAddress.address))
      .to.be.revertedWithCustomError(ethosProfile, 'ProfileAccess')
      .withArgs(userA.profileId, 'Profile is archived');
  });

  it('should not allow registering a compromised address', async () => {
    await userA.registerAddress(newAddress.address);
    const addresses = await ethosProfile.addressesForProfile(userA.profileId);
    const indexToDelete = addresses.findIndex((addr) => addr === newAddress.address);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(indexToDelete, true);

    await expect(userB.registerAddress(newAddress.address))
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
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(indexToDelete, false);

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
    await expect(userA.registerAddress(excessAddress.address))
      .to.be.revertedWithCustomError(ethosProfile, 'MaxAddressesReached')
      .withArgs(userA.profileId);
  });

  it('should not count deleted addresses towards the maximum', async () => {
    const maxAddresses = await ethosProfile.maxNumberOfAddresses();

    await bulkRegisterAddresses(userA, maxAddresses - 1n);

    // Delete two addresses
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1, false);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1, false);

    // Try to register one more
    const excessAddress = await deployer.newWallet();
    await expect(userA.registerAddress(excessAddress.address)).to.not.be.reverted;
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
    await expect(userA.registerAddress(excessAddress.address))
      .to.be.revertedWithCustomError(ethosProfile, 'MaxAddressesReached')
      .withArgs(userA.profileId);
  });

  it('should allow deleting an address using deleteAddress', async () => {
    // Register two addresses
    const secondAddress = await deployer.newWallet();
    await userA.registerAddress(newAddress.address);
    await userA.registerAddress(secondAddress.address);

    // Delete the first address
    await expect(ethosProfile.connect(userA.signer).deleteAddress(newAddress.address, false))
      .to.emit(ethosProfile, 'AddressClaim')
      .withArgs(userA.profileId, newAddress.address, 0); // 0 = Unclaimed

    // Verify address was removed
    const addresses = await ethosProfile.addressesForProfile(userA.profileId);
    expect(addresses).to.not.include(newAddress.address);
    expect(addresses).to.include(secondAddress.address);
    expect(await ethosProfile.profileIdByAddress(newAddress.address)).to.equal(0);
  });

  it('should allow deleting an address and marking it as compromised', async () => {
    await userA.registerAddress(newAddress.address);

    await expect(ethosProfile.connect(userA.signer).deleteAddress(newAddress.address, true))
      .to.emit(ethosProfile, 'AddressClaim')
      .withArgs(userA.profileId, newAddress.address, 0);

    const isCompromised = await ethosProfile.isAddressCompromised(newAddress.address);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(isCompromised).to.be.true;
  });

  it('should not allow deleting the sender address', async () => {
    await expect(ethosProfile.connect(userA.signer).deleteAddress(userA.signer.address, false))
      .to.be.revertedWithCustomError(ethosProfile, 'AddressAuthorization')
      .withArgs(userA.signer.address, 'Address == msg.sender');
  });

  it('should maintain correct indices after deleting addresses', async () => {
    // Register three addresses
    const secondAddress = await deployer.newWallet();
    const thirdAddress = await deployer.newWallet();
    await userA.registerAddress(newAddress.address);
    await userA.registerAddress(secondAddress.address);
    await userA.registerAddress(thirdAddress.address);

    // Delete the middle address
    await ethosProfile.connect(userA.signer).deleteAddress(secondAddress.address, false);

    // Verify remaining addresses are still accessible
    const addresses = await ethosProfile.addressesForProfile(userA.profileId);
    expect(addresses).to.have.lengthOf(3); // Including the original signer address
    expect(addresses).to.include(newAddress.address);
    expect(addresses).to.include(thirdAddress.address);
    expect(addresses).to.not.include(secondAddress.address);

    // Should be able to delete remaining addresses
    await expect(ethosProfile.connect(userA.signer).deleteAddress(newAddress.address, false)).to.not
      .be.reverted;
    await expect(ethosProfile.connect(userA.signer).deleteAddress(thirdAddress.address, false)).to
      .not.be.reverted;
  });

  it('should not allow deleting an address from an archived profile', async () => {
    await userA.registerAddress(newAddress.address);
    await ethosProfile.connect(userA.signer).archiveProfile();

    await expect(ethosProfile.connect(userA.signer).deleteAddress(newAddress.address, false))
      .to.be.revertedWithCustomError(ethosProfile, 'ProfileAccess')
      .withArgs(userA.profileId, 'Profile is archived');
  });
});
