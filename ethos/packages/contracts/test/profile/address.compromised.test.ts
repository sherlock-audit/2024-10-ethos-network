import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { expect } from 'chai';
import hre from 'hardhat';
import { type EthosProfile } from '../../typechain-types/index.js';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos.js';
import { type EthosUser } from '../utils/ethosUser.js';

const { ethers } = hre;
describe('EthosProfile Address Delete', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  let ethosProfile: EthosProfile;
  const blockedAddr = '0x6ba07df6c6534a719175d28881226721c47d49a3';
  const defaultProfileId = 2;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    userA = await deployer.createUser();
    userB = await deployer.createUser();

    if (!deployer.ethosVouch.contract) {
      throw new Error('EthosVouch contract not found');
    }
    ethosProfile = deployer.ethosProfile.contract;
  });

  it('should revert if delete attempt with out of bounds index', async () => {
    await userA.registerAddress(blockedAddr);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1, false);

    await expect(
      ethosProfile.connect(userA.signer).deleteAddressAtIndex(1, false),
    ).to.be.revertedWithCustomError(ethosProfile, 'InvalidIndex');
  });

  it('should revert if attempt to register compromised account', async () => {
    await userA.registerAddress(blockedAddr);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1, true);

    await expect(userB.registerAddress(blockedAddr))
      .to.be.revertedWithCustomError(ethosProfile, 'AddressCompromised')
      .withArgs(ethers.getAddress(blockedAddr));
  });

  it('should allow you to restore your previously deleted address', async () => {
    await userA.registerAddress(blockedAddr);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1, false);
    await expect(userA.registerAddress(blockedAddr)).to.not.be.reverted;
  });

  it('should revert if attempt to invite compromised account', async () => {
    await userA.registerAddress(blockedAddr);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1, true);

    await expect(ethosProfile.connect(userB.signer).inviteAddress(blockedAddr))
      .to.be.revertedWithCustomError(ethosProfile, 'AddressCompromised')
      .withArgs(ethers.getAddress(blockedAddr));
  });

  it('should correctly remove address from array when deleting middle element', async () => {
    // Register multiple addresses
    const addresses = [
      '0x6ba07df6c6534a719175d28881226721c47d49a3',
      '0x7ba07df6c6534a719175d28881226721c47d49a4',
      '0x8ba07df6c6534a719175d28881226721c47d49a5',
    ];

    // First address is already registered during user creation
    // So we only need to register the second and third addresses
    await userA.registerAddress(addresses[1]);
    await userA.registerAddress(addresses[2]);

    // Delete middle address (index 1)
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1, false);

    // Verify array state
    const remainingAddresses = await ethosProfile.addressesForProfile(defaultProfileId);
    expect(remainingAddresses).to.have.length(2);
    expect(remainingAddresses[0]).to.equal(await userA.signer.getAddress()); // Original address
    expect(remainingAddresses[1]).to.equal(ethers.getAddress(addresses[2])); // Last element should be moved to index 1
  });

  it('should correctly remove address from array when deleting last element', async () => {
    // Register multiple addresses
    const addresses = [
      '0x6ba07df6c6534a719175d28881226721c47d49a3',
      '0x7ba07df6c6534a719175d28881226721c47d49a4',
    ];

    for (const addr of addresses) {
      await userA.registerAddress(addr);
    }

    // Delete last address (index 2) - remember userA's original address is at index 0
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(2, false);

    // Verify array state
    const remainingAddresses = await ethosProfile.addressesForProfile(defaultProfileId);
    expect(remainingAddresses).to.have.length(2); // Original address + first registered address
    expect(remainingAddresses[0]).to.equal(await userA.signer.getAddress());
    expect(remainingAddresses[1]).to.equal(ethers.getAddress(addresses[0]));
  });

  it('should maintain array integrity when performing multiple deletions', async () => {
    // Register multiple addresses
    const addresses = [
      '0x6ba07df6c6534a719175d28881226721c47d49a3',
      '0x7ba07df6c6534a719175d28881226721c47d49a4',
      '0x8ba07df6c6534a719175d28881226721c47d49a5',
      '0x9ba07df6c6534a719175d28881226721c47d49a6',
    ];

    for (const addr of addresses) {
      await userA.registerAddress(addr);
    }

    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1, false);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1, false);

    const remainingAddresses = await ethosProfile.addressesForProfile(defaultProfileId);
    expect(remainingAddresses).to.have.length(3);
    expect(remainingAddresses[0]).to.equal(await userA.signer.getAddress());
    expect(remainingAddresses[1]).to.equal(ethers.getAddress(addresses[2])); // addr2 (0x8ba...)
    expect(remainingAddresses[2]).to.equal(ethers.getAddress(addresses[1])); // addr1 (0x7ba...)
  });
});
