import { type Request, type Response } from 'express';
import { EnsDetailsByAddressService } from '../services/ens/details-by-address.service';
import { EnsDetailsByNameService } from '../services/ens/details-by-name.service';
import { Route } from './route.base';

export class Ens extends Route {
  async getDetailsByAddress(req: Request, res: Response): Promise<void> {
    void this.initService(EnsDetailsByAddressService, req.params).run(req, res);
  }

  async getDetailsByName(req: Request, res: Response): Promise<void> {
    void this.initService(EnsDetailsByNameService, req.params).run(req, res);
  }
}
