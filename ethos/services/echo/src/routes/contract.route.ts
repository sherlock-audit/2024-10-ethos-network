import { type Request, type Response } from 'express';
import { ContractService } from '../services/contracts/contract.service.js';
import { Route } from './route.base.js';

export class ContractRoute extends Route {
  async getContractAddresses(req: Request, res: Response): Promise<void> {
    void this.initService(ContractService, req.query).run(req, res);
  }
}
