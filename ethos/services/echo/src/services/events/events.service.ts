import { type BlockchainEvent } from '@prisma/client';
import { type TransactionReceipt } from 'ethers';
import { z } from 'zod';
import { blockchainManager } from '../../common/blockchain-manager';
import { spotProcessEvent } from '../../contract-events';
import { prisma } from '../../data/db';
import { Service } from '../service.base';
import { type AnyRecord } from '../service.types';
import { validators } from '../service.validator';

const schema = z.object({
  txHash: validators.transactionHash,
});

type Input = z.infer<typeof schema>;
type Output = {
  success: boolean;
  transaction: TransactionReceipt | null;
  event: BlockchainEvent | null;
};

export class EventsService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ txHash }: Input): Promise<Output> {
    const { transaction } = await blockchainManager.getTransactionReceiptByHash(txHash);

    const processSuccessful = await spotProcessEvent(txHash);

    const event = await prisma.blockchainEvent.findFirst({
      where: {
        txHash,
      },
    });

    return {
      success: processSuccessful,
      event,
      transaction,
    };
  }
}
