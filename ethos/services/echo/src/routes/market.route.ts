import { type Request, type Response } from 'express';
import { HoldingsByAddressService } from '../services/market/holdings-by-address.service.js';
import { HoldingsTotalByAddressService } from '../services/market/holdings-total-by-address.service.js';
import { MarketInfoBulkService } from '../services/market/market-bulk.service.js';
import { MarketHoldersService } from '../services/market/market-holders.service.js';
import { MarketInfoService } from '../services/market/market-info.service.js';
import { MarketPriceHistoryService } from '../services/market/market-price-history.service.js';
import { MarketSearchService } from '../services/market/market-search.service.js';
import {
  MarketActivityByAddressService,
  MarketTransactionHistoryService,
} from '../services/market/market-transactions.service.js';
import { VolumeTradedByAddressService } from '../services/market/volume-traded-by-address.service.js';
import { Route } from './route.base.js';

export class Market extends Route {
  async info(req: Request, res: Response): Promise<void> {
    void this.initService(MarketInfoService, req.params).run(req, res);
  }

  async bulkInfo(req: Request, res: Response): Promise<void> {
    void this.initService(MarketInfoBulkService, req.body).run(req, res);
  }

  async priceHistory(req: Request, res: Response): Promise<void> {
    void this.initService(MarketPriceHistoryService, { ...req.params, ...req.query }).run(req, res);
  }

  async txHistory(req: Request, res: Response): Promise<void> {
    const { limit = undefined, offset = undefined, ...rest } = { ...req.params, ...req.query };
    void this.initService(MarketTransactionHistoryService, {
      pagination: {
        limit,
        offset,
      },
      ...rest,
    }).run(req, res);
  }

  async txHistoryByAddress(req: Request, res: Response): Promise<void> {
    const { limit = undefined, offset = undefined, ...rest } = { ...req.params, ...req.query };
    void this.initService(MarketActivityByAddressService, {
      pagination: {
        limit,
        offset,
      },
      ...rest,
    }).run(req, res);
  }

  async holders(req: Request, res: Response): Promise<void> {
    void this.initService(MarketHoldersService, { ...req.params, ...req.query }).run(req, res);
  }

  async search(req: Request, res: Response): Promise<void> {
    void this.initService(MarketSearchService, req.query).run(req, res);
  }

  async holdingsByAddress(req: Request, res: Response): Promise<void> {
    void this.initService(HoldingsByAddressService, { ...req.params, ...req.query }).run(req, res);
  }

  async holdingsTotalByAddress(req: Request, res: Response): Promise<void> {
    const { limit = undefined, offset = undefined, ...rest } = { ...req.params, ...req.query };
    void this.initService(HoldingsTotalByAddressService, {
      pagination: {
        limit,
        offset,
      },
      ...rest,
    }).run(req, res);
  }

  async volumeTradedByAddress(req: Request, res: Response): Promise<void> {
    void this.initService(VolumeTradedByAddressService, req.params).run(req, res);
  }
}
