import { type z } from 'zod';
import { type ActorLookup } from '../services/activity/activity-actor.service';
import { type ActivityService } from '../services/activity/activity.service';
import { type BulkActorsLookup } from '../services/activity/bulk.activity-actors.service';
import { type BulkActivityService } from '../services/activity/bulk.activity.service';
import { type BulkVotesService } from '../services/activity/bulk.votes';
import { type FeedService } from '../services/activity/feed.service';
import { type InvitesAcceptedService } from '../services/activity/invites-accepted.service';
import { type RecentActivityService } from '../services/activity/recent.activity.service';
import { type AttestationQueryService } from '../services/attestation/attestation.service';
import { type ExtendedAttestationsQueryService } from '../services/attestation/extended-attestations.service';
import { type ContractService } from '../services/contracts/contract.service';
import { type EnsDetailsByAddressService } from '../services/ens/details-by-address.service';
import { type EnsDetailsByNameService } from '../services/ens/details-by-name.service';
import { type EthPriceService } from '../services/exchange-rates/EthPriceService';
import { type FeesInfoService } from '../services/fees/fees-info.service';
import { type InvitationQuery } from '../services/invitations/invitation.service';
import { type PendingInvitations } from '../services/invitations/pending-invitations.service';
import { type MarketHoldersService } from '../services/market/market-holders.service';
import { type MarketInfoService } from '../services/market/market-info.service';
import { type MarketPriceHistoryService } from '../services/market/market-price-history.service';
import { type MarketSearchService } from '../services/market/market-search.service';
import { type MarketTransactionHistoryService } from '../services/market/market-transactions.service';
import { type OnboardingStatusService } from '../services/onboarding/onboarding-status.service';
import { type ProfileAddressesService } from '../services/profile/profile-addresses.service';
import { type ProfileQuery } from '../services/profile/profiles.service';
import { type RecentProfilesQuery } from '../services/profile/recent-profiles.service';
import { type ReplySummaryService } from '../services/reply/reply-summary-service';
import { type ReplyQueryService } from '../services/reply/reply.service';
import { type ReviewCount } from '../services/review/count.service';
import { type ReviewQuery } from '../services/review/query.service';
import { type ReviewStats } from '../services/review/stats.service';
import { type HighestScoringActorsService } from '../services/score/highest-scores-actors.service';
import { type ScoreHistoryService } from '../services/score/score-history.service';
import { type ScoreSimulationService } from '../services/score/score-simulation.service';
import { type ScoreService } from '../services/score/score.service';
import { type SearchService } from '../services/search/search.service';
import { type Service } from '../services/service.base';
import { type CreateAttestation } from '../services/signatures/create-attestation.service';
import { type RecentInteractionsService } from '../services/transactions/interactions.service';
import { type RecentTransactionsService } from '../services/transactions/recent-transactions.service';
import { type TwitterUserSearch } from '../services/twitter/user-search.service';
import { type TwitterUser } from '../services/twitter/user.service';
import { type VouchCount } from '../services/vouch/count.service';
import { type MostCredibleVouchers } from '../services/vouch/most-credible-vouchers.service';
import { type MutualVouchers } from '../services/vouch/mutual-vouchers.service';
import { type VouchQuery } from '../services/vouch/query.service';
import { type VouchRewards } from '../services/vouch/rewards.service';
import { type VouchStats } from '../services/vouch/stats.service';
import { type VouchedEthereum } from '../services/vouch/vouched-ethereum.service';

export type ResponseError = {
  ok: false;
  error: {
    code: string;
    message: string;
    reqId?: string;
  };
};

export type ResponseSuccess<T> = {
  ok: true;
  data: T;
};

type RequestParamsWrangler<T> = T extends Service<infer I, any> ? z.input<I> : never;
type ResponseWrangler<T> = T extends Service<any, infer O> ? ResponseSuccess<O> : never;

/**
 * Response `GET /api/v1/exchange-rates/eth-price`
 */
