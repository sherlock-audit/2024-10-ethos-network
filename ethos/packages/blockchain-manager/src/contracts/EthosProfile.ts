import { type ContractLookup, TypeChain } from '@ethos/contracts';
import { isValidAddress } from '@ethos/helpers';
import { toNumber, type ContractRunner, type ContractTransactionResponse } from 'ethers';
import { isAddressEqual, zeroAddress, type Address, isAddress, getAddress } from 'viem';
import { type Profile, type ProfileId } from '../types';

export class EthosProfile {
  public readonly address: Address;
  public readonly contractRunner: ContractRunner;
  public readonly contract: TypeChain.ProfileAbi;

  constructor(runner: ContractRunner, contractLookup: ContractLookup) {
    this.address = contractLookup.profile.address;
    this.contractRunner = runner;
    this.contract = TypeChain.ProfileAbi__factory.connect(this.address, runner);
  }

  /**
   * Invites an address to create an Ethos profile.
   * @param address Address to invite.
   * @returns Transaction response.
   */
  async inviteAddress(address: Address): Promise<ContractTransactionResponse> {
    return await this.contract.inviteAddress(address);
  }

  /**
   * Adds invites to a profile.
   * @param user Address of the profile to add invites to.
   * @param amount Quantity of invites to add to the profile.
   * @returns Transaction response.
   */
  async addInvites(user: Address, amount: number): Promise<ContractTransactionResponse> {
    return await this.contract.addInvites(user, amount);
  }

  /**
   * Revokes invitation of an address to create an Ethos profile.
   * @param address Address to invite.
   * @returns Transaction response.
   */
  async uninviteUser(address: Address): Promise<ContractTransactionResponse> {
    return await this.contract.uninviteUser(address);
  }

  /**
   * Creates a new Ethos profile for the sender.
   * @param inviterId profileID of the account that is inviting the new user
   * @returns Transaction response.
   */
  async createProfile(inviterId: ProfileId): Promise<ContractTransactionResponse> {
    return await this.contract.createProfile(inviterId);
  }

  /**
   * Archives an ethos profile.
   * @returns Transaction response.
   */
  async archiveProfile(): Promise<ContractTransactionResponse> {
    return await this.contract.archiveProfile();
  }

  /**
   * Restores an ethos profile.
   * @returns Transaction response.
   */
  async restoreProfile(): Promise<ContractTransactionResponse> {
    return await this.contract.restoreProfile();
  }

  /**
   * Registers an address to an Ethos profile.
   * @returns Transaction response.
   */
  async registerAddress(
    address: Address,
    id: ProfileId,
    randValue: number,
    signature: string,
  ): Promise<ContractTransactionResponse> {
    return await this.contract.registerAddress(address, id, randValue, signature);
  }

  /**
   * Deletes an address from an Ethos profile.
   * @param index Index of the address to delete.
   * @returns Transaction response.
   */
  async deleteAddressAtIndex(index: number): Promise<ContractTransactionResponse> {
    return await this.contract.deleteAddressAtIndex(index);
  }

  /**
   * Checks if an address is compromised.
   * @returns True if the address is compromised, false otherwise.
   */
  async checkIsAddressCompromised(address: Address): Promise<boolean> {
    return await this.contract.checkIsAddressCompromised(address);
  }

  /**
   * Retrieve a profile from smart contract by id
   * @param id Profile id.
   * @returns Basic profile information, minus address information (see addressesForProfile)
   */
  async profile(id: ProfileId): Promise<Omit<Profile, 'addresses' | 'primaryAddress'> | null> {
    if (id < 0) return null;
    const { archived, profileId, createdAt, inviteInfo } = await this.contract.getProfile(id);

    return {
      archived,
      id: toNumber(profileId),
      createdAt: toNumber(createdAt),
      inviteInfo: {
        sent: inviteInfo.sent.map((address) => getAddress(address)),
        acceptedIds: inviteInfo.acceptedIds.map(toNumber),
        available: toNumber(inviteInfo.available),
        invitedBy: toNumber(inviteInfo.invitedBy),
      },
    };
  }

