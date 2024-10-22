import { type Request, type Response } from 'express';
import { ProfileAddressesService } from '../services/profile/profile-addresses.service';
import { ProfileQuery } from '../services/profile/profiles.service';
import { RecentProfilesQuery } from '../services/profile/recent-profiles.service';
import { Route } from './route.base';

export class Profile extends Route {
  async query(req: Request, res: Response): Promise<void> {
    void this.initService(ProfileQuery, req.body).run(req, res);
  }

  async recent(req: Request, res: Response): Promise<void> {
    void this.initService(RecentProfilesQuery, req.body).run(req, res);
  }

  async addresses(req: Request, res: Response): Promise<void> {
    void this.initService(ProfileAddressesService, req.params).run(req, res);
  }
}
