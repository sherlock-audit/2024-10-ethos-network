import { type ContractLookup, TypeChain } from '@ethos/contracts';
import { type ContractRunner, type ContractTransactionResponse, toNumber } from 'ethers';
import { getAddress, parseUnits, type Address } from 'viem';
import { type Fees, type Vouch } from '../types.js';

type VouchRaw = Awaited<ReturnType<TypeChain.VouchAbi['vouches']>>;

export class EthosVouch {
  public readonly address: Address;
  public readonly contractRunner: ContractRunner;
  public readonly contract: TypeChain.VouchAbi;

  constructor(runner: ContractRunner, contractLookup: ContractLookup) {
    this.address = contractLookup.vouch.address;
    this.contractRunner = runner;
    this.contract = TypeChain.VouchAbi__factory.connect(this.address, runner);
  }

  /**
   * Returns the number of vouches. Also, it's the same as the most recent vouch id.
   */
  async vouchCount(): Promise<number> {
    const vouchCount = await this.contract.vouchCount();

    return toNumber(vouchCount);
  }

  /**
   * Get vouch details.
   */
  async getVouch(id: number): Promise<Vouch | null> {
    const rawVouch = await this.contract.vouches(id);

    return this.formatRawVouch(rawVouch);
  }

  /**
   * Vouches for profile Id.
   * @param subjectProfileId Vouchee profile Id.
   * @param paymentAmount Payment amount. Must be equal to msg.value for native token.
   * @param comment Optional comment.
   * @param metadata Optional metadata.
   */
  async vouchByProfileId(
    subjectProfileId: number,
    paymentAmount: string,
    comment?: string,
    metadata?: string,
  ): Promise<ContractTransactionResponse> {
    const value = parseUnits(paymentAmount, 18);

    return await this.contract.vouchByProfileId(subjectProfileId, comment ?? '', metadata ?? '', {
      value,
    });
  }

  /**
   * Vouches for address.
   * @param voucheeAddress Vouchee address.
   * @param paymentAmount Payment amount. Must be equal to msg.value for native token.
   * @param comment Optional comment.
   * @param metadata Optional metadata.
   */
  async vouchByAddress(
    subjectAddress: Address,
    paymentAmount: string,
    comment?: string,
    metadata?: string,
  ): Promise<ContractTransactionResponse> {
    const value = parseUnits(paymentAmount, 18);

    return await this.contract.vouchByAddress(subjectAddress, comment ?? '', metadata ?? '', {
      value,
    });
  }

  /**
   * Unvouches vouch.
   */
  async unvouch(vouchId: number): Promise<ContractTransactionResponse> {
    return await this.contract.unvouch(vouchId);
  }

  /**
   * Unvouches vouch.
   */
  async unvouchUnhealthy(vouchId: number): Promise<ContractTransactionResponse> {
    return await this.contract.unvouchUnhealthy(vouchId);
  }

  /**
   * Returns all fee configurations from the contract
   */
  async getAllFees(): Promise<Fees> {
    const [
      entryProtocolFeeBasisPoints,
      exitFeeBasisPoints,
      entryDonationFeeBasisPoints,
      entryVouchersPoolFeeBasisPoints,
    ] = await Promise.all([
      this.contract.entryProtocolFeeBasisPoints(),
      this.contract.exitFeeBasisPoints(),
      this.contract.entryDonationFeeBasisPoints(),
      this.contract.entryVouchersPoolFeeBasisPoints(),
    ]);

    return {
      entryProtocolFeeBasisPoints,
      exitFeeBasisPoints,
      entryDonationFeeBasisPoints,
      entryVouchersPoolFeeBasisPoints,
    };
  }

  /**
   * Gets the rewards balance for a profile ID
   * @param profileId The profile ID to check rewards balance for
   * @returns The rewards balance
   */
  async getRewardsBalance(profileId: number): Promise<{ balance: string }> {
    const balance = await this.contract.rewards(profileId);

    return {
      balance: balance.toString(),
    };
  }

  /**
   * Withdraws all rewards
   * @returns The transaction response
   */
  async claimRewards(): Promise<ContractTransactionResponse> {
    // The contract only supports claiming all rewards at once via claimRewards()
    return await this.contract.claimRewards();
  }

  private formatRawVouch(vouch: VouchRaw): Vouch | null {
    const {
      archived,
      unhealthy,
      authorProfileId,
      authorAddress,
      vouchId,
      subjectProfileId,
      balance,
      comment,
      metadata,
      activityCheckpoints: { vouchedAt, unvouchedAt, unhealthyAt },
    } = vouch;

    return {
      id: toNumber(vouchId),
      archived: Boolean(archived),
      unhealthy: Boolean(unhealthy),
      authorProfileId: toNumber(authorProfileId),
      authorAddress: getAddress(authorAddress),
      subjectProfileId: toNumber(subjectProfileId),
      balance,
      comment,
      metadata,
      activityCheckpoints: {
        vouchedAt: toNumber(vouchedAt),
        unvouchedAt: toNumber(unvouchedAt),
        unhealthyAt: toNumber(unhealthyAt),
      },
    };
  }
}
