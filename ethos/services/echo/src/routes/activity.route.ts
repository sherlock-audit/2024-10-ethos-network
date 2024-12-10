import { type Request, type Response } from 'express';
import { ActorLookup } from '../services/activity/activity-actor.service.js';
import { ActivityService } from '../services/activity/activity.service.js';
import { BulkActorsLookup } from '../services/activity/bulk.activity-actors.service.js';
import { BulkActivityService } from '../services/activity/bulk.activity.service.js';
import { BulkVotesService } from '../services/activity/bulk.votes.service.js';
import { InvitesAcceptedService } from '../services/activity/invites-accepted.service.js';
import { UnifiedActivityService } from '../services/activity/unified-activity.service.js';
import { Route } from './route.base.js';

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

  async getUnifiedActivities(req: Request, res: Response): Promise<void> {
    void this.initService(UnifiedActivityService, req.body).run(req, res);
  }
}
