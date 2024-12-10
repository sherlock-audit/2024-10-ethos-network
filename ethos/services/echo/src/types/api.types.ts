import { type z } from 'zod';
import { type ActorLookup } from '../services/activity/activity-actor.service.js';
import { type ActivityService } from '../services/activity/activity.service.js';
import { type BulkActorsLookup } from '../services/activity/bulk.activity-actors.service.js';
import { type BulkActivityService } from '../services/activity/bulk.activity.service.js';
import { type BulkVotesService } from '../services/activity/bulk.votes.service.js';
import { type InvitesAcceptedService } from '../services/activity/invites-accepted.service.js';
import { type UnifiedActivityService } from '../services/activity/unified-activity.service.js';
import { type AttestationQueryService } from '../services/attestation/attestation.service.js';
import { type ExtendedAttestationsQueryService } from '../services/attestation/extended-attestations.service.js';
import { type ContractService } from '../services/contracts/contract.service.js';
import { type ContributionActionService } from '../services/contribution/action.service.js';
import { type ContributionDailyService } from '../services/contribution/daily.service.js';
import { type ContributionQueryService } from '../services/contribution/query.service.js';
import { type ContributionStatsService } from '../services/contribution/stats.service.js';
import { type EnsDetailsByAddressService } from '../services/ens/details-by-address.service.js';
import { type EnsDetailsByNameService } from '../services/ens/details-by-name.service.js';
import { type EventsProcessService } from '../services/events/events-process.service.js';
import { type EthPriceService } from '../services/exchange-rates/EthPriceService.js';
import { type FeesInfoService } from '../services/fees/fees-info.service.js';
import { type UpdateUserFCMTokenService } from '../services/firebase-cloud-messeging/update-user-fcm-token.service.js';
import { type InvitationQuery } from '../services/invitations/invitation.service.js';
import { type PendingInvitations } from '../services/invitations/pending-invitations.service.js';
import { type HoldingsByAddressService } from '../services/market/holdings-by-address.service.js';
import { type HoldingsTotalByAddressService } from '../services/market/holdings-total-by-address.service.js';
import { type MarketInfoBulkService } from '../services/market/market-bulk.service.js';
import { type MarketHoldersService } from '../services/market/market-holders.service.js';
import { type MarketInfoService } from '../services/market/market-info.service.js';
import { type MarketPriceHistoryService } from '../services/market/market-price-history.service.js';
import { type MarketSearchService } from '../services/market/market-search.service.js';
import {
  type MarketActivityByAddressService,
  type MarketTransactionHistoryService,
} from '../services/market/market-transactions.service.js';
import { type VolumeTradedByAddressService } from '../services/market/volume-traded-by-address.service.js';
import { type OnboardingStatusService } from '../services/onboarding/onboarding-status.service.js';
import { type CreatePrivyLogin } from '../services/privy-logins/create.service.js';
import { type CredibilityLeaderboardQuery } from '../services/profile/credibility-leaderboard.service.js';
import { type ProfileAddressesService } from '../services/profile/profile-addresses.service.js';
import { type ProfileQuery } from '../services/profile/profiles.service.js';
import { type RecentProfilesQuery } from '../services/profile/recent-profiles.service.js';
import { type XPLeaderboardQuery } from '../services/profile/xp-leaderboard.service.js';
import { type ReplySummaryService } from '../services/reply/reply-summary-service.js';
import { type ReplyQueryService } from '../services/reply/reply.service.js';
import { type ReviewCount } from '../services/review/count.service.js';
import { type ReviewQuery } from '../services/review/query.service.js';
import { type ReviewStats } from '../services/review/stats.service.js';
import { type HighestScoringActorsService } from '../services/score/highest-scores-actors.service.js';
import { type ScoreHistoryService } from '../services/score/score-history.service.js';
import { type ScoreSimulationService } from '../services/score/score-simulation.service.js';
import { type ScoreService } from '../services/score/score.service.js';
import { type SearchService } from '../services/search/search.service.js';
import { type Service } from '../services/service.base.js';
import { type CreateAttestation } from '../services/signatures/create-attestation.service.js';
import { type RegisterAddress } from '../services/signatures/register-address.service.js';
import { type RecentInteractionsService } from '../services/transactions/interactions.service.js';
import { type RecentTransactionsService } from '../services/transactions/recent-transactions.service.js';
import { type TwitterUserSearch } from '../services/twitter/user-search.service.js';
import { type TwitterUser } from '../services/twitter/user.service.js';
import { type VouchCount } from '../services/vouch/count.service.js';
import { type MostCredibleVouchers } from '../services/vouch/most-credible-vouchers.service.js';
import { type MutualVouchers } from '../services/vouch/mutual-vouchers.service.js';
import { type VouchQuery } from '../services/vouch/query.service.js';
import { type VouchRewards } from '../services/vouch/rewards.service.js';
import { type VouchStats } from '../services/vouch/stats.service.js';
import { type VouchedEthereum } from '../services/vouch/vouched-ethereum.service.js';
import { type XpHistoryService } from '../services/xp/xp-history.service.js';

export type { ValidReplyParams } from '../services/reply/reply.utils.js';

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
 * Request/Response `POST /api/v1/activities/unified`
 */
export type UnifiedActivityRequest = RequestParamsWrangler<UnifiedActivityService>;
export type UnifiedActivityResponse = ResponseWrangler<UnifiedActivityService>;

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
 * Request/Response `GET /api/v1/profiles/credibility-leaderboard`
 */
