import { type Request, type Response } from 'express';
import { HighestScoringActorsService } from '../services/score/highest-scores-actors.service.js';
import { ScoreHistoryService } from '../services/score/score-history.service.js';
import { ScoreSimulationService } from '../services/score/score-simulation.service.js';
import { ScoreService } from '../services/score/score.service.js';
import { Route } from './route.base.js';

export class Score extends Route {
  async getScore(req: Request, res: Response): Promise<void> {
    void this.initService(ScoreService, { ...req.params, ...req.query }).run(req, res);
  }

  async simulate(req: Request, res: Response): Promise<void> {
    void this.initService(ScoreSimulationService, { ...req.body }).run(req, res);
  }

  async getScoreHistory(req: Request, res: Response): Promise<void> {
    void this.initService(ScoreHistoryService, { ...req.params, ...req.query }).run(req, res);
  }

  async getHighestScoringActors(req: Request, res: Response): Promise<void> {
    void this.initService(HighestScoringActorsService, req.query).run(req, res);
  }
}