export type EthPriceResponse = ResponseWrangler<EthPriceService>;

/**
 * Response `GET /api/v1/activities/:type/:id`
 */
export type ActivityInfoRequest = RequestParamsWrangler<ActivityService>;
export type ActivityInfoResponse = ResponseWrangler<ActivityService>;

/**
 * Request `POST /api/v1/activities`
 */
export type ActivitiesRequest = RequestParamsWrangler<BulkActivityService>;
export type ActivitiesResponse = ResponseWrangler<BulkActivityService>;

/**
 * Request/Response `POST /api/v1/activities/actors`
 */
export type ActivityActorsBulkRequest = RequestParamsWrangler<BulkActorsLookup>;
export type ActivityActorsBulkResponse = ResponseWrangler<BulkActorsLookup>;

/**
 * Request/Response `POST /api/v1/activities/recent`
 */
export type RecentActivitiesRequest = RequestParamsWrangler<RecentActivityService>;
export type RecentActivitiesResponse = ResponseWrangler<RecentActivityService>;

/**
 * Request/Response `POST /api/v1/feed`
 */
export type FeedRequest = RequestParamsWrangler<FeedService>;
export type FeedResponse = ResponseWrangler<FeedService>;

/**
 * Response `GET /api/v1/activities/actor/:userkey`
 */
export type ActorLookupResponse = ResponseWrangler<ActorLookup>;

/**
 * Request/Response `POST /api/v1/activities/votes`
 */
export type ActivityVotesRequest = RequestParamsWrangler<BulkVotesService>;
export type ActivityVotesResponse = ResponseWrangler<BulkVotesService>;

/**
 * Request/Response `GET /api/v1/activities/invite/accepted-by/:profileId`
 */
export type ActivityInviteAcceptedByRequest = RequestParamsWrangler<InvitesAcceptedService>;
export type ActivityInviteAcceptedByResponse = ResponseWrangler<InvitesAcceptedService>;

/**
 * Request/Response `POST /api/v1/attestations`
 */
export type AttestationQueryRequest = RequestParamsWrangler<AttestationQueryService>;
export type AttestationQueryResponse = ResponseWrangler<AttestationQueryService>;

/**
 * Request/Response `POST /api/v1/attestations/extended`
 */
export type ExtendedAttestationQueryRequest =
  RequestParamsWrangler<ExtendedAttestationsQueryService>;
export type ExtendedAttestationQueryResponse = ResponseWrangler<ExtendedAttestationsQueryService>;

/**
 * Request/Response `POST /api/v1/contracts`
 */
export type ContractAddressesRequest = RequestParamsWrangler<ContractService>;
export type ContractAddressesResponse = ResponseWrangler<ContractService>;

/**
 * Response `GET /api/v1/ens-details/by-address/:address`
 */
export type EnsDetailsByAddressResponse = ResponseWrangler<EnsDetailsByAddressService>;

/**
 * Response `GET /api/v1/ens-details/by-name/:name`
 */
export type EnsDetailsByNameResponse = ResponseWrangler<EnsDetailsByNameService>;

/**
 * Request/Response `POST /api/v1/profiles`
 */
export type ProfileQueryRequest = RequestParamsWrangler<ProfileQuery>;
export type ProfileQueryResponse = ResponseWrangler<ProfileQuery>;

/**
 * Request/Response `POST /api/v1/profiles/recent`
 */
export type RecentProfileQueryRequest = RequestParamsWrangler<RecentProfilesQuery>;
export type RecentProfileQueryResponse = ResponseWrangler<RecentProfilesQuery>;

/**
 * Request/Response `POST /api/v1/profiles/addresses/:userkey`
 */
export type ProfileAddressesRequest = RequestParamsWrangler<ProfileAddressesService>;
export type ProfileAddressesResponse = ResponseWrangler<ProfileAddressesService>;

/**
 * Request `POST /api/signatures/create-attestation`
 */