export type CredibilityLeaderboardQueryResponse = ResponseWrangler<CredibilityLeaderboardQuery>;

/**
 * Request/Response `GET /api/v1/profiles/xp-leaderboard`
 */
export type XPLeaderboardQueryResponse = ResponseWrangler<XPLeaderboardQuery>;

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
 * Request/Response `POST /api/signatures/create-attestation`
 */
export type SignatureForCreateAttestationRequest = RequestParamsWrangler<CreateAttestation>;
export type SignatureForCreateAttestationResponse = ResponseWrangler<CreateAttestation>;

/**
 * Request/Response `POST /api/signatures/register-address`
 */
export type SignatureRegisterAddressRequest = RequestParamsWrangler<RegisterAddress>;
export type SignatureRegisterAddressResponse = ResponseWrangler<RegisterAddress>;

/**
 * Request/Response for `GET /api/twitter/user`
 */
export type TwitterUserRequest = RequestParamsWrangler<TwitterUser>;
export type TwitterUserResponse = ResponseWrangler<TwitterUser>;

/**
 * Request/Response for `GET /api/twitter/users/search`
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
 * Response `POST /api/v1/score/simulate`
 */
export type ScoreSimulationRequest = RequestParamsWrangler<ScoreSimulationService>;
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
 * Request/Response `POST /api/v1/market/bulk`
 */
export type MarketBulkInfoRequest = RequestParamsWrangler<MarketInfoBulkService>;
export type MarketBulkInfoResponse = ResponseWrangler<MarketInfoBulkService>;

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
 * Request/Response `GET /api/v1/market/activity/:address`
 */
export type MarketTransactionHistoryByAddressRequest =
  RequestParamsWrangler<MarketActivityByAddressService>;

export type MarketTransactionHistoryByAddressResponse =
  ResponseWrangler<MarketActivityByAddressService>;

/**
 * Request/Response `GET /api/v1/market/:profileId/holders`
 */
export type MarketHoldersRequest = RequestParamsWrangler<MarketHoldersService>;
export type MarketHoldersResponse = ResponseWrangler<MarketHoldersService>;

/**
 * Request/Response `GET /api/v1/market/holdings/:address`
 */
export type MarketHoldingsByAddressRequest = RequestParamsWrangler<HoldingsByAddressService>;
export type MarketHoldingsByAddressResponse = ResponseWrangler<HoldingsByAddressService>;

/**
 * Request/Response `GET /api/v1/market/holdings/:address/total`
 */
export type MarketHoldingsTotalByAddressRequest =
  RequestParamsWrangler<HoldingsTotalByAddressService>;
export type MarketHoldingsTotalByAddressResponse = ResponseWrangler<HoldingsTotalByAddressService>;

/**
 * Request/Response `GET /api/v1/market/volume/:address`
 */
export type MarketVolumeTradedByAddressRequest =
  RequestParamsWrangler<VolumeTradedByAddressService>;
export type MarketVolumeTradedByAddressResponse = ResponseWrangler<VolumeTradedByAddressService>;

/**
 * Request/Response `GET /api/v1/market/search`
 */
export type MarketSearchRequest = RequestParamsWrangler<MarketSearchService>;
export type MarketSearchResponse = ResponseWrangler<MarketSearchService>;

/**
 * Request/Response `GET /api/v1/events/process
 */
export type EventsProcessRequest = RequestParamsWrangler<EventsProcessService>;
export type EventsProcessResponse = ResponseWrangler<EventsProcessService>;

/**
 * Response `GET /api/v1/fees`
 */
export type FeesInfoResponse = ResponseWrangler<FeesInfoService>;

/**
 * Response `POST /api/v1/contribution/action`
 */
export type ContributionActionRequest = RequestParamsWrangler<ContributionActionService>;
export type ContributionActionResponse = ResponseWrangler<ContributionActionService>;

/**
 * Response `GET /api/v1/contribution/:profileId`
 */
export type ContributionByProfileRequest = RequestParamsWrangler<ContributionQueryService>;
export type ContributionByProfileResponse = ResponseWrangler<ContributionQueryService>;

/**
 * Response `GET /api/v1/contribution/:profileId/stats`
 */
export type ContributionStatsRequest = RequestParamsWrangler<ContributionStatsService>;
export type ContributionStatsResponse = ResponseWrangler<ContributionStatsService>;

/**
 * Response `POST /api/v1/contribution/daily`
 */
export type ContributionDailyRequest = RequestParamsWrangler<ContributionDailyService>;
export type ContributionDailyResponse = ResponseWrangler<ContributionDailyService>;

/**
 * Response `POST /api/v1/notifications/user-fcm-token`
 */
export type UpdateUserFCMTokenRequest = RequestParamsWrangler<UpdateUserFCMTokenService>;
export type UpdateUserFCMTokenResponse = ResponseWrangler<UpdateUserFCMTokenService>;

/**
 * Request/Response `POST /api/v1/privy-logins`
 */
export type PrivyLoginRequest = RequestParamsWrangler<CreatePrivyLogin>;
export type PrivyLoginResponse = ResponseWrangler<CreatePrivyLogin>;

/**
 * Request/Response `GET /api/v1/xp/:userkey/history`
 */
export type XpHistoryRequest = RequestParamsWrangler<XpHistoryService>;
export type XpHistoryResponse = ResponseWrangler<XpHistoryService>;
