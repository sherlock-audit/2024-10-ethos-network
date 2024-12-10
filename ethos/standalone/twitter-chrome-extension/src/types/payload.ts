export type CredibilityScoreResponse = {
  success: boolean;
  score?: number;
  error?: string;
};

export type ConvertEnsToEthAddressResponse = {
  success: boolean;
  ethAddress?: string;
  error?: string;
};

export type ReviewDetailsResponse = {
  error?: string;
  success: boolean;
  reviewCount: number;
  positivePercentage: number;
};

export type VouchDetailsResponse = {
  profileId?: number;
  vouchCount: number;
  vouchedInUSD: number;
  success: boolean;
  error?: string;
};
