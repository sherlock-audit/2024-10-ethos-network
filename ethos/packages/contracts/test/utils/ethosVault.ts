import { ethers } from 'hardhat';
import { type EthosVaultETHUnderlying } from '../../typechain-types';
import { type EthosUser } from './ethosUser';

export class EthosVault {
  address: string;
  contract: EthosVaultETHUnderlying;

  private constructor(address: string, contract: EthosVaultETHUnderlying) {
    this.address = address;
    this.contract = contract;
  }

  public static async create(address: string): Promise<EthosVault> {
    const contract = await ethers.getContractAt('EthosVaultETHUnderlying', address);

    return new EthosVault(address, contract);
  }

  public async previewRedeem(user: EthosUser): Promise<bigint> {
    const maxRedeem = await this.contract.connect(user.signer).maxRedeem(user.signer.address);

    return await this.contract.connect(user.signer).previewRedeem(maxRedeem);
  }
}
