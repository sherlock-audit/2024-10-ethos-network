import { type Request, type Response } from 'express';
import { CredibilityLeaderboardQuery } from '../services/profile/credibility-leaderboard.service.js';
import { ProfileAddressesService } from '../services/profile/profile-addresses.service.js';
import { ProfileQuery } from '../services/profile/profiles.service.js';
import { RecentProfilesQuery } from '../services/profile/recent-profiles.service.js';
import { XPLeaderboardQuery } from '../services/profile/xp-leaderboard.service.js';
import { Route } from './route.base.js';

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

  async credibilityLeaderboard(req: Request, res: Response): Promise<void> {
    void this.initService(CredibilityLeaderboardQuery, req.query).run(req, res);
  }

  async xpLeaderboard(req: Request, res: Response): Promise<void> {
    void this.initService(XPLeaderboardQuery, req.query).run(req, res);
  }
}
