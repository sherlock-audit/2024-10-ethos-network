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
  type TransactionReceipt,
  type Provider,
} from 'ethers';
import { isAddress, type Address } from 'viem';
import { ContractAddressManager } from './contracts/ContractAddressManager.js';
import { EthosAttestation } from './contracts/EthosAttestation.js';
import { EthosDiscussion } from './contracts/EthosDiscussion.js';
import { EthosProfile } from './contracts/EthosProfile.js';
import { EthosReview } from './contracts/EthosReview.js';
import { EthosVote } from './contracts/EthosVote.js';
import { EthosVouch } from './contracts/EthosVouch.js';
import { ReputationMarket } from './contracts/ReputationMarket.js';
import {
  type ContractRunnerConfig,
  formatMessageToSign,
  getContractRunner,
  getLogs,
  registerListener,
} from './contracts/utils.js';
import {
  type CancelListener,
  type AttestationService,
  type ProfileId,
  BlockchainError,
} from './types.js';

export class BlockchainManager {
  provider: Provider | null;
  ethosAttestation: EthosAttestation;
  ethosDiscussion: EthosDiscussion;
  ethosProfile: EthosProfile;
  ethosReview: EthosReview;
  ethosVote: EthosVote;
  ethosVouch: EthosVouch;
  reputationMarket: ReputationMarket;
  contractLookup: ContractLookup;
  contractAddressManager: ContractAddressManager;
  private readonly contractAddressLookup: Record<Address, Contract>;

  constructor(environment: EthosEnvironment, config: ContractRunnerConfig = {}) {
    const runner = getContractRunner(config);

    this.provider = runner.provider;

    this.contractLookup = getContractsForEnvironment(environment);

    this.ethosAttestation = new EthosAttestation(runner, this.contractLookup);
    this.ethosDiscussion = new EthosDiscussion(runner, this.contractLookup);
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
   * Creates a signature for creating an attestation by signing all parameters.
   * @param profileId Profile id. Use max uint for non-existing profile.
   * @param account Account address to register.
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
   * Retrieves a transaction receipt by its hash.
   * @param txHash - The transaction hash to look up
   * @returns An object containing the transaction receipt, which may be null if the transaction is not found
   * @throws {Error} If the provider is not available
   * @example
   * ```typescript
   * const { transaction } = await blockchainManager.getTransactionReceiptByHash("0x123...");
   * if (transaction) {
   *   console.log("Transaction was mined in block:", transaction.blockNumber);
   * }
   * ```
   */
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
