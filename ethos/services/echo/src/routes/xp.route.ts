import { type Request, type Response } from 'express';
import { XpHistoryService } from '../services/xp/xp-history.service.js';
import { Route } from './route.base.js';

export class XpRoute extends Route {
  async xpHistory(req: Request, res: Response): Promise<void> {
    void this.initService(XpHistoryService, { ...req.params, ...req.query }).run(req, res);
  }
}
