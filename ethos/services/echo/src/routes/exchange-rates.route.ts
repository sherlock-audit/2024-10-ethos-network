import { type Request, type Response } from 'express';
import { EthPriceService } from '../services/exchange-rates/EthPriceService.js';
import { Route } from './route.base.js';

export class ExchangeRates extends Route {
  async getEthPriceInUSD(req: Request, res: Response): Promise<void> {
    void this.initService(EthPriceService, req.params).run(req, res);
  }
}
