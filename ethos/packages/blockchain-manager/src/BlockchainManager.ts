import {
  type ContractLookup,
  contracts,
  type Contract,
  getContractsForEnvironment,
} from '@ethos/contracts';
import { type EthosEnvironment } from '@ethos/env';
import {
  type BytesLike,
  type ErrorDescription,
  type Interface,
  Wallet,
  isCallException,
  type Listener,
  type TransactionResponse,
  isHexString,
  type AbstractProvider,
  type Signer,
  type TransactionReceipt,
  type Provider,
} from 'ethers';
import { isAddress, type Address } from 'viem';
import { ContractAddressManager } from './contracts/ContractAddressManager';
import { EthosAttestation } from './contracts/EthosAttestation';
import { EthosDiscussion } from './contracts/EthosDiscussion';
import { EthosEscrow } from './contracts/EthosEscrow';
import { EthosProfile } from './contracts/EthosProfile';
import { EthosReview } from './contracts/EthosReview';
import { EthosVaultManager } from './contracts/EthosVaultManager';
import { EthosVote } from './contracts/EthosVote';
import { EthosVouch } from './contracts/EthosVouch';
import { ReputationMarket } from './contracts/ReputationMarket';
import {
  decodeWETH9Log,
  formatMessageToSign,
  getContractRunner,
  getLogs,
  registerListener,
} from './contracts/utils';
import {
  type CancelListener,
  type AttestationService,
  type ProfileId,
  type ReviewTarget,
  type ScoreType,
  type Vouch,
  type Fees,
  BlockchainError,
} from './types';

function isValidLog(log: any): log is { address: string; data: string; topics: string[] } {
  return isHexString(log.address) && isHexString(log.data) && Array.isArray(log.topics);
}

export class BlockchainManager {
  provider: Provider | null;
  ethosAttestation: EthosAttestation;
  ethosDiscussion: EthosDiscussion;
  ethosEscrow: EthosEscrow;
  ethosProfile: EthosProfile;
  ethosReview: EthosReview;
  ethosVote: EthosVote;
  ethosVouch: EthosVouch;
  reputationMarket: ReputationMarket;
  contractLookup: ContractLookup;
  contractAddressManager: ContractAddressManager;
  ethosVaultManager: EthosVaultManager;
  private readonly contractAddressLookup: Record<Address, Contract>;

  constructor(
    environment: EthosEnvironment,
    {
      alchemyConnectionURL,
      provider,
      signer,
      walletPrivateKey,
    }: {
      alchemyConnectionURL?: string;
      provider?: AbstractProvider;
      signer?: Signer;
      walletPrivateKey?: string;
    } = {},
  ) {
    const runner = getContractRunner({ alchemyConnectionURL, provider, signer, walletPrivateKey });

    this.provider = runner.provider;

    if (provider) {
      this.provider = provider;
    }
    this.contractLookup = getContractsForEnvironment(environment);

    this.ethosVaultManager = new EthosVaultManager(runner, this.contractLookup);
    this.ethosAttestation = new EthosAttestation(runner, this.contractLookup);
    this.ethosDiscussion = new EthosDiscussion(runner, this.contractLookup);
    this.ethosEscrow = new EthosEscrow(runner, this.contractLookup);
    this.ethosProfile = new EthosProfile(runner, this.contractLookup);
    this.ethosReview = new EthosReview(runner, this.contractLookup);
    this.ethosVote = new EthosVote(runner, this.contractLookup);
    this.ethosVouch = new EthosVouch(runner, this.contractLookup);
    this.reputationMarket = new ReputationMarket(runner, this.contractLookup);
    this.contractAddressManager = new ContractAddressManager(runner, this.contractLookup);
    this.contractAddressLookup = {};

    for (const name of contracts) {
      this.contractAddressLookup[this.contractLookup[name].address] = name;
    }
  }

