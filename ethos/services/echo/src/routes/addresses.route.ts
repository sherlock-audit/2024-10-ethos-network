import { type Request, type Response } from 'express';
import { ProfileAddressesService } from '../services/profile/profile-addresses.service.js';
import { Route } from './route.base.js';

export class Addresses extends Route {
  async getByTarget(req: Request, res: Response): Promise<void> {
    void this.initService(ProfileAddressesService, req.params).run(req, res);
  }
}
