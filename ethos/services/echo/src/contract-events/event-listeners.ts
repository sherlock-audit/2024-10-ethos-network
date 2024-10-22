import { type CancelListener } from '@ethos/blockchain-manager';
import { blockchainManager } from '../common/blockchain-manager';
import { rootLogger } from '../common/logger';
import { handleEthosEvent } from '.';

const logger = rootLogger.child({ module: 'contract-listener' });

export class ContractEventListeners {
  private readonly listeners: CancelListener[] = [];

  async start(): Promise<void> {
    const cancelListeners: CancelListener[] = await this.listenToEthosEvents();
    logger.info('contract-events.listeners.started');
    this.listeners.push(...cancelListeners);
  }

  async stop(): Promise<void> {
    await Promise.all(
      this.listeners.map(async (cancel) => {
        await cancel();
      }),
    );

    this.listeners.length = 0;
  }

  /**
   * Listens to Ethos contract events and stores them in the blockchainEvent table
   * then immediately triggers the associated event processor
   * @returns An array of functions, each of which cancels a specific event listener.
   */
  private async listenToEthosEvents(): Promise<CancelListener[]> {
    const cancelListeners: Record<string, CancelListener> =
      await blockchainManager.onEthosEvent(handleEthosEvent);

    return Object.values(cancelListeners);
  }
}