  /**
   * Retrieves the current address of a specified contract.
   * @param contract The contract name to look up.
   * @returns The address of the specified contract.
   */
  getContractAddress(contract: Contract): Address {
    return this.contractLookup[contract].address;
  }

  /**
   * Retrieves the name of a contract given its address.
   * @param contractAddress The address of the contract to look up.
   * @returns The name of the contract associated with the given address.
   */
  getContractName(contractAddress: Address): Contract {
    return this.contractAddressLookup[contractAddress];
  }

  /**
   * EVENT HANDLING METHODS
   */

  /**
   * Sets up event listeners for all Ethos contracts and calls the provided callback when events occur.
   *
   * This includes a manually curated list of relevant events for each contract.
   *
   * @param callback - A function to be called when any Ethos contract event is emitted.
   *                   The callback will receive all arguments passed by the event.
   *                   The last argument is always the standard event log.
   */
  async onEthosEvent(callback: Listener): Promise<{
    ethosAttestation: CancelListener;
    ethosProfile: CancelListener;
    ethosDiscussion: CancelListener;
    ethosEscrow: CancelListener;
    ethosReview: CancelListener;
    ethosVote: CancelListener;
    ethosVouch: CancelListener;
    ethosReputationMarket: CancelListener;
  }> {
    const ae = this.ethosAttestation.contract.filters;
    const attestationEvents = [
      ae.AttestationCreated,
      ae.AttestationArchived,
      ae.AttestationClaimed,
      ae.AttestationRestored,
    ];
    const de = this.ethosDiscussion.contract.filters;
    const discussionEvents = [de.ReplyAdded, de.ReplyEdited];
    const ee = this.ethosEscrow.contract.filters;
    const escrowEvents = [ee.Deposited, ee.Withdrawn];
    const pe = this.ethosProfile.contract.filters;
    const profileEvents = [
      pe.AddressClaim,
      pe.InvitesAdded,
      pe.ProfileArchived,
      pe.ProfileCreated,
      pe.ProfileRestored,
      pe.Uninvited,
      pe.UserInvited,
    ];
    const re = this.ethosReview.contract.filters;
    const reviewEvents = [re.ReviewCreated, re.ReviewArchived, re.ReviewRestored, re.ReviewEdited];
    const voe = this.ethosVote.contract.filters;
    const voteEvents = [voe.VoteChanged, voe.Voted];
    const ve = this.ethosVouch.contract.filters;
    const vouchEvents = [ve.MarkedUnhealthy, ve.Unvouched, ve.Vouched];
    const me = this.reputationMarket.contract.filters;
    const marketEvents = [me.MarketCreated, me.MarketUpdated, me.VotesBought, me.VotesSold];

    return {
      ethosAttestation: await registerListener(
        this.ethosAttestation.contract,
        attestationEvents,
        callback,
      ),
      ethosProfile: await registerListener(this.ethosProfile.contract, profileEvents, callback),
      ethosDiscussion: await registerListener(
        this.ethosDiscussion.contract,
        discussionEvents,
        callback,
      ),
      ethosEscrow: await registerListener(this.ethosEscrow.contract, escrowEvents, callback),
      ethosReview: await registerListener(this.ethosReview.contract, reviewEvents, callback),
      ethosVote: await registerListener(this.ethosVote.contract, voteEvents, callback),
      ethosVouch: await registerListener(this.ethosVouch.contract, vouchEvents, callback),
      ethosReputationMarket: await registerListener(
        this.reputationMarket.contract,
        marketEvents,
        callback,
      ),
    };
  }

  /**
   * Get all EthosProfile events.
   */
  async getProfileEvents(fromBlock: number, toBlock?: number): ReturnType<typeof getLogs> {
    return await getLogs(this.ethosProfile, fromBlock, toBlock);
  }

  /**
   * Get all EthosReview events.
   */
  async getReviewEvents(fromBlock: number, toBlock?: number): ReturnType<typeof getLogs> {
    return await getLogs(this.ethosReview, fromBlock, toBlock);
  }

