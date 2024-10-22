import { type Request, type Response } from 'express';
import { TwitterUserSearch } from '../services/twitter/user-search.service';
import { TwitterUser } from '../services/twitter/user.service';
import { Route } from './route.base';

export class Twitter extends Route {
  async user(req: Request, res: Response): Promise<void> {
    void this.initService(TwitterUser, req.query).run(req, res);
  }

  async search(req: Request, res: Response): Promise<void> {
    void this.initService(TwitterUserSearch, req.query).run(req, res);
  }
}
