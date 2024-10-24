import { type ProfileId } from '@ethos/blockchain-manager';
import { type Address } from 'viem';

/**
 * A lightweight Ethos profile reference without any additional data.
 * Prefer using this type by default & perform additional queries for invites,
 * attestations, and events.
 */
export type LiteProfile = {
  id: ProfileId;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
  invitesAvailable: number;
  invitedBy: number;
};

export type ProfileAddresses = {
  profileId?: ProfileId;
  primaryAddress: Address;
  allAddresses: Address[];
};