  /**
   * Get all EthosVouch events.
   */
  async getVouchEvents(fromBlock: number, toBlock?: number): ReturnType<typeof getLogs> {
    return await getLogs(this.ethosVouch, fromBlock, toBlock);
  }

  /**
   * Get all EthosDiscussion events.
   */
  async getDiscussionEvents(fromBlock: number, toBlock?: number): ReturnType<typeof getLogs> {
    return await getLogs(this.ethosDiscussion, fromBlock, toBlock);
  }

  /**
   * Get all EthosEscrow events.
   */
  async getEscrowEvents(fromBlock: number, toBlock?: number): ReturnType<typeof getLogs> {
    return await getLogs(this.ethosEscrow, fromBlock, toBlock);
  }

  /**
   * Get all EthosVote events.
   */
  async getVoteEvents(fromBlock: number, toBlock?: number): ReturnType<typeof getLogs> {
    return await getLogs(this.ethosVote, fromBlock, toBlock);
  }

  /**
   * Get all EthosAttestation events.
   */
  async getAttestationEvents(fromBlock: number, toBlock?: number): ReturnType<typeof getLogs> {
    return await getLogs(this.ethosAttestation, fromBlock, toBlock);
  }

  /**
   * Get all ReputationMarket events.
   */
  async getMarketEvents(fromBlock: number, toBlock?: number): ReturnType<typeof getLogs> {
    return await getLogs(this.reputationMarket, fromBlock, toBlock);
  }

  /**
   * PROFILE METHODS
   */

  /**
   * Adds invites to a profile.
   * @param user Address of the profile to add invites to.
   * @param amount Quantity of invites to add to the profile.
   * @returns Transaction response.
   */
  async addInvites(
    ...args: Parameters<EthosProfile['addInvites']>
  ): ReturnType<EthosProfile['addInvites']> {
    return await this.ethosProfile.addInvites(...args);
  }

  /**
   * Invites an address to create an Ethos profile.
   * @param address Address to invite.
   * @returns Transaction response.
   */
  async inviteAddress(
    ...args: Parameters<EthosProfile['inviteAddress']>
  ): ReturnType<EthosProfile['inviteAddress']> {
    return await this.ethosProfile.inviteAddress(...args);
  }

  /**
   * Revokes invitation of an address to create an Ethos profile.
   * @param address Address to invite.
   * @returns Transaction response.
   */
  async uninviteUser(
    ...args: Parameters<EthosProfile['uninviteUser']>
  ): ReturnType<EthosProfile['uninviteUser']> {
    return await this.ethosProfile.uninviteUser(...args);
  }

  /**
   * Creates a new Ethos profile for the sender.
   * @returns Transaction response.
   */
  async createProfile(
    ...args: Parameters<EthosProfile['createProfile']>
  ): ReturnType<EthosProfile['createProfile']> {
    return await this.ethosProfile.createProfile(...args);
  }

  /**
   * @param id Profile id.
   * @returns Basic profile information and associated addresses.
   */
  async getProfile(
    ...args: Parameters<EthosProfile['getProfile']>
  ): ReturnType<EthosProfile['getProfile']> {
    return await this.ethosProfile.getProfile(...args);
  }

  /**
   * Creates a signature for creating an attestation by signing all parameters.
   * @param profileId Profile id. Use max uint for non-existing profile.
   * @param account Account name.
   * @param signerPrivateKey Signer private key.
   * @returns Random value and signature.
   */
  async createSignatureForRegisterAddress(
    profileId: ProfileId,
    account: Address,
    signerPrivateKey: string,
  ): Promise<{ randValue: number; signature: string }> {
    // TODO: check if it's secure to use timestamp
    const randValue = Date.now();

    const messageHash = formatMessageToSign([
      ['address', account],
      ['uint256', profileId],
      ['uint256', randValue],
    ]);

    const signer = new Wallet(signerPrivateKey);

    const signature = await signer.signMessage(messageHash);

    return {
      randValue,
      signature,
    };
  }

