import { ethers } from 'hardhat';
import { type Address, zeroAddress } from 'viem';

export const MAX_TOTAL_FEES = 10000n;

export const DEFAULT = {
  COMMENT: 'default comment',
  METADATA: '{ "someKey": "someValue" }',
  ZERO_ADDRESS: ethers.ZeroAddress,
  ETH_TOKEN: ethers.ZeroAddress,
  SERVICE_X: 'x.com',
  SERVICE_FB: 'fb.com',
  ACCOUNT_NAME_NASA: 'nasa',
  ACCOUNT_NAME_EXAMPLE: 'example',
  ATTESTATION_EVIDENCE_0: 'ATTESTATION_EVIDENCE_0',
  ATTESTATION_EVIDENCE_1: 'ATTESTATION_EVIDENCE_1',
  ATTESTATION_HASH: '0x0000000000000000000000000000000000000000000000000000000000000000',
  ESCROW_TOKEN_ADDRESS: `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`,
  PAYMENT_TOKEN: zeroAddress,
  PAYMENT_AMOUNT: ethers.parseEther('0.1'),
  PROVIDER: ethers.provider,
};

export type VouchParams = {
  paymentToken?: Address;
  paymentAmount?: bigint;
  comment?: string;
  metadata?: string;
};
export const VOUCH_PARAMS = {
  paymentToken: DEFAULT.PAYMENT_TOKEN,
  paymentAmount: DEFAULT.PAYMENT_AMOUNT,
  comment: DEFAULT.COMMENT,
  metadata: DEFAULT.METADATA,
};

export type ReviewParams = {
  score?: number;
  comment?: string;
  metadata?: string;
  address?: string;
  attestationDetails?: { account: string; service: string };
};
export const REVIEW_PARAMS = {
  score: 2,
  comment: 'Great user!',
  metadata: '{"description": "😻"}',
  address: zeroAddress,
  attestationDetails: { account: '', service: '' },
};
