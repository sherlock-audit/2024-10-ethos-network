import { type ProfileId } from '@ethos/blockchain-manager';
import { type EthosUserTargetWithTwitterUsername } from '@ethos/domain';
import { notEmpty } from '@ethos/helpers';
import { type Address } from 'viem';

export type InvalidateAllOption = {
  invalidateAll: boolean;
};

export const INVALIDATE_ALL: InvalidateAllOption = {
  invalidateAll: true,
};

export const _keyGenerator = {
  byString(...keys: string[]) {
    return (name: string | InvalidateAllOption) => {
      if (name === INVALIDATE_ALL) {
        return keys;
      }

      return [...keys, name];
    };
  },

  byNumber(...keys: string[]) {
    return (id: number | InvalidateAllOption) => {
      if (id === INVALIDATE_ALL) {
        return keys;
      }

      return [...keys, id];
    };
  },

  byTarget(...keys: string[]) {
    return (target: EthosUserTargetWithTwitterUsername | InvalidateAllOption | null) => {
      if (target === null) {
        return [...keys, null];
      }
      if (target === INVALIDATE_ALL) {
        return keys;
      }
      if ('address' in target) {
        return [...keys, 'byAddress', target.address];
      }
      if ('service' in target && 'account' in target) {
        return [...keys, target.service.toLowerCase(), target.account.toLowerCase()];
      }
      if ('service' in target && 'username' in target) {
        return [...keys, target.service.toLowerCase(), target.username.toLowerCase()];
      }
      if ('profileId' in target) {
        return [...keys, 'byProfileId', target.profileId];
      }
      throw Error('Attempted to cache for invalid Ethos user');
    };
  },

  byAddress(...keys: string[]) {
    return (address: Address | InvalidateAllOption) => {
      if (address === INVALIDATE_ALL) {
        return keys;
      }

      return [...keys, address];
    };
  },

  byAddressPage(...keys: string[]) {
    return (address: Address | InvalidateAllOption, offset: number, limit: number) => {
      if (address === INVALIDATE_ALL) {
        return keys;
      }

      return [...keys, address, offset, limit];
    };
  },

  byAttestationPage(...keys: string[]) {
    return (attestation: string | InvalidateAllOption, offset: number, limit: number) => {
      if (attestation === INVALIDATE_ALL) {
        return keys;
      }

      return [...keys, attestation, offset, limit];
    };
  },

  byProfileIdPage(...keys: string[]) {
    return (profileId: ProfileId | InvalidateAllOption, offset: number, limit: number) => {
      if (profileId === INVALIDATE_ALL) {
        return keys;
      }

      return [...keys, profileId, offset, limit];
    };
  },

  byProfileId(...keys: string[]) {
    return (profileId: ProfileId | InvalidateAllOption) => {
      if (profileId === INVALIDATE_ALL) {
        return keys;
      }

      return [...keys, profileId];
    };
  },

  byTargetId(...keys: string[]) {
    return (target: string | InvalidateAllOption, id: number | string | InvalidateAllOption) => {
      if (target === INVALIDATE_ALL) {
        return keys;
      }
      if (id === INVALIDATE_ALL) {
        return [...keys, target];
      }

      return [...keys, target, id];
    };
  },

  byOptional(...keys: string[]) {
    return (arg: string | number | undefined | null | InvalidateAllOption) => {
      if (arg === INVALIDATE_ALL) {
        return keys;
      }

      return [...keys, arg].filter(notEmpty);
    };
  },
};
