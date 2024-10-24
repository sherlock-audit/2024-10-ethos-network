import { type Request, type Response } from 'express';
import { InvitationQuery } from '../services/invitations/invitation.service';
import { PendingInvitations } from '../services/invitations/pending-invitations.service';
import { Route } from './route.base';

export class InvitationRoute extends Route {
  async query(req: Request, res: Response): Promise<void> {
    void this.initService(InvitationQuery, req.body).run(req, res);
  }

  async pending(req: Request, res: Response): Promise<void> {
    void this.initService(PendingInvitations, req.params).run(req, res);
  }
}
