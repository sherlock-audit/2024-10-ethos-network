import { type ContractLookup, TypeChain } from '@ethos/contracts';
import { type ContractRunner, type ContractTransactionResponse } from 'ethers';
import { getAddress, type Address } from 'viem';

export class ContractAddressManager {
  public readonly address: Address;
  public readonly contractRunner: ContractRunner;
  public readonly contract: TypeChain.ContractAddressManagerAbi;

  constructor(runner: ContractRunner, contractLookup: ContractLookup) {
    this.address = contractLookup.contractAddressManager.address;
    this.contractRunner = runner;
    this.contract = TypeChain.ContractAddressManagerAbi__factory.connect(this.address, runner);
  }

  /**
   * Updates contract addresses for given names.
   * @param contractAddresses Array of contract addresses.
   * @param names Array of contract names.
   * @returns Transaction response.
   */
  async updateContractAddressesForNames(
    contractAddresses: Address[],
    names: string[],
  ): Promise<ContractTransactionResponse> {
    return await this.contract.updateContractAddressesForNames(contractAddresses, names);
  }

  /**
   * Returns contract address for a given name.
   * @param name Name of the contract.
   * @returns Contract address.
   */
  async getContractAddressForName(name: string): Promise<Address> {
    const address = await this.contract.getContractAddressForName(name);

    return getAddress(address);
  }

  /**
   * Checks if the given address is an Ethos contract.
   * @param targetAddress Address to check.
   * @returns Boolean indicating if the address is an Ethos contract.
   */
  async checkIsEthosContract(targetAddress: Address): Promise<boolean> {
    return await this.contract.checkIsEthosContract(targetAddress);
  }
}
