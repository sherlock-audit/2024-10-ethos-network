import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { network, ethers } from 'hardhat';
import { zeroAddress } from 'viem';
import { type EthosProfile } from '../../typechain-types';
import { createDeployer, type EthosDeployer } from '../utils/deployEthos';

describe('Controlling Ethos Profile Contract', () => {
  let deployer: EthosDeployer;
  let ethosProfile: EthosProfile;

  beforeEach(async () => {
    deployer = await loadFixture(createDeployer);

    if (!deployer.ethosVouch.contract) {
      throw new Error('EthosVouch contract not found');
    }
    ethosProfile = deployer.ethosProfile.contract;
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('should not increment profile count when paused', async () => {
    await ethosProfile.connect(deployer.OWNER).pause();
    await expect(
      ethosProfile.incrementProfileCount(true, zeroAddress, ''),
    ).to.be.revertedWithCustomError(ethosProfile, 'Paused');
  });

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('should not bulk invite when paused', async () => {
    await ethosProfile.connect(deployer.OWNER).pause();
    await expect(
      ethosProfile.connect(deployer.OWNER).bulkInviteAddresses([zeroAddress]),
    ).to.be.revertedWithCustomError(ethosProfile, 'Paused');
  });

  it('should increment profile for attestation', async () => {
    const reviewAddr = await deployer.ethosReview.contract?.getAddress();
    // Impersonate the contract address
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [reviewAddr],
    });

    await network.provider.send('hardhat_setBalance', [
      reviewAddr,
      '0x1000000000000000000', // 1 ETH in hex
    ]);

    const reviewSigner = await ethers.getSigner(reviewAddr);
    const randomAttestation = '0x3f1f4d9bfc2c6e8a8fd3d4a5b8c9e9f5d1a7e1b3c7d5f2a8a4c2b6e8f7d1c9e2';
    const currentProfileCount = await ethosProfile.profileCount();
    await ethosProfile
      .connect(reviewSigner)
      .incrementProfileCount(true, zeroAddress, randomAttestation);

    expect(await ethosProfile.profileCount()).to.be.equal(currentProfileCount + 1n);
  });
});
