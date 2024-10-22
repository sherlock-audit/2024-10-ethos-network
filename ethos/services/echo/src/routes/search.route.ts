import { type Request, type Response } from 'express';
import { SearchService } from '../services/search/search.service';
import { Route } from './route.base';

export class SearchRoute extends Route {
  async search(req: Request, res: Response): Promise<void> {
    void this.initService(SearchService, req.query).run(req, res);
  }
}
