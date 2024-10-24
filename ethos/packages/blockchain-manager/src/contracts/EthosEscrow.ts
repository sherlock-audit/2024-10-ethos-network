import { type ContractLookup, TypeChain } from '@ethos/contracts';
import { type ContractRunner, type ContractTransactionResponse } from 'ethers';
import { type Address } from 'viem';
import { type Balance } from '../types';
import { ESCROW_TOKEN_ADDRESS } from './constants';
import { formatTokenAmount, parseTokenAmount } from './utils';

export class EthosEscrow {
  public readonly address: Address;
  public readonly contractRunner: ContractRunner;
  public readonly contract: TypeChain.EscrowAbi;

  constructor(runner: ContractRunner, contractLookup: ContractLookup) {
    this.address = contractLookup.escrow.address;
    this.contractRunner = runner;
    this.contract = TypeChain.EscrowAbi__factory.connect(this.address, runner);
  }

  /**
   * Deposits ERC20 tokens into the escrow for a specific profile.
   * @param token The address of the ERC20 token to deposit.
   * @param amount The amount of tokens to deposit.
   */
  async deposit(token: Address, amount: string): Promise<ContractTransactionResponse> {
    const value = parseTokenAmount(amount, token);

    return await this.contract.deposit(token, value);
  }

  /**
   * Deposits native ETH into escrow.
   * @param amount The amount of ETH to deposit.
   */
  async depositETH(amount: string): Promise<ContractTransactionResponse> {
    const value = parseTokenAmount(amount, ESCROW_TOKEN_ADDRESS);

    return await this.contract.depositETH({ value });
  }

  /**
   * Withdraws ERC20 tokens or native ETH from escrow back to a specified receiver.
   * @param token The address of the token to withdraw.
   * @param receiver The address where the tokens will be sent.
   * @param amount The amount of tokens to withdraw.
   */
  async withdraw(
    token: Address,
    receiver: Address,
    amount: string,
  ): Promise<ContractTransactionResponse> {
    const value = parseTokenAmount(amount, token);

    return await this.contract.withdraw(token, receiver, value);
  }

  /**
   * Returns the balance of a given token for a specified profile.
   * @param profileId ID of the profile to check the balance for.
   * @param token The token address to check the balance of.
   */
  async balanceOf(profileId: number, token: Address): Promise<Balance> {
    const balance = await this.contract.balanceOf(profileId, token);

    return {
      profileId,
      token,
      balance: formatTokenAmount(balance, token),
    };
  }
}
