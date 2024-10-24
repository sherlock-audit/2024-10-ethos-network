import { type Request, type Response } from 'express';
import { MarketHoldersService } from '../services/market/market-holders.service';
import { MarketInfoService } from '../services/market/market-info.service';
import { MarketPriceHistoryService } from '../services/market/market-price-history.service';
import { MarketSearchService } from '../services/market/market-search.service';
import { MarketTransactionHistoryService } from '../services/market/market-transactions.service';
import { Route } from './route.base';

export class Market extends Route {
  async info(req: Request, res: Response): Promise<void> {
    void this.initService(MarketInfoService, req.params).run(req, res);
  }

  async priceHistory(req: Request, res: Response): Promise<void> {
    void this.initService(MarketPriceHistoryService, { ...req.params, ...req.query }).run(req, res);
  }

  async txHistory(req: Request, res: Response): Promise<void> {
    void this.initService(MarketTransactionHistoryService, { ...req.params }).run(req, res);
  }

  async holders(req: Request, res: Response): Promise<void> {
    void this.initService(MarketHoldersService, { ...req.params }).run(req, res);
  }

  async search(req: Request, res: Response): Promise<void> {
    void this.initService(MarketSearchService, req.query).run(req, res);
  }
}
