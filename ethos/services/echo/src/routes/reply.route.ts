import { type Request, type Response } from 'express';
import { ReplySummaryService } from '../services/reply/reply-summary-service.js';
import { ReplyQueryService } from '../services/reply/reply.service.js';
import { Route } from './route.base.js';

export class Reply extends Route {
  async query(req: Request, res: Response): Promise<void> {
    void this.initService(ReplyQueryService, req.body).run(req, res);
  }

  async summary(req: Request, res: Response): Promise<void> {
    void this.initService(ReplySummaryService, req.body).run(req, res);
  }
}