  /**
   * ATTESTATION METHODS
   */

  /**
   * Creates a signature for creating an attestation by signing all parameters.
   * @param profileId Profile id. Use max uint for non-existing profile.
   * @param account Account name.
   * @param service Service name. E.g., 'x.com'.
   * @param evidence Evidence of attestation.
   * @param signerPrivateKey Signer private key.
   * @returns Random value and signature.
   */
  async createSignatureForCreateAttestation(
    profileId: ProfileId,
    account: string,
    service: AttestationService,
    evidence: string,
    signerPrivateKey: string,
  ): Promise<{ randValue: number; signature: string }> {
    // TODO: check if it's secure to use timestamp
    const randValue = Date.now();

    const messageHash = formatMessageToSign([
      ['uint256', profileId],
      ['uint256', randValue],
      ['string', account.toLowerCase()],
      ['string', service.toLowerCase()],
      ['string', evidence],
    ]);

    const signer = new Wallet(signerPrivateKey);

    const signature = await signer.signMessage(messageHash);

    return {
      randValue,
      signature,
    };
  }

  /**
   * Creates a new attestation and links it to the current sender's profile.
   * @param profileId Profile id. Use max uint for non-existing profile.
   * @param randValue Random value.
   * @param account Account name.
   * @param service Service name. E.g., 'x.com'.
   * @param evidence Evidence of attestation.
   * @param signature Signature of the attestation.
   * @returns Transaction response.
   */
  async createAttestation(
    ...args: Parameters<EthosAttestation['createAttestation']>
  ): ReturnType<EthosAttestation['createAttestation']> {
    return await this.ethosAttestation.createAttestation(...args);
  }

  /**
   * Archives attestation.
   * @param attestationHash Hash of the attestation. Used as a safeguard in case hash array was reordered.
   * @returns Transaction response.
   */
  async archiveAttestation(
    ...args: Parameters<EthosAttestation['archiveAttestation']>
  ): ReturnType<EthosAttestation['archiveAttestation']> {
    return await this.ethosAttestation.archiveAttestation(...args);
  }

  /**
   * @dev Restores attestation.
   * @param attestationHash Hash of the attestation.
   */
  async restoreAttestation(
    ...args: Parameters<EthosAttestation['restoreAttestation']>
  ): ReturnType<EthosAttestation['restoreAttestation']> {
    return await this.ethosAttestation.restoreAttestation(...args);
  }

  /**
   * Gets attestation details by hash.
   * @param hash Attestation hash.
   * @returns Attestation.
   */
  async getAttestationByHash(
    ...args: Parameters<EthosAttestation['attestationByHash']>
  ): ReturnType<EthosAttestation['attestationByHash']> {
    return await this.ethosAttestation.attestationByHash(...args);
  }

  /**
   * REVIEW METHODS
   */

  /**
   * Adds a review.
   * Target may either be an address or attestation (service, account strings)
   * @returns Transaction response.
   */
  async addReview(
    scoreType: ScoreType,
    subject: ReviewTarget,
    comment: string,
    metadata: string,
  ): ReturnType<EthosReview['addReview']> {
    return await this.ethosReview.addReview(scoreType, subject, comment, metadata);
  }

  /**
   * Archives a review.
   * @returns Transaction response.
   */
  async archiveReview(id: number): ReturnType<EthosReview['addReview']> {
    return await this.ethosReview.archiveReview(id);
  }

  /**
   * Get review details.
   */
  async getReview(id: number): ReturnType<EthosReview['getReview']> {
    return await this.ethosReview.getReview(id);
  }

  /**
   * Returns the number of reviews. Also, it's the same as the most recent review id.
   */
  async reviewCount(): ReturnType<EthosReview['reviewCount']> {
    return await this.ethosReview.reviewCount();
  }

