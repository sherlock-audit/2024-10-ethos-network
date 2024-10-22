import { type Request, type Response } from 'express';
import { ReplySummaryService } from '../services/reply/reply-summary-service';
import { ReplyQueryService } from '../services/reply/reply.service';
import { Route } from './route.base';

export class Reply extends Route {
  async query(req: Request, res: Response): Promise<void> {
    void this.initService(ReplyQueryService, req.body).run(req, res);
  }

  async summary(req: Request, res: Response): Promise<void> {
    void this.initService(ReplySummaryService, req.body).run(req, res);
  }
}
