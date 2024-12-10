import { type ContractLookup, TypeChain } from '@ethos/contracts';
import { type ContractRunner, type ContractTransactionResponse, id, toNumber } from 'ethers';
import { type Address } from 'viem';
import { type Attestation, type AttestationService } from '../types.js';

export class EthosAttestation {
  public readonly address: Address;
  public readonly contractRunner: ContractRunner;
  public readonly contract: TypeChain.AttestationAbi;

  constructor(runner: ContractRunner, contractLookup: ContractLookup) {
    this.address = contractLookup.attestation.address;
    this.contractRunner = runner;
    this.contract = TypeChain.AttestationAbi__factory.connect(this.address, runner);
  }

  /**
   * Convenience function that hashes the service and account.
   * Used to match smart contract generated attestation hashes.
   * (compare to getServiceAndAccountHash)
   * @param service Service name. E.g., 'x.com'.
   * @param account Account name. E.g., '0x5f_capital'.
   * @returns attestationHash string
   */
  hash(service: string, account: string): string {
    // TODO - do we want a branded type for attestationHash?
    return id(service.toLowerCase() + account.toLowerCase());
  }

  /**
   * Creates a new attestation and links it to the current sender's profile.
   * @param profileId Profile id. Use max uint for non-existing profile.
   * @param randValue Random value.
   * @param attestationDetails Attestation details with service name and account.
   * @param evidence Evidence of attestation.
   * @param signature Signature of the attestation.
   * @returns Transaction response.
   */
  async createAttestation(
    profileId: number,
    randValue: number,
    attestationDetails: { account: string; service: AttestationService },
    evidence: string,
    signature: string,
  ): Promise<ContractTransactionResponse> {
    return await this.contract.createAttestation(
      profileId,
      randValue,
      attestationDetails,
      evidence,
      signature,
    );
  }

  /**
   * Archives attestation.
   * @param attestationHash Hash of the attestation.
   * @returns Transaction response.
   */
  async archiveAttestation(
    service: AttestationService,
    account: string,
  ): Promise<ContractTransactionResponse> {
    const attestationHash = this.hash(service, account);

    return await this.contract.archiveAttestation(attestationHash);
  }

  /**
   * @dev Restores attestation.
   * @param attestationHash Hash of the attestation.
   */
  async restoreAttestation(
    service: AttestationService,
    account: string,
  ): Promise<ContractTransactionResponse> {
    const attestationHash = this.hash(service, account);

    return await this.contract.restoreAttestation(attestationHash);
  }

  /**
   * Gets attestation details by hash.
   * @param hash Attestation hash.
   * @returns Attestation.
   */
  async attestationByHash(hash: string): Promise<Attestation> {
    const { attestationId, archived, profileId, createdAt, account, service } =
      await this.contract.attestationByHash(hash);

    return {
      id: toNumber(attestationId),
      hash,
      archived,
      profileId: toNumber(profileId),
      createdAt: toNumber(createdAt),
      account: account.toLowerCase(),
      service: service.toLowerCase() as AttestationService,
    };
  }

  /**
   * Gets attestation hashes by profile id.
   * @param profileId Profile id.
   * @returns Array of attestation hashes.
   */
  async getAttestationHashesByProfileId(profileId: number): Promise<string[]> {
    return await this.contract.getAttestationHashesByProfileId(profileId);
  }

  /**
   * Checks whether the attestation exists for provided hash.
   * @param hash The hash of the attestation.
   * @returns Whether the attestation exists.
   */
  async attestationExistsForHash(hash: string): Promise<boolean> {
    return await this.contract.attestationExistsForHash(hash);
  }
}
