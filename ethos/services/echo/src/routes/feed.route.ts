import { duration } from '@ethos/helpers';
import { type Request, type Response } from 'express';
import { FeedService } from '../services/activity/feed.service';
import { Route } from './route.base';

const CACHE_CONTROL_HEADER = 'Cache-Control';
const CACHE_CONTROL_VALUE = `max-age=${duration(1, 'minute').toSeconds()}`;

export class Feed extends Route {
  async query(req: Request, res: Response): Promise<void> {
    const headers = { [CACHE_CONTROL_HEADER]: CACHE_CONTROL_VALUE };
    void this.initService(FeedService, req.query).run(req, res, headers);
  }
}
