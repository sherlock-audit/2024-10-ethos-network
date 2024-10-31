import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { type EthosProfile } from '../../typechain-types';
import { common } from '../utils/common';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';
import { type EthosUser } from '../utils/ethosUser';

describe('EthosProfile Address Delete', () => {
  let deployer: EthosDeployer;
  let userA: EthosUser;
  let userB: EthosUser;
  let ethosProfile: EthosProfile;
  let EXPECTED_SIGNER: HardhatEthersSigner;
  const blockedAddr = '0x6ba07df6c6534a719175d28881226721c47d49a3';
  const defaultEvidence = 222323;
  const defaultProfileId = 2;
  let defaultSignature: string;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    userA = await deployer.createUser();
    userB = await deployer.createUser();
    EXPECTED_SIGNER = deployer.EXPECTED_SIGNER;
    defaultSignature = await common.signatureForRegisterAddress(
      blockedAddr,
      defaultProfileId.toString(),
      defaultEvidence.toString(),
      EXPECTED_SIGNER,
    );

    if (!deployer.ethosVouch.contract) {
      throw new Error('EthosVouch contract not found');
    }
    ethosProfile = deployer.ethosProfile.contract;
  });

  it('should revert if delete attempt with out of bounds index', async () => {
    await ethosProfile
      .connect(userA.signer)
      .registerAddress(blockedAddr, defaultProfileId, defaultEvidence, defaultSignature);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1);

    await expect(
      ethosProfile.connect(userA.signer).deleteAddressAtIndex(1),
    ).to.be.revertedWithCustomError(ethosProfile, 'InvalidIndex');
  });

  it('should revert if attempt to register compromised account', async () => {
    await ethosProfile
      .connect(userA.signer)
      .registerAddress(blockedAddr, defaultProfileId, defaultEvidence, defaultSignature);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1);

    const newEvidence = 54321;
    const newSignature = await common.signatureForRegisterAddress(
      blockedAddr,
      userB.profileId.toString(),
      newEvidence.toString(),
      EXPECTED_SIGNER,
    );

    await expect(
      ethosProfile
        .connect(userB.signer)
        .registerAddress(blockedAddr, userB.profileId, newEvidence, newSignature),
    )
      .to.be.revertedWithCustomError(ethosProfile, 'AddressCompromised')
      .withArgs(ethers.getAddress(blockedAddr));
  });

  it('should allow you to restore your previously deleted address', async () => {
    await ethosProfile
      .connect(userA.signer)
      .registerAddress(blockedAddr, defaultProfileId, defaultEvidence, defaultSignature);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1);

    await expect(ethosProfile.connect(userB.signer).inviteAddress(blockedAddr))
      .to.be.revertedWithCustomError(ethosProfile, 'AddressCompromised')
      .withArgs(ethers.getAddress(blockedAddr));
  });

  it('should revert if attempt to invite compromised account', async () => {
    await ethosProfile
      .connect(userA.signer)
      .registerAddress(blockedAddr, defaultProfileId, defaultEvidence, defaultSignature);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1);

    await expect(ethosProfile.connect(userB.signer).inviteAddress(blockedAddr))
      .to.be.revertedWithCustomError(ethosProfile, 'AddressCompromised')
      .withArgs(ethers.getAddress(blockedAddr));
  });

  it('should show compromised status via checkIsAddressCompromised', async () => {
    await ethosProfile
      .connect(userA.signer)
      .registerAddress(blockedAddr, defaultProfileId, defaultEvidence, defaultSignature);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1);

    expect(await ethosProfile.isAddressCompromised(blockedAddr)).to.equal(true);
    expect(await ethosProfile.checkIsAddressCompromised(userA.signer.getAddress())).to.equal(false);
  });

  it('should revert when checking a compromised address', async () => {
    await ethosProfile
      .connect(userA.signer)
      .registerAddress(blockedAddr, defaultProfileId, defaultEvidence, defaultSignature);
    await ethosProfile.connect(userA.signer).deleteAddressAtIndex(1);

    await expect(ethosProfile.checkIsAddressCompromised(blockedAddr))
      .to.be.revertedWithCustomError(ethosProfile, 'AddressCompromised')
      .withArgs(ethers.getAddress(blockedAddr));
  });
});