  /**
   * @param id Profile id.
   * @returns Addresses for profile.
   */
  async addressesForProfile(id: ProfileId): Promise<Address[]> {
    if (id < 0) return [];
    const addresses = await this.contract.addressesForProfile(id);

    return addresses.map((address) => getAddress(address));
  }

  /**
   * Gets verified profile id for address.
   * @param address Address to be checked.
   * @returns Profile id.
   */
  async verifiedProfileIdForAddress(address: Address): Promise<number> {
    if (!isAddress(address)) return 0;
    if (isAddressEqual(address, zeroAddress)) return 0;
    const id = await this.contract.verifiedProfileIdForAddress(address);

    return toNumber(id);
  }

  /**
   * @param id Profile id.
   * @returns Basic profile information and associated addresses.
   */
  async getProfile(id: number): Promise<Profile | null> {
    if (id < 0) return null;
    const [profileData, addresses] = await Promise.all([
      this.profile(id),
      this.addressesForProfile(id),
    ]);

    if (!profileData) return null;

    const { archived, createdAt, inviteInfo } = profileData;

    const profile: Profile = {
      archived,
      id: toNumber(id),
      addresses,
      primaryAddress: addresses[0],
      createdAt,
      inviteInfo,
    };

    return profile;
  }

  /**
   * @returns Basic profile information and associated addresses.
   */
  async getProfileByAddress(address: Address): Promise<Profile | null> {
    if (!isAddress(address)) return null;
    if (isAddressEqual(address, zeroAddress)) return null;
    try {
      const status = await this.getProfileStatusByAddress(address);

      if (status.profileId === 0) {
        return null;
      }

      return await this.getProfile(status.profileId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Retrieves the unix timestamp for the time an invitation was sent
   * @param sender - The ProfileId of the account that sent the invitation.
   * @param recipient - The address where the invitation was sent.
   * @returns The unix timestamp of when the invitation was sent, or 0 if no such invitation exists.
   */
  async getInvitationSentTime(sender: ProfileId, recipient: Address): Promise<number> {
    if (sender < 0) return 0;
    if (!isValidAddress(recipient)) return 0;
    const sentAt = await this.contract.sentAt(sender, recipient);

    return toNumber(sentAt);
  }

  /**
   * Invites multiple addresses to create Ethos profiles in a single transaction.
   * @param addresses Array of addresses to invite.
   * @returns Transaction response.
   */
  async bulkInviteAddresses(addresses: Address[]): Promise<ContractTransactionResponse> {
    return await this.contract.bulkInviteAddresses(addresses);
  }

  /**
   * Gets the total number of profiles created.
   * @returns The total number of profiles.
   */
  async getProfileCount(): Promise<number> {
    const count = await this.contract.profileCount();

    return toNumber(count);
  }

  /**
   * Returns array of addresses that have pending invites for given profileId
   * @param profileId Profile id.
   * @returns Array of addresses with pending invites.
   */
  async sentInvitationsForProfile(profileId: ProfileId): Promise<Address[]> {
    if (profileId <= 0) return [];
    const sentInvitations = await this.contract.sentInvitationsForProfile(profileId);

    return sentInvitations.map((address) => getAddress(address));
  }

  /**
   * Gets the profile status by ID.
   * @param profileId The ID of the profile.
   * @returns An object containing verified, archived, and mock status.
   */
  async getProfileStatusById(
    profileId: ProfileId,
  ): Promise<{ verified: boolean; archived: boolean; mock: boolean }> {
    const [verified, archived, mock] = await this.contract.profileStatusById(profileId);

    return { verified, archived, mock };
  }

  /**
   * Gets the profile status by address.
   * @param address The address to check.
   * @returns An object containing verified, archived, mock status, and profileId.
   */
  async getProfileStatusByAddress(
    address: Address,
  ): Promise<{ verified: boolean; archived: boolean; mock: boolean; profileId: number }> {
    const [verified, archived, mock, profileId] =
      await this.contract.profileStatusByAddress(address);

    return { verified, archived, mock, profileId: toNumber(profileId) };
  }
}
