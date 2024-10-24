import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'ethers';
import { network, ethers as ethersHardhat } from 'hardhat';

export const common = {
  signatureForRegisterAddress: async (
    _address: string,
    _profileId: string,
    _randValue: string,
    _signatureSigner: HardhatEthersSigner,
  ): Promise<string> => {
    const messageTypes = ['address', 'uint256', 'uint256'];

    const message = [_address, _profileId, _randValue];

    const messageHash = ethers.solidityPackedKeccak256(messageTypes, message);

    const messageHashBinary = ethers.getBytes(messageHash);

    const signature = await _signatureSigner.signMessage(messageHashBinary);

    return signature;
  },

  signatureForCreateAttestation: async (
    _profileId: string,
    _randValue: string,
    _account: string,
    _service: string,
    _evidence: string,
    _signatureSigner: HardhatEthersSigner,
  ): Promise<string> => {
    const messageTypes = ['uint256', 'uint256', 'string', 'string', 'string'];

    const message = [_profileId, _randValue, _account, _service, _evidence];

    const messageHash = ethers.solidityPackedKeccak256(messageTypes, message);

    const messageHashBinary = ethers.getBytes(messageHash);

    const signature = await _signatureSigner.signMessage(messageHashBinary);

    return signature;
  },

  signatureForClaimAttestation: async (
    _profileId: string,
    _randValue: string,
    _attestationHash: string,
    _signatureSigner: HardhatEthersSigner,
  ): Promise<string> => {
    const messageTypes = ['uint256', 'uint256', 'bytes32'];

    const message = [_profileId, _randValue, _attestationHash];

    const messageHash = ethers.solidityPackedKeccak256(messageTypes, message);

    const messageHashBinary = ethers.getBytes(messageHash);

    const signature = await _signatureSigner.signMessage(messageHashBinary);

    return signature;
  },
  impersonateAndSetBalance: async (
    address: string,
    balance: string,
  ): Promise<HardhatEthersSigner> => {
    // Request Hardhat to impersonate the account at the given address
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [address],
    });

    // Convert the balance to a BigNumber if it is not already one, and format it for the RPC call
    const etherBalance = ethers.parseEther(balance);

    // Set the balance of the impersonated account
    await network.provider.send('hardhat_setBalance', [address, '0x' + etherBalance.toString(16)]);

    // Return a signer for the impersonated account
    return await ethersHardhat.getSigner(address);
  },
};
