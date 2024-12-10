import { type Request, type Response } from 'express';
import { TwitterUserSearch } from '../services/twitter/user-search.service.js';
import { TwitterUser } from '../services/twitter/user.service.js';
import { Route } from './route.base.js';

export class Twitter extends Route {
  async user(req: Request, res: Response): Promise<void> {
    void this.initService(TwitterUser, req.query).run(req, res);
  }

  async search(req: Request, res: Response): Promise<void> {
    void this.initService(TwitterUserSearch, req.query).run(req, res);
  }
}
