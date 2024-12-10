import { type Request, type Response } from 'express';
import { EventsProcessService } from '../services/events/events-process.service.js';
import { Route } from './route.base.js';

export class Events extends Route {
  async processEvent(req: Request, res: Response): Promise<void> {
    void this.initService(EventsProcessService, req.query).run(req, res);
  }
}
