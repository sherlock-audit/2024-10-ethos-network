import { type ProfileId } from '@ethos/blockchain-manager';

/** The display information for a Market User */
export type MarketUser = {
  address: string;
  avatarUrl: string;
  username: string;
  name: string;
  createdDate?: Date;
  ethosInfo: {
    profileId?: ProfileId;
    score: number;
  };
};
