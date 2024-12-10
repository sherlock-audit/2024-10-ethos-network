import { type HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers.js';
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';
import { type ContractTransactionResponse } from 'ethers';
import hre from 'hardhat';
import { zeroAddress } from 'viem';
import { type IEthosProfile } from '../../typechain-types/index.js';
import { common } from './common.js';
import {
  DEFAULT,
  REVIEW_PARAMS,
  type ReviewParams,
  VOUCH_PARAMS,
  type VouchParams,
} from './defaults.js';
import { type EthosDeployer } from './deployEthos.js';

const { ethers, network } = hre;

export class EthosUser {
  signer: HardhatEthersSigner;
  profileId: bigint;
  deployer: EthosDeployer;

  constructor(signer: HardhatEthersSigner, profileId: bigint, deployer: EthosDeployer) {
    this.signer = signer;
    this.profileId = profileId;
    this.deployer = deployer;
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
        params.paymentToken ?? DEFAULT.PAYMENT_TOKEN,
        params.comment ?? REVIEW_PARAMS.comment,
        params.metadata ?? REVIEW_PARAMS.metadata,
        params.attestationDetails ?? REVIEW_PARAMS.attestationDetails,
        { value: params.value ?? REVIEW_PARAMS.value },
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
  ): Promise<{ vouchedAt: bigint; vouchId: bigint; balance: bigint }> {
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
    const balance = await this.getVouchBalance(vouch.vouchId);

    return {
      vouchedAt,
      vouchId: vouch.vouchId,
      balance,
    };
  }

  public async unvouch(vouchId: bigint): Promise<ContractTransactionResponse> {
    return await this.deployer.ethosVouch.contract?.connect(this.signer).unvouch(vouchId);
  }

  public async getVouchBalance(vouchId: bigint): Promise<bigint> {
    return (await this.deployer.ethosVouch.contract.vouches(vouchId)).balance;
  }

  public async getRewardsBalance(): Promise<bigint> {
    return await this.deployer.ethosVouch.contract?.rewards(this.profileId);
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

  public async registerAddress(address: string): Promise<ContractTransactionResponse> {
    const randValue = Math.floor(Math.random() * 1000000);
    const signature = await common.signatureForRegisterAddress(
      address,
      this.profileId.toString(),
      randValue.toString(),
      this.deployer.EXPECTED_SIGNER,
    );

    return await this.deployer.ethosProfile.contract
      ?.connect(this.signer)
      .registerAddress(address, this.profileId, randValue, signature);
  }
}