  async getTransactionReceiptByHash(txHash: string): Promise<{
    transaction: TransactionReceipt | null;
  }> {
    if (!this.provider) throw new Error('Provider not available');

    const tx = await this.provider.getTransactionReceipt(txHash);

    return {
      transaction: tx,
    };
  }

  /**
   * VOUCH METHODS
   */

  /**
   * Get vouch transaction deposit and stake details
   */
  async getVouchEthTransfers(txHash: string): Promise<{
    transaction: TransactionResponse;
    transfer: { deposit?: bigint; withdraw?: bigint };
  }> {
    const provider = this.ethosVouch.contractRunner.provider;

    if (!provider) throw new Error('Provider not available');

    const tx = await provider.getTransaction(txHash);

    if (!tx) throw new Error('Transaction not found');

    const receipt = await tx.wait();

    if (!receipt) throw new Error('Transaction receipt not found');

    const transfers = receipt.logs
      .filter(isValidLog)
      .map((log) => decodeWETH9Log(log))
      .filter((t) => t.deposit !== undefined || t.withdraw !== undefined);

    if (transfers.length !== 1) {
      throw new Error(`Invalid number of transfers: ${transfers.length}`);
    }

    return {
      transaction: tx,
      transfer: transfers[0],
    };
  }

  /**
   * Get vouch details.
   */
  async getVouch(id: number): ReturnType<EthosVouch['getVouch']> {
    return await this.ethosVouch.getVouch(id);
  }

  /**
   * Get all vouches for a subject profile.
   * @param subjectProfileId The profile ID of the subject.
   * @returns An array of all Vouch objects for the subject.
   */
  async getAllVouchesForSubject(subjectProfileId: number): Promise<Vouch[]> {
    const vouchCount = await this.ethosVouch.vouchesCountForSubjectProfileId(subjectProfileId);
    const batchSize = 100;
    const allVouches: Vouch[] = [];

    for (let fromIdx = 0; fromIdx < vouchCount; fromIdx += batchSize) {
      const maxLength = Math.min(batchSize, vouchCount - fromIdx);
      const vouchBatch = await this.ethosVouch.vouchesForSubjectProfileIdInRange(
        subjectProfileId,
        fromIdx,
        maxLength,
      );
      allVouches.push(...vouchBatch);
    }

    return allVouches;
  }

  /**
   * Get all vouches made by an author.
   * @param authorProfileId The profile ID of the author.
   * @returns An array of all Vouch objects made by the author.
   */
  async getAllVouchesByAuthor(authorProfileId: number): Promise<Vouch[]> {
    const vouchCount = await this.ethosVouch.vouchesCountByAuthor(authorProfileId);
    const batchSize = 100;
    const allVouches: Vouch[] = [];

    for (let fromIdx = 0; fromIdx < vouchCount; fromIdx += batchSize) {
      const maxLength = Math.min(batchSize, vouchCount - fromIdx);
      const vouchBatch = await this.ethosVouch.vouchesByAuthorInRange(
        authorProfileId,
        fromIdx,
        maxLength,
      );
      allVouches.push(...vouchBatch);
    }

    return allVouches;
  }

  /**
   * Vouches for profile Id.
   * @param subjectProfileId Subject profile Id.
   * @param paymentToken Payment token address.
   * @param paymentAmount Payment amount in wei. Must be equal to msg.value for native token.
   */
  async vouchByProfileId(
    subjectProfileId: ProfileId,
    paymentToken: Address,
    paymentAmount: string,
    comment?: string,
    metadata?: string,
  ): ReturnType<EthosVouch['vouchByProfileId']> {
    return await this.ethosVouch.vouchByProfileId(
      subjectProfileId,
      paymentToken,
      paymentAmount,
      comment,
      metadata,
    );
  }

