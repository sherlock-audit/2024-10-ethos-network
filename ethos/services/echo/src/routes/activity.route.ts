import { type Request, type Response } from 'express';
import { ActorLookup } from '../services/activity/activity-actor.service';
import { ActivityService } from '../services/activity/activity.service';
import { BulkActorsLookup } from '../services/activity/bulk.activity-actors.service';
import { BulkActivityService } from '../services/activity/bulk.activity.service';
import { BulkVotesService } from '../services/activity/bulk.votes';
import { InvitesAcceptedService } from '../services/activity/invites-accepted.service';
import { RecentActivityService } from '../services/activity/recent.activity.service';
import { Route } from './route.base';

export class Activity extends Route {
  // get a single activity
  async getActivity(req: Request, res: Response): Promise<void> {
    void this.initService(ActivityService, {
      ...req.params,
      ...req.body,
    }).run(req, res);
  }

  // get a list of activities by ids and types
  async getActivities(req: Request, res: Response): Promise<void> {
    void this.initService(BulkActivityService, req.body).run(req, res);
  }

  // get all recent activities filtered by type, users, authorship
  async getRecentActivities(req: Request, res: Response): Promise<void> {
    void this.initService(RecentActivityService, req.body).run(req, res);
  }

  // get name, avatar, score, etc for either subject/author of an activity
  async getActor(req: Request, res: Response): Promise<void> {
    void this.initService(ActorLookup, { ...req.params, ...req.body }).run(req, res);
  }

  // get name, avatar, score, etc for either subject/author of an activity
  async getBulkActors(req: Request, res: Response): Promise<void> {
    void this.initService(BulkActorsLookup, req.body).run(req, res);
  }

  // get the votes placed by a user for many activities
  async getVotes(req: Request, res: Response): Promise<void> {
    void this.initService(BulkVotesService, req.body).run(req, res);
  }

  // get the invites accepted by a user
  async getInvitesAcceptedBy(req: Request, res: Response): Promise<void> {
    void this.initService(InvitesAcceptedService, { ...req.params, ...req.query }).run(req, res);
  }
}
