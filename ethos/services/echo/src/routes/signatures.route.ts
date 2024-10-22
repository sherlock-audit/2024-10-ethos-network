import { type Request, type Response } from 'express';
import { CreateAttestation } from '../services/signatures/create-attestation.service';
import { Route } from './route.base';

export class Signatures extends Route {
  async createAttestation(req: Request, res: Response): Promise<void> {
    void this.initService(CreateAttestation, req.body).run(req, res);
  }
}