  /**
   * Vouches for address.
   * @param voucheeAddress Vouchee address.
   * @param paymentToken Payment token address.
   * @param paymentAmount Payment amount in wei. Must be equal to msg.value for native token.
   */
  async vouchByAddress(
    subjectAddress: Address,
    paymentToken: Address,
    paymentAmount: string,
    comment?: string,
    metadata?: string,
  ): ReturnType<EthosVouch['vouchByAddress']> {
    return await this.ethosVouch.vouchByAddress(
      subjectAddress,
      paymentToken,
      paymentAmount,
      comment,
      metadata,
    );
  }

  /**
   * Get the balance of a vouch (excluding exit fees)
   * @param vouchId The ID of the vouch
   * @returns The redeemable balance in the underlying asset
   */
  async getBalanceByVouchId(vouchId: number): Promise<bigint> {
    return await this.ethosVouch.getBalanceByVouchId(vouchId);
  }

  /**
   * Get the withdrawable assets of a vouch (including exit fees)
   * @param vouchId The ID of the vouch
   * @returns The amount of withdrawable assets in the underlying asset, including exit fees
   */
  async getWithdrawableAssetsByVouchId(vouchId: number): Promise<bigint> {
    return await this.ethosVouch.getWithdrawableAssetsByVouchId(vouchId);
  }

  /**
   * Unvouch
   */
  async unvouch(...args: Parameters<EthosVouch['unvouch']>): ReturnType<EthosVouch['unvouch']> {
    return await this.ethosVouch.unvouch(...args);
  }

  /**
   * Unvouch and mark it as unhealthy.
   */
  async unvouchUnhealthy(
    ...args: Parameters<EthosVouch['unvouchUnhealthy']>
  ): ReturnType<EthosVouch['unvouchUnhealthy']> {
    return await this.ethosVouch.unvouchUnhealthy(...args);
  }

  /**
   * VOTE METHODS
   */

  /**
   * Votes for a target contract with a target id.
   */
  async voteFor(...args: Parameters<EthosVote['voteFor']>): ReturnType<EthosVote['voteFor']> {
    return await this.ethosVote.voteFor(...args);
  }

  /**
   * Gets vote by id.
   */
  async getVoteById(
    ...args: Parameters<EthosVote['getVoteById']>
  ): ReturnType<EthosVote['getVoteById']> {
    return await this.ethosVote.getVoteById(...args);
  }

  /**
   * DISCUSSION METHODS
   */

  /**
   * Adds a reply to a target contract with a target id.
   */
  async addReply(
    ...args: Parameters<EthosDiscussion['addReply']>
  ): ReturnType<EthosDiscussion['addReply']> {
    return await this.ethosDiscussion.addReply(...args);
  }

  /**
   * Adds a reply to a target contract with a target id.
   */
  async repliesById(
    ...args: Parameters<EthosDiscussion['repliesById']>
  ): ReturnType<EthosDiscussion['repliesById']> {
    return await this.ethosDiscussion.repliesById(...args);
  }

  /**
   * ESCROW METHODS
   */

  /**
   * Withdraws vouch incentive rewards (ERC20 tokens or native ETH) from escrow back to a specified receiver.
   * Receiver must be an address registered to the profile that can claim these rewards.
   * @param token The address of the token to withdraw. (see: ESCROW_TOKEN_ADDRESS)
   * @param receiver The address where the tokens will be sent.
   * @param amount The amount of tokens/eth to withdraw
   * @returns Transaction response.
   */
  async withdrawFromEscrow(
    ...args: Parameters<EthosEscrow['withdraw']>
  ): ReturnType<EthosEscrow['withdraw']> {
    return await this.ethosEscrow.withdraw(...args);
  }

  /**
   * Returns the balance of a given token for a specified profile in the escrow.
   * @param profileId ID of the profile to check the balance for.
   * @param token The token address to check the balance of. (see: ESCROW_TOKEN_ADDRESS)
   * @returns Balance information including profileId, token, and balance.
   */
  async getEscrowBalance(
    ...args: Parameters<EthosEscrow['balanceOf']>
  ): ReturnType<EthosEscrow['balanceOf']> {
    return await this.ethosEscrow.balanceOf(...args);
  }

