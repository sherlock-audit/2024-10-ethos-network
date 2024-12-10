import { type Request, type Response } from 'express';
import { RecentInteractionsService } from '../services/transactions/interactions.service.js';
import { RecentTransactionsService } from '../services/transactions/recent-transactions.service.js';
import { Route } from './route.base.js';

export class Transactions extends Route {
  async recent(req: Request, res: Response): Promise<void> {
    void this.initService(RecentTransactionsService, req.body).run(req, res);
  }

  async interactions(req: Request, res: Response): Promise<void> {
    void this.initService(RecentInteractionsService, req.body).run(req, res);
  }
}
