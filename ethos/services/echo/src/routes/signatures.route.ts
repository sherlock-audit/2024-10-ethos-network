import { type Request, type Response } from 'express';
import { CreateAttestation } from '../services/signatures/create-attestation.service.js';
import { RegisterAddress } from '../services/signatures/register-address.service.js';
import { Route } from './route.base.js';

export class Signatures extends Route {
  async createAttestation(req: Request, res: Response): Promise<void> {
    void this.initService(CreateAttestation, req.body).run(req, res);
  }

  async registerAddress(req: Request, res: Response): Promise<void> {
    void this.initService(RegisterAddress, req.body).run(req, res);
  }
}
