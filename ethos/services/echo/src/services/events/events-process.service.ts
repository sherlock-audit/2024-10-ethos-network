import { type BlockchainEvent } from '@prisma-pg/client';
import { type TransactionReceipt } from 'ethers';
import { z } from 'zod';
import { blockchainManager } from '../../common/blockchain-manager.js';
import { spotProcessEvent } from '../../contract-events/index.js';
import { prisma } from '../../data/db.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const schema = z.object({
  txHash: validators.transactionHash,
});

type Input = z.infer<typeof schema>;
type Output = {
  success: boolean;
  transaction: TransactionReceipt | null;
  event: BlockchainEvent | null;
};

export class EventsProcessService extends Service<typeof schema, Output> {
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
