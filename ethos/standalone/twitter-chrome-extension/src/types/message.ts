/**
 * No need to include types.ts in content scripts because types will be ripped out in the build process
 */

type MessageWithHandle = {
  type:
    | 'FETCH_CREDIBILITY_SCORE_FROM_HANDLE'
    | 'FETCH_REVIEW_DETAILS_FROM_HANDLE'
    | 'FETCH_VOUCH_DETAILS_FROM_HANDLE';
  handle: string;
};

type MessageWithAddress = {
  type:
    | 'FETCH_CREDIBILITY_SCORE_FROM_ADDRESS'
    | 'FETCH_REVIEW_DETAILS_FROM_ADDRESS'
    | 'FETCH_VOUCH_DETAILS_FROM_ADDRESS';
  address: string;
};

type MessageWithENS = {
  type: 'CONVERT_ENS_TO_ETH_ADDRESS';
  ens: string;
};

export type HandlePayload = Omit<MessageWithHandle, 'type'>;
export type AddressPayload = Omit<MessageWithAddress, 'type'>;
export type ENSPayload = Omit<MessageWithENS, 'type'>;
export type Message = MessageWithHandle | MessageWithAddress | MessageWithENS;
