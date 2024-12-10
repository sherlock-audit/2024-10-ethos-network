import { type Request, type Response } from 'express';
import { UpdateUserFCMTokenService } from '../services/firebase-cloud-messeging/update-user-fcm-token.service.js';
import { Route } from './route.base.js';

export class FirebaseCloudMessaging extends Route {
  async updateUserFCMToken(req: Request, res: Response): Promise<void> {
    void this.initService(UpdateUserFCMTokenService, {
      ...req.body,
      userAgent: req.headers['user-agent'],
    }).run(req, res);
  }
}
