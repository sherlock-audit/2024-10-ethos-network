import { type Request, type Response } from 'express';
import { InvitationQuery } from '../services/invitations/invitation.service.js';
import { PendingInvitations } from '../services/invitations/pending-invitations.service.js';
import { Route } from './route.base.js';

export class InvitationRoute extends Route {
  async query(req: Request, res: Response): Promise<void> {
    void this.initService(InvitationQuery, req.body).run(req, res);
  }

  async pending(req: Request, res: Response): Promise<void> {
    void this.initService(PendingInvitations, req.params).run(req, res);
  }
}
