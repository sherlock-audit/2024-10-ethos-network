import { type BlockchainManager } from '@ethos/blockchain-manager';
import { type Logger } from '@ethos/logger';
import { type Constructor } from 'type-fest';
import { type z } from 'zod';
import { blockchainManager } from '../common/blockchain-manager';
import { metrics } from '../common/metrics';
import { ServiceError } from './service.error';
import { type AnyRecord } from './service.types';

const validationErrorCounter = metrics.makeCounter({
  name: 'validation_error_counter',
  help: 'Service validation error counter',
  labelNames: ['service'],
});

export abstract class Service<TInput extends z.ZodTypeAny, TOutput extends AnyRecord> {
  protected logger: Logger;
  protected headers: Record<string, string> = {};

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
  }

  protected validator(params: any, schema: TInput): z.infer<TInput> {
    const result = schema.safeParse(params);

    if (result.success) {
      return result.data;
    }

    this.logger.info({ data: { errors: result.error.issues } }, 'Validation error');
    validationErrorCounter.inc({ service: this.constructor.name });

    throw ServiceError.BadRequest('Validation error', {
      code: 'VALIDATION_ERROR',
      fields: result.error.issues,
    });
  }

  protected abstract validate(params?: any): z.infer<TInput> | undefined;

  protected abstract execute(params?: z.infer<TInput>): Promise<TOutput>;

  async run(params?: z.infer<TInput>): Promise<TOutput> {
    if (!params) {
      return await this.execute();
    }

    const cleanParams = this.validate(params);

    return await this.execute(cleanParams);
  }

  /**
   * Allows to create an instance of a service within another service
   * without passing all the data to the constructor.
   * @param ServiceClass
   * @returns An instance of the service class
   */
  protected useService<T extends Service<any, AnyRecord>>(
    ServiceClass: Constructor<T, ConstructorParameters<typeof Service>>,
  ): T {
    return new ServiceClass({
      logger: this.logger,
    });
  }

  protected get blockchainManager(): BlockchainManager {
    return blockchainManager;
  }

  protected setHeader(key: string, value: string): void {
    this.headers[key] = value;
  }

  getHeaders(): Record<string, string> {
    return this.headers;
  }
}
