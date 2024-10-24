export type BlockchainEvent = {
  id: number;
  blockIndex: number;
  blockNumber: number;
  contract: string;
  createdAt: number;
  processed: boolean;
  txHash: string;
  updatedAt: number;
};
