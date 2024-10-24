import { type Request, type Response } from 'express';
import { HighestScoringActorsService } from '../services/score/highest-scores-actors.service';
import { ScoreHistoryService } from '../services/score/score-history.service';
import { ScoreSimulationService } from '../services/score/score-simulation.service';
import { ScoreService } from '../services/score/score.service';
import { Route } from './route.base';

export class Score extends Route {
  async getScore(req: Request, res: Response): Promise<void> {
    void this.initService(ScoreService, req.params).run(req, res);
  }

  async getSimulation(req: Request, res: Response): Promise<void> {
    void this.initService(ScoreSimulationService, { ...req.params, ...req.query }).run(req, res);
  }

  async getElements(req: Request, res: Response): Promise<void> {
    void this.initService(ScoreService, req.params).run(req, res);
  }

  async getScoreHistory(req: Request, res: Response): Promise<void> {
    void this.initService(ScoreHistoryService, { ...req.params, ...req.query }).run(req, res);
  }

  async getHighestScoringActors(req: Request, res: Response): Promise<void> {
    void this.initService(HighestScoringActorsService, req.query).run(req, res);
  }
}
