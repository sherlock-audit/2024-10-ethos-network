import { type Request, type Response } from 'express';
import { OnboardingStatusService } from '../services/onboarding/onboarding-status.service';
import { Route } from './route.base';

export class Onboarding extends Route {
  async status(req: Request, res: Response): Promise<void> {
    void this.initService(OnboardingStatusService, { ...req.params, ...req.query }).run(req, res);
  }
}