  /**
   * Fetches all protocol-related fees from the Vault Manager.
   *
   * @returns Fees information including:
   * - entryProtocolFeeBasisPoints: Fee applied when entering the protocol.
   * - exitFeeBasisPoints: Fee applied when exiting the protocol.
   * - entryDonationFeeBasisPoints: Fee allocated for donations.
   * - entryVouchersPoolFeeBasisPoints: Fee applied to the vouchers pool when entering.
   */
  async getAllFees(): Promise<Fees> {
    const [
      entryProtocolFeeBasisPoints,
      exitFeeBasisPoints,
      entryDonationFeeBasisPoints,
      entryVouchersPoolFeeBasisPoints,
    ] = await Promise.all([
      this.ethosVaultManager.getEntryProtocolFeeBasisPoints(),
      this.ethosVaultManager.getExitFeeBasisPoints(),
      this.ethosVaultManager.getEntryDonationFeeBasisPoints(),
      this.ethosVaultManager.getEntryVouchersPoolFeeBasisPoints(),
    ]);

    return {
      entryProtocolFeeBasisPoints,
      exitFeeBasisPoints,
      entryDonationFeeBasisPoints,
      entryVouchersPoolFeeBasisPoints,
    };
  }

  /**
   * HELPER METHODS
   */

  parseError(error: any): ErrorDescription | null {
    if (!isCallException(error) || !error.data) {
      return null;
    }

    const contractAddress = error.transaction.to;

    if (!contractAddress || !isAddress(contractAddress)) {
      return null;
    }

    const parserLookup: Record<Address, typeof Interface.prototype.parseError> = {
      [this.contractLookup.attestation.address]: (data: BytesLike) =>
        this.ethosAttestation.contract.interface.parseError(data),
      [this.contractLookup.discussion.address]: (data: BytesLike) =>
        this.ethosDiscussion.contract.interface.parseError(data),
      [this.contractLookup.profile.address]: (data: BytesLike) =>
        this.ethosProfile.contract.interface.parseError(data),
      [this.contractLookup.review.address]: (data: BytesLike) =>
        this.ethosReview.contract.interface.parseError(data),
      [this.contractLookup.vote.address]: (data: BytesLike) =>
        this.ethosVote.contract.interface.parseError(data),
      [this.contractLookup.vouch.address]: (data: BytesLike) =>
        this.ethosVouch.contract.interface.parseError(data),
      [this.contractLookup.reputationMarket.address]: (data: BytesLike) =>
        this.reputationMarket.contract.interface.parseError(data),
    };

    if (!parserLookup[contractAddress]) {
      return null;
    }

    return parserLookup[contractAddress](error.data);
  }

  /**
   * Wraps a blockchain action in human readable error messages! No more hex strings!
   *
   * Use this anywhere you're seeing: execution reverted (unknown custom error)
   *
   * This method executes the provided action and catches any errors that occur.
   * If the error is a blockchain-specific error that can be parsed, it wraps it
   * in a BlockchainError. Otherwise, it rethrows the original error.
   *
   * @template T The return type of the action.
   * @param action A function that performs a blockchain operation and returns a promise.
   * @returns A promise that resolves with the result of the action.
   * @throws {BlockchainError} If a blockchain-specific error occurs and can be parsed.
   * @throws The original error if it cannot be parsed as a blockchain-specific error.
   *
   * @example
   * ```typescript
   * const result = await blockchainManager.wrapChainErr(async () => {
   *   return await someBlockchainOperation();
   * });
   * ```
   */
  async wrapChainErr<T>(action: () => Promise<T>): Promise<T> {
    try {
      const result = await action();

      return result;
    } catch (error) {
      const parsedError = this.parseError(error);

      if (parsedError) {
        throw new BlockchainError(parsedError);
      }

      throw error;
    }
  }
}
