import { type ContractLookup, TypeChain } from '@ethos/contracts';
import { type ContractRunner, type ContractTransactionResponse, toNumber } from 'ethers';
import { isAddress, zeroAddress, type Address } from 'viem';
import { type Vouch } from '../types';
import { parseTokenAmount } from './utils';

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
   * Gets the count of vouches made by an author.
   * @param authorProfileId The profile ID of the author.
   * @returns The number of vouches made by the author.
   */
  async vouchesCountByAuthor(authorProfileId: number): Promise<number> {
    const count = await this.contract.vouchesCountByAuthor(authorProfileId);

    return toNumber(count);
  }

  /**
   * Gets vouches made by an author within a specified range.
   * @param authorProfileId The profile ID of the author.
   * @param fromIdx The starting index.
   * @param maxLength The maximum number of vouches to return.
   * @returns An array of Vouch objects.
   */
  async vouchesByAuthorInRange(
    authorProfileId: number,
    fromIdx: number,
    maxLength: number,
  ): Promise<Vouch[]> {
    const rawVouches = await this.contract.vouchesByAuthorInRange(
      authorProfileId,
      fromIdx,
      maxLength,
    );
    const vouches = rawVouches.map((v) => this.formatRawVouch(v));

    return vouches.filter((v): v is Vouch => v !== null);
  }

  /**
   * Gets the count of vouches made for a subject profile.
   * @param subjectProfileId The profile ID of the subject.
   * @returns The number of vouches made for the subject profile.
   */
  async vouchesCountForSubjectProfileId(subjectProfileId: number): Promise<number> {
    const count = await this.contract.vouchesCountForSubjectProfileId(subjectProfileId);

    return toNumber(count);
  }

  /**
   * Gets vouches made for a subject profile within a specified range.
   * @param subjectProfileId The profile ID of the subject.
   * @param fromIdx The starting index.
   * @param maxLength The maximum number of vouches to return.
   * @returns An array of Vouch objects.
   */
  async vouchesForSubjectProfileIdInRange(
    subjectProfileId: number,
    fromIdx: number,
    maxLength: number,
  ): Promise<Vouch[]> {
    const rawVouches = await this.contract.vouchesForSubjectProfileIdInRange(
      subjectProfileId,
      fromIdx,
      maxLength,
    );
    const vouches = rawVouches.map((v) => this.formatRawVouch(v));

    return vouches.filter((v): v is Vouch => v !== null);
  }

  /**
   * Vouches for profile Id.
   * @param subjectProfileId Vouchee profile Id.
   * @param paymentToken Payment token address.
   * @param paymentAmount Payment amount. Must be equal to msg.value for native token.
   * @param comment Optional comment.
   * @param metadata Optional metadata.
   */
  async vouchByProfileId(
    subjectProfileId: number,
    paymentToken: Address,
    paymentAmount: string,
    comment?: string,
    metadata?: string,
  ): Promise<ContractTransactionResponse> {
    const value = parseTokenAmount(paymentAmount, paymentToken);

    return await this.contract.vouchByProfileId(subjectProfileId, comment ?? '', metadata ?? '', {
      value,
    });
  }

  /**
   * Vouches for address.
   * @param voucheeAddress Vouchee address.
   * @param paymentToken Payment token address.
   * @param paymentAmount Payment amount. Must be equal to msg.value for native token.
   * @param comment Optional comment.
   * @param metadata Optional metadata.
   */
  async vouchByAddress(
    subjectAddress: Address,
    paymentToken: Address,
    paymentAmount: string,
    comment?: string,
    metadata?: string,
  ): Promise<ContractTransactionResponse> {
    const value = parseTokenAmount(paymentAmount, paymentToken);

    return await this.contract.vouchByAddress(subjectAddress, comment ?? '', metadata ?? '', {
      value,
    });
  }

  /**
   * Get the balance of a vouch (excluding exit fees)
   * @param vouchId The ID of the vouch
   * @returns The redeemable balance in the underlying asset
   */
  async getBalanceByVouchId(vouchId: number): Promise<bigint> {
    const balance = await this.contract.getBalanceByVouchId(vouchId);

    return balance;
  }

  /**
   * Get the withdrawable assets of a vouch (including exit fees)
   * @param vouchId The ID of the vouch
   * @returns The amount of withdrawable assets in the underlying asset, including exit fees
   */
  async getWithdrawableAssetsByVouchId(vouchId: number): Promise<bigint> {
    const withdrawableAssets = await this.contract.getWithdrawableAssetsByVouchId(vouchId);

    return withdrawableAssets;
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

  private formatRawVouch(vouch: VouchRaw): Vouch | null {
    const {
      archived,
      unhealthy,
      authorProfileId,
      stakeToken,
      vouchId,
      subjectProfileId,
      comment,
      metadata,
      activityCheckpoints: { vouchedAt, unvouchedAt, unhealthyAt },
    } = vouch;

    return {
      id: toNumber(vouchId),
      archived: Boolean(archived),
      unhealthy: Boolean(unhealthy),
      authorProfileId: toNumber(authorProfileId),
      stakeToken: isAddress(stakeToken) ? stakeToken : zeroAddress,
      subjectProfileId: toNumber(subjectProfileId),
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
