import { type Request, type Response } from 'express';
import { VouchCount } from '../services/vouch/count.service';
import { MostCredibleVouchers } from '../services/vouch/most-credible-vouchers.service';
import { MutualVouchers } from '../services/vouch/mutual-vouchers.service';
import { VouchQuery } from '../services/vouch/query.service';
import { VouchRewards } from '../services/vouch/rewards.service';
import { VouchStats } from '../services/vouch/stats.service';
import { VouchedEthereum } from '../services/vouch/vouched-ethereum.service';
import { Route } from './route.base';

export class Vouch extends Route {
  async query(req: Request, res: Response): Promise<void> {
    void this.initService(VouchQuery, req.body).run(req, res);
  }

  async count(req: Request, res: Response): Promise<void> {
    void this.initService(VouchCount, req.body).run(req, res);
  }

  async stats(req: Request, res: Response): Promise<void> {
    void this.initService(VouchStats, req.body).run(req, res);
  }

  async vouchedEthereum(req: Request, res: Response): Promise<void> {
    void this.initService(VouchedEthereum, req.body).run(req, res);
  }

  async mostCredibleVouchers(req: Request, res: Response): Promise<void> {
    void this.initService(MostCredibleVouchers, req.body).run(req, res);
  }

  async mutualVouchers(req: Request, res: Response): Promise<void> {
    void this.initService(MutualVouchers, req.query).run(req, res);
  }

  async rewards(req: Request, res: Response): Promise<void> {
    void this.initService(VouchRewards, req.body).run(req, res);
  }
}
