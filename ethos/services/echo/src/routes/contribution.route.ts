import { type Request, type Response } from 'express';
import { ContributionActionService } from '../services/contribution/action.service.js';
import { ContributionCreateService } from '../services/contribution/create.service.js';
import { ContributionDailyService } from '../services/contribution/daily.service.js';
import { ContributionQueryService } from '../services/contribution/query.service.js';
import { ContributionStatsService } from '../services/contribution/stats.service.js';
import { Route } from './route.base.js';

export class Contribution extends Route {
  async query(req: Request, res: Response): Promise<void> {
    void this.initService(ContributionQueryService, { ...req.params, ...req.query }).run(req, res);
  }

  async stats(req: Request, res: Response): Promise<void> {
    void this.initService(ContributionStatsService, { ...req.params, ...req.query }).run(req, res);
  }

  async action(req: Request, res: Response): Promise<void> {
    void this.initService(ContributionActionService, req.body).run(req, res);
  }

  async create(req: Request, res: Response): Promise<void> {
    void this.initService(ContributionCreateService, req.body).run(req, res);
  }

  async daily(req: Request, res: Response): Promise<void> {
    void this.initService(ContributionDailyService, req.body).run(req, res);
  }
}
