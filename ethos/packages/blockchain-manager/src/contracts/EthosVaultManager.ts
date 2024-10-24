import { type ContractLookup, TypeChain } from '@ethos/contracts';
import { type ContractRunner } from 'ethers';

export class EthosVaultManager {
  public readonly contract: TypeChain.VaultManagerAbi;

  constructor(runner: ContractRunner, contractLookup: ContractLookup) {
    this.contract = TypeChain.VaultManagerAbi__factory.connect(
      contractLookup.vaultManager.address,
      runner,
    );
  }

  /**
   * Fetches the entry protocol fee from the Vault Manager contract.
   * @returns A promise that resolves to the entry protocol fee in basis points.
   *
   */
  async getEntryProtocolFeeBasisPoints(): Promise<bigint> {
    return await this.contract.getEntryProtocolFeeBasisPoints();
  }

  /**
   * Retrieves the exit fee (in basis points) from the Vault Manager contract.
   * @returns A promise that resolves to the exit fee in basis points.
   *
   */
  async getExitFeeBasisPoints(): Promise<bigint> {
    return await this.contract.getExitFeeBasisPoints();
  }

  /**
   * Fetches the entry donation fee (in basis points) from the Vault Manager contract.
   * @return A promise that resolves to the entry donation fee in basis points.
   *
   */
  async getEntryDonationFeeBasisPoints(): Promise<bigint> {
    return await this.contract.getEntryDonationFeeBasisPoints();
  }

  /**
   * Retrieves the entry vouchers pool fee (in basis points) from the Vault Manager contract.
   * @returns A promise that resolves to the entry vouchers pool fee in basis points.
   *
   */
  async getEntryVouchersPoolFeeBasisPoints(): Promise<bigint> {
    return await this.contract.getEntryVouchersPoolFeeBasisPoints();
  }
}
