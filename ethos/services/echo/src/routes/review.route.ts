import { type Request, type Response } from 'express';
import { ReviewCount } from '../services/review/count.service.js';
import { ReviewQuery } from '../services/review/query.service.js';
import { ReviewStats } from '../services/review/stats.service.js';
import { Route } from './route.base.js';

export class Review extends Route {
  async query(req: Request, res: Response): Promise<void> {
    void this.initService(ReviewQuery, req.body).run(req, res);
  }

  async stats(req: Request, res: Response): Promise<void> {
    void this.initService(ReviewStats, req.body).run(req, res);
  }

  async count(req: Request, res: Response): Promise<void> {
    void this.initService(ReviewCount, req.body).run(req, res);
  }
}
