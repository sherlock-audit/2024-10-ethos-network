import { type Express } from 'express';
import { Activity } from './activity.route';
import { Addresses } from './addresses.route';
import { Attestation } from './attestation.route';
import { ContractRoute } from './contract.route';
import { Ens } from './ens.route';
import { Events } from './events.route';
import { ExchangeRates } from './exchange-rates.route';
import { Feed } from './feed.route';
import { Fees } from './fees.route';
import { deepCheck, healthCheck } from './healthcheck';
import { route } from './init.route';
import { InvitationRoute } from './invitation.route';
import { Market } from './market.route';
import { Onboarding } from './onboarding.route';
import { Profile } from './profile.route';
import { Reply } from './reply.route';
import { Review } from './review.route';
import { Score } from './score.route';
import { SearchRoute } from './search.route';
import { Signatures } from './signatures.route';
import { Transactions } from './transactions.route';
import { Twitter } from './twitter.route';
import { Vouch } from './vouch.route';

export function initRoutes(app: Express): void {
  app.get('/', healthCheck);
  app.get('/healthcheck', healthCheck);
  app.get('/deepcheck', deepCheck);

  // v0
  app.post('/api/signatures/create-attestation', route(Signatures, 'createAttestation'));
  app.get('/api/twitter/user', route(Twitter, 'user'));
  app.get('/api/twitter/users/search/', route(Twitter, 'search'));

  // v1
  app.get('/api/v1/exchange-rates/eth-price', route(ExchangeRates, 'getEthPriceInUSD'));
  // activities
  app.get('/api/v1/activities/actor/:userkey', route(Activity, 'getActor')); // order matters; actor is not a :type
  app.get('/api/v1/activities/:type/:id', route(Activity, 'getActivity'));
  app.post('/api/v1/activities', route(Activity, 'getActivities'));
  app.post('/api/v1/activities/actors', route(Activity, 'getBulkActors'));
  app.post('/api/v1/activities/recent', route(Activity, 'getRecentActivities'));
  app.post('/api/v1/activities/votes', route(Activity, 'getVotes'));
  app.get(
    '/api/v1/activities/invite/accepted-by/:profileId',
    route(Activity, 'getInvitesAcceptedBy'),
  );
  // attestations
  app.post('/api/v1/attestations', route(Attestation, 'query'));
  app.post('/api/v1/attestations/extended', route(Attestation, 'extendedQuery'));
  // contracts
  app.get('/api/v1/contracts', route(ContractRoute, 'getContractAddresses'));
  // ens
  app.get('/api/v1/ens-details/by-name/:name', route(Ens, 'getDetailsByName'));
  app.get('/api/v1/ens-details/by-address/:address', route(Ens, 'getDetailsByAddress'));
  // feed
  app.get('/api/v1/feed', route(Feed, 'query'));
  // invitations
  app.post('/api/v1/invitations', route(InvitationRoute, 'query'));
  app.get('/api/v1/invitations/pending/:address', route(InvitationRoute, 'pending'));
  // onboarding
  app.get('/api/v1/onboarding/status/:profileId', route(Onboarding, 'status'));
  // profiles
  app.post('/api/v1/profiles', route(Profile, 'query'));
  app.post('/api/v1/profiles/recent', route(Profile, 'recent'));

  // addresses
  app.get('/api/v1/addresses/:userkey', route(Addresses, 'getByTarget'));
  // replies
  app.post('/api/v1/reply', route(Reply, 'query'));
  app.post('/api/v1/reply/summary', route(Reply, 'summary'));
  // reviews
  app.post('/api/v1/reviews', route(Review, 'query'));
  app.post('/api/v1/reviews/stats', route(Review, 'stats'));
  app.post('/api/v1/reviews/count', route(Review, 'count'));
  // scores
  app.get('/api/v1/score/:userkey', route(Score, 'getScore'));
  app.get('/api/v1/score/:userkey/history', route(Score, 'getScoreHistory'));
  app.get('/api/v1/score/actors/highest-scores', route(Score, 'getHighestScoringActors'));
  app.get('/api/v1/score/simulate/:subjectKey', route(Score, 'getSimulation'));
  // search
  app.get('/api/v1/search', route(SearchRoute, 'search'));
  // transactions
  app.post('/api/v1/transactions/recent', route(Transactions, 'recent'));
  app.post('/api/v1/transactions/interactions', route(Transactions, 'interactions'));
  // vouches
  app.post('/api/v1/vouches', route(Vouch, 'query'));
  app.post('/api/v1/vouches/stats', route(Vouch, 'stats'));
  app.post('/api/v1/vouches/count', route(Vouch, 'count'));
  app.post('/api/v1/vouches/vouched-ethereum', route(Vouch, 'vouchedEthereum'));
  app.post('/api/v1/vouches/most-credible-vouchers', route(Vouch, 'mostCredibleVouchers'));
  app.get('/api/v1/vouches/mutual-vouchers', route(Vouch, 'mutualVouchers'));
  app.post('/api/v1/vouches/rewards', route(Vouch, 'rewards'));

  app.get('/api/v1/markets/search', route(Market, 'search'));
  app.get('/api/v1/markets/:profileId', route(Market, 'info'));
  app.get('/api/v1/markets/:profileId/price/history', route(Market, 'priceHistory'));
  app.get('/api/v1/markets/:profileId/tx/history', route(Market, 'txHistory'));
  app.get('/api/v1/markets/:profileId/holders', route(Market, 'holders'));
  // Fees
  app.get('/api/v1/fees', route(Fees, 'info'));

  // ProcessBlockchain events
  app.get('/api/v1/events/process', route(Events, 'processEvent'));
}