export type SignatureForCreateAttestationRequest = RequestParamsWrangler<CreateAttestation>;

/**
 * Response `POST /api/signatures/create-attestation`
 */
export type SignatureForCreateAttestationResponse = ResponseWrangler<CreateAttestation>;

/**
 * Request/Response for `GET /api/twitter/user`
 */
export type TwitterUserRequest = RequestParamsWrangler<TwitterUser>;
export type TwitterUserResponse = ResponseWrangler<TwitterUser>;

/**
 * Request/Response for `GET /api/twitter/users/search/:username`
 */
export type TwitterUserSearchRequest = RequestParamsWrangler<TwitterUserSearch>;
export type TwitterUserSearchResponse = ResponseWrangler<TwitterUserSearch>;

/**
 * Request/Response `POST /api/v1/reply`
 */
export type ReplyQueryRequest = RequestParamsWrangler<ReplyQueryService>;
export type ReplyQueryResponse = ResponseWrangler<ReplyQueryService>;

/**
 * Request `POST /api/v1/reply/summary`
 */
export type ReplySummaryRequest = RequestParamsWrangler<ReplySummaryService>;
/**
 * Response `POST /api/v1/reply/summary`
 */
export type ReplySummaryResponse = ResponseWrangler<ReplySummaryService>;

/**
 * Request `POST /api/v1/reviews`
 */
export type ReviewQueryRequest = RequestParamsWrangler<ReviewQuery>;
/**
 * Response `POST /api/v1/reviews`
 */
export type ReviewQueryResponse = ResponseWrangler<ReviewQuery>;

/**
 * Request `POST /api/v1/reviews/stats`
 */
export type ReviewStatsRequest = RequestParamsWrangler<ReviewStats>;
/**
 * Response `POST /api/v1/reviews/stats`
 */
export type ReviewStatsResponse = ResponseWrangler<ReviewStats>;

/**
 * Request/Response `POST /api/v1/search`
 */
export type SearchQueryRequest = RequestParamsWrangler<SearchService>;
export type SearchQueryResponse = ResponseWrangler<SearchService>;

/**
 * Request/Response `POST /api/v1/transactions/*`
 */
export type RecentTransactionsRequest = RequestParamsWrangler<RecentTransactionsService>;
export type RecentTransactionsResponse = ResponseWrangler<RecentTransactionsService>;
export type RecentInteractionsRequest = RequestParamsWrangler<RecentInteractionsService>;
export type RecentInteractionsResponse = ResponseWrangler<RecentInteractionsService>;

/**
 * Request `POST /api/v1/reviews/count`
 */
export type ReviewCountRequest = RequestParamsWrangler<ReviewCount>;
/**
 * Response `POST /api/v1/reviews/count`
 */
export type ReviewCountResponse = ResponseWrangler<ReviewCount>;

/**
 * Request `POST /api/v1/vouches`
 */
export type VouchQueryRequest = RequestParamsWrangler<VouchQuery>;
/**
 * Response `POST /api/v1/vouches`
 */
export type VouchQueryResponse = ResponseWrangler<VouchQuery>;

/**
 * Request `POST /api/v1/invitations`
 */
export type InvitationQueryRequest = RequestParamsWrangler<InvitationQuery>;
/**
 * Response `POST /api/v1/invitations`
 */
export type InvitationQueryResponse = ResponseWrangler<InvitationQuery>;

/**
 * Request/Response `POST /api/v1/invitations/pending`
 */
export type PendingInvitationsRequest = RequestParamsWrangler<PendingInvitations>;
export type PendingInvitationsResponse = ResponseWrangler<PendingInvitations>;

/**
 * Request `POST /api/v1/vouches/stats`
 */
export type VouchStatsRequest = RequestParamsWrangler<VouchStats>;
/**
 * Response `POST /api/v1/vouches/stats`
 */
export type VouchStatsResponse = ResponseWrangler<VouchStats>;

