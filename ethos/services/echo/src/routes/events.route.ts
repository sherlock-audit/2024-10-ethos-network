import { type Request, type Response } from 'express';
import { EventsService } from '../services/events/events.service';
import { Route } from './route.base';

export class Events extends Route {
  async processEvent(req: Request, res: Response): Promise<void> {
    void this.initService(EventsService, req.query).run(req, res);
  }
}
