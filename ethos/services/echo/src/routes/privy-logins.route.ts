import { type Request, type Response } from 'express';
import { CreatePrivyLogin } from '../services/privy-logins/create.service.js';
import { Route } from './route.base.js';

export class PrivyLogins extends Route {
  async create(req: Request, res: Response): Promise<void> {
    void this.initService(CreatePrivyLogin, {
      privyIdToken: req.headers['x-privy-id-token'],
    }).run(req, res);
  }
}
