import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { type ContractTransactionResponse } from 'ethers';
import { ethers, network } from 'hardhat';
import { zeroAddress } from 'viem';
import { type IEthosProfile } from '../../typechain-types';
import {
  DEFAULT,
  REVIEW_PARAMS,
  type ReviewParams,
  VOUCH_PARAMS,
  type VouchParams,
} from './defaults';
import { type EthosDeployer } from './deployEthos';
import { EthosVault } from './ethosVault';

export class EthosUser {
  signer: HardhatEthersSigner;
  profileId: bigint;
  deployer: EthosDeployer;
  vault: EthosVault | null;

  constructor(signer: HardhatEthersSigner, profileId: bigint, deployer: EthosDeployer) {
    this.signer = signer;
    this.profileId = profileId;
    this.deployer = deployer;
    this.vault = null;
  }

  public async setBalance(amount: string): Promise<void> {
    const newBalance = ethers.parseEther(amount);
    await network.provider.send('hardhat_setBalance', [
      this.signer.address,
      '0x' + newBalance.toString(16),
    ]);
  }

  public async getBalance(): Promise<bigint> {
    return await ethers.provider.getBalance(this.signer.address);
  }

  public async review(params: ReviewParams = REVIEW_PARAMS): Promise<ContractTransactionResponse> {
    return await this.deployer.ethosReview.contract
      ?.connect(this.signer)
      .addReview(
        params.score ?? REVIEW_PARAMS.score,
        params.address ?? zeroAddress,
        DEFAULT.PAYMENT_TOKEN,
        params.comment ?? REVIEW_PARAMS.comment,
        params.metadata ?? REVIEW_PARAMS.metadata,
        params.attestationDetails ?? REVIEW_PARAMS.attestationDetails,
      );
  }

  public async editReview(
    reviewId: bigint,
    comment: string,
    metadata: string,
  ): Promise<ContractTransactionResponse> {
    return await this.deployer.ethosReview.contract
      ?.connect(this.signer)
      .editReview(reviewId, comment, metadata);
  }

  public async vouch(
    subject: EthosUser,
    params: VouchParams = VOUCH_PARAMS,
  ): Promise<{ vouchedAt: bigint; vouchId: bigint }> {
    await this.deployer.ethosVouch.contract
      ?.connect(this.signer)
      .vouchByProfileId(
        subject.profileId,
        params.comment ?? DEFAULT.COMMENT,
        params.metadata ?? DEFAULT.METADATA,
        { value: params.paymentAmount },
      );
    const vouchedAt = BigInt(await time.latest());
    const vouch = await this.deployer.ethosVouch.contract?.verifiedVouchByAuthorForSubjectProfileId(
      this.profileId,
      subject.profileId,
    );

    return { vouchedAt, vouchId: vouch.vouchId };
  }

  public async unvouch(vouchId: bigint): Promise<ContractTransactionResponse> {
    return await this.deployer.ethosVouch.contract?.connect(this.signer).unvouch(vouchId);
  }

  public async getVault(): Promise<EthosVault> {
    if (!this.vault) {
      const vaultAddress = await this.deployer.ethosVaultManager.contract
        ?.connect(this.signer)
        .getVaultByProfileId(this.profileId);

      this.vault = await EthosVault.create(vaultAddress);
    }

    return this.vault;
  }

  public async getVouchBalance(vouchId: bigint): Promise<bigint> {
    return await this.deployer.ethosVouch.contract
      ?.connect(this.signer)
      .getBalanceByVouchId(vouchId);
  }

  public async getWithdrawableAssets(vouchId: bigint): Promise<bigint> {
    return await this.deployer.ethosVouch.contract
      ?.connect(this.signer)
      .getWithdrawableAssetsByVouchId(vouchId);
  }

  public async getEscrowBalance(): Promise<bigint> {
    return await this.deployer.ethosEscrow.contract
      ?.connect(this.signer)
      .balanceOf(this.profileId, DEFAULT.ESCROW_TOKEN_ADDRESS);
  }

  public async grantInvites(amount: number): Promise<ContractTransactionResponse> {
    return await this.deployer.ethosProfile.contract
      ?.connect(this.deployer.ADMIN)
      .addInvites(this.signer.address, amount);
  }

  public async getInviteInfo(): Promise<IEthosProfile.InviteInfoStructOutput> {
    return await this.deployer.ethosProfile.contract
      ?.connect(this.signer)
      .inviteInfoForProfileId(this.profileId);
  }

  public async sendInvite(recipient: string): Promise<ContractTransactionResponse> {
    return await this.deployer.ethosProfile.contract?.connect(this.signer).inviteAddress(recipient);
  }

  public async archiveProfile(): Promise<ContractTransactionResponse> {
    return await this.deployer.ethosProfile.contract?.connect(this.signer).archiveProfile();
  }

  public async restoreProfile(): Promise<ContractTransactionResponse> {
    return await this.deployer.ethosProfile.contract?.connect(this.signer).restoreProfile();
  }
}
