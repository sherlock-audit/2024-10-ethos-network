import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';
import { ethers } from 'ethers';
import hre from 'hardhat';

const { network, ethers: ethersHardhat } = hre;

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
    const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'uint256', 'string', 'string', 'string'],
      [_profileId, _randValue, _account, _service, _evidence],
    );

    const messageHash = ethers.keccak256(encodedData);
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

  attestationHash: async (account: string, service: string): Promise<string> => {
    // Use defaultAbiCoder to match the contract's abi.encode behavior
    const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'string'],
      [service, account],
    );

    return ethers.keccak256(encodedData);
  },
};

export function calculateFee(
  total: bigint,
  feeBasisPoints: bigint,
): { deposit: bigint; fee: bigint } {
  // fee is deducted from the amount as a percentage
  // algebra:
  // total = (1 + fee) * deposit
  // (total/ (1 + fee)) = deposit
  const BASIS_POINTS = 10000n;
  const deposit = mulDivFloor(total, BASIS_POINTS, BASIS_POINTS + feeBasisPoints);
  const fee = total - deposit;

  return { deposit, fee };
}

export function mulDivFloor(amount: bigint, numerator: bigint, denominator: bigint): bigint {
  // Replicate Solidity's mulDiv with floor rounding
  return (amount * numerator) / denominator;
}
