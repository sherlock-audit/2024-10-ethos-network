import { type Request, type Response } from 'express';
import { FeesInfoService } from '../services/fees/fees-info.service.js';
import { Route } from './route.base.js';

export class Fees extends Route {
  async info(req: Request, res: Response): Promise<void> {
    void this.initService(FeesInfoService).run(req, res);
  }
}