/**
 * Request `POST /api/v1/vouches/rewards`
 * Response `POST /api/v1/vouches/rewards`
 */
export type VouchRewardsRequest = RequestParamsWrangler<VouchRewards>;
export type VouchRewardsResponse = ResponseWrangler<VouchRewards>;

/**
 * Request `POST /api/v1/vouches/count`
 */
export type VouchCountRequest = RequestParamsWrangler<VouchCount>;
/**
 * Response `POST /api/v1/vouches/count`
 */
export type VouchCountResponse = ResponseWrangler<VouchCount>;

/**
 * Request `POST /api/v1/vouches/vouched-ethereum`
 */
export type VouchedEthereumRequest = RequestParamsWrangler<VouchedEthereum>;
/**
 * Response `POST /api/v1/vouches/vouched-ethereum`
 */
export type VouchedEthereumResponse = ResponseWrangler<VouchedEthereum>;

/**
 * Request `POST /api/v1/vouches/most-credible-vouchers`
 */
export type MostCredibleVouchersRequest = RequestParamsWrangler<MostCredibleVouchers>;
/**
 * Response `POST /api/v1/vouches/most-credible-vouchers`
 */
export type MostCredibleVouchersResponse = ResponseWrangler<MostCredibleVouchers>;

/**
 * Request/Response `GET /api/v1/vouches/mutual-vouchers`
 */
export type MutualVouchersRequest = RequestParamsWrangler<MutualVouchers>;
export type MutualVouchersResponse = ResponseWrangler<MutualVouchers>;

/**
 * Response `GET /api/v1/score/:userkey`
 */
export type ScoreResponse = ResponseWrangler<ScoreService>;

/**
 * Response `GET /api/v1/score/:userkey/history?duration=:duration`
 */
export type ScoreHistoryResponse = ResponseWrangler<ScoreHistoryService>;

/**
 * Response `GET /score/actors/highest-scores?limit=:limit`
 */
export type HighestScoringActorsResponse = ResponseWrangler<HighestScoringActorsService>;

/**
 * Response `GET /api/v1/score/simulate/:subjectKey?twitterProfileId=:twitterProfileId`
 */
export type ScoreSimulationRequest = Omit<
  RequestParamsWrangler<ScoreSimulationService>,
  'subjectKey'
>;
export type ScoreSimulationResponse = ResponseWrangler<ScoreSimulationService>;

/**
 * Response `GET /api/v1/onboarding/status/:profileId`
 */
export type OnboardingStatusResponse = ResponseWrangler<OnboardingStatusService>;

/**
 * Response `GET /api/v1/market/:profileId`
 */
export type MarketInfoResponse = ResponseWrangler<MarketInfoService>;

/**
 * Request/Response `GET /api/v1/market/:profileId/price/history`
 */
export type MarketPriceHistoryRequest = RequestParamsWrangler<MarketPriceHistoryService>;
export type MarketPriceHistoryResponse = ResponseWrangler<MarketPriceHistoryService>;

/**
 * Request/Response `GET /api/v1/market/:profileId/tx/history`
 */
export type MarketTransactionHistoryRequest =
  RequestParamsWrangler<MarketTransactionHistoryService>;
export type MarketTransactionHistoryResponse = ResponseWrangler<MarketTransactionHistoryService>;

/**
 * Request/Response `GET /api/v1/market/:profileId/holders`
 */
export type MarketHoldersRequest = RequestParamsWrangler<MarketHoldersService>;
export type MarketHoldersResponse = ResponseWrangler<MarketHoldersService>;

/**
 * Request/Response `GET /api/v1/market/search`
 */
export type MarketSearchRequest = RequestParamsWrangler<MarketSearchService>;
export type MarketSearchResponse = ResponseWrangler<MarketSearchService>;

/**
 * Response `GET /api/v1/fees`
 */
export type FeesInfoResponse = ResponseWrangler<FeesInfoService>;
