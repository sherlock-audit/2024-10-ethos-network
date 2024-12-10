import { type BlockchainManager } from '@ethos/blockchain-manager';
import { type Logger } from '@ethos/logger';
import { type Request } from 'express';
import { type Constructor } from 'type-fest';
import { type z } from 'zod';
import { blockchainManager } from '../common/blockchain-manager.js';
import { metrics } from '../common/metrics.js';
import { ServiceError } from './service.error.js';
import { type AnyRecord } from './service.types.js';

const validationErrorCounter = metrics.makeCounter({
  name: 'validation_error_counter',
  help: 'Service validation error counter',
  labelNames: ['service'],
});

type Context = Request['context'];

export abstract class Service<TInput extends z.ZodTypeAny, TOutput extends AnyRecord | undefined> {
  protected logger: Logger;
  protected headers: Record<string, string> = {};
  protected _context: Context;

  constructor({ logger, context }: { logger: Logger; context: Context }) {
    this.logger = logger;
    this._context = context;
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

  /**
   * Get the context object or a specific field from the context.
   */
  protected context(): Context;
  protected context<T extends keyof Context>(field: T): Context[T];
  protected context(key?: keyof Context): unknown {
    if (key) {
      return this._context[key];
    }

    return this._context;
  }

  async run(params?: z.input<TInput>): Promise<TOutput> {
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
  protected useService<T extends Service<any, AnyRecord | undefined>>(
    ServiceClass: Constructor<T, ConstructorParameters<typeof Service>>,
  ): T {
    return new ServiceClass({
      context: this.context(),
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
