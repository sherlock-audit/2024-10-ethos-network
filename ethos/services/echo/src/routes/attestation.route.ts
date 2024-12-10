import { type Request, type Response } from 'express';
import { AttestationQueryService } from '../services/attestation/attestation.service.js';
import { ExtendedAttestationsQueryService } from '../services/attestation/extended-attestations.service.js';
import { Route } from './route.base.js';

export class Attestation extends Route {
  async query(req: Request, res: Response): Promise<void> {
    void this.initService(AttestationQueryService, req.body).run(req, res);
  }

  async extendedQuery(req: Request, res: Response): Promise<void> {
    void this.initService(ExtendedAttestationsQueryService, req.body).run(req, res);
  }
}
