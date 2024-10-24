import { type ActivityType, type EthosUserTarget, toUserKey } from '@ethos/domain';
import { isValidAddress } from '@ethos/helpers';
import { type Address } from 'viem';
// eslint-disable-next-line no-restricted-imports
import {
  type ActivitiesRequest,
  type ActivitiesResponse,
  type ActivityActorsBulkResponse,
  type ActivityInfoRequest,
  type ActivityInfoResponse,
  type ActivityVotesRequest,
  type ActivityVotesResponse,
  type ActorLookupResponse,
  type AttestationQueryRequest,
  type AttestationQueryResponse,
  type ContractAddressesRequest,
  type ContractAddressesResponse,
  type EnsDetailsByAddressResponse,
  type EnsDetailsByNameResponse,
  type EthPriceResponse,
  type ExtendedAttestationQueryRequest,
  type ExtendedAttestationQueryResponse,
  type FeedResponse,
  type InvitationQueryRequest,
  type InvitationQueryResponse,
  type MostCredibleVouchersRequest,
  type MostCredibleVouchersResponse,
  type MutualVouchersRequest,
  type MutualVouchersResponse,
  type OnboardingStatusResponse,
  type PendingInvitationsRequest,
  type PendingInvitationsResponse,
  type ProfileQueryRequest,
  type ProfileQueryResponse,
  type RecentActivitiesRequest,
  type RecentActivitiesResponse,
  type RecentInteractionsRequest,
  type RecentInteractionsResponse,
  type RecentProfileQueryRequest,
  type RecentProfileQueryResponse,
  type RecentTransactionsRequest,
  type RecentTransactionsResponse,
  type ReplyQueryRequest,
  type ReplyQueryResponse,
  type ReplySummaryRequest,
  type ReplySummaryResponse,
  type ResponseSuccess,
  type ReviewCountRequest,
  type ReviewCountResponse,
  type ReviewQueryRequest,
  type ReviewQueryResponse,
  type ReviewStatsRequest,
  type ReviewStatsResponse,
  type ScoreHistoryResponse,
  type ScoreResponse,
  type ScoreSimulationResponse,
  type SearchQueryRequest,
  type SearchQueryResponse,
  type SignatureForCreateAttestationRequest,
  type SignatureForCreateAttestationResponse,
  type TwitterUserRequest,
  type TwitterUserResponse,
  type TwitterUserSearchRequest,
  type TwitterUserSearchResponse,
  type VouchCountRequest,
  type VouchCountResponse,
  type VouchedEthereumRequest,
  type VouchedEthereumResponse,
  type VouchQueryRequest,
  type VouchQueryResponse,
  type VouchRewardsRequest,
  type VouchRewardsResponse,
  type VouchStatsRequest,
  type VouchStatsResponse,
  type ProfileAddressesResponse,
  type ProfileAddressesRequest,
  type ActivityInviteAcceptedByRequest,
  type ActivityInviteAcceptedByResponse,
  type ScoreSimulationRequest,
  type MarketInfoResponse,
  type MarketPriceHistoryRequest,
  type MarketPriceHistoryResponse,
  type HighestScoringActorsResponse,
  type FeesInfoResponse,
  type MarketTransactionHistoryResponse,
  type MarketHoldersResponse,
  type MarketSearchResponse,
  type MarketSearchRequest,
  type EventsProcessRequest,
  type EventsProcessResponse,
} from '../../../echo/src/types/api.types';
import { getApi, NetError } from '../utils/request-utils';
import { getEchoBaseUrl } from 'config';

export type ActivityActor = ActorLookupResponse['data'];

function getDefaultHeaders() {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Ethos-Service': 'web',
  };

  return headers;
}

let rawRequest: ReturnType<typeof getApi>;

async function request<T extends ResponseSuccess<unknown>>(
  ...args: Parameters<typeof rawRequest>
): Promise<T['data']> {
  if (!rawRequest) {
    const baseUrl = getEchoBaseUrl();
    // eslint-disable-next-line no-console
    console.debug('Initiating echo API with', baseUrl);

    rawRequest = getApi(baseUrl, { headers: getDefaultHeaders() });
  }

  const response = await rawRequest<T>(...args);

  return response.data;
}

async function getFeed(params: { limit: number; offset: number }) {
  const url = new URL('/api/v1/feed', getEchoBaseUrl());
  url.searchParams.set('limit', params.limit.toString());
  url.searchParams.set('offset', params.offset.toString());

  return await request<FeedResponse>(url.toString(), {
    method: 'GET',
  });
}

async function getActivities(params: ActivitiesRequest) {
  return await request<ActivitiesResponse>('/api/v1/activities', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getRecentActivities(params: RecentActivitiesRequest) {
  return await request<RecentActivitiesResponse>(`/api/v1/activities/recent`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getActivityActor(target: EthosUserTarget) {
  const userkey = toUserKey(target);

  return await request<ActorLookupResponse>(`/api/v1/activities/actor/${userkey}`);
}

async function getActivityActorsBulk(targets: EthosUserTarget[]) {
  const userkeys = targets.map((target) => toUserKey(target));

  return await request<ActivityActorsBulkResponse>('/api/v1/activities/actors', {
    method: 'POST',
    body: JSON.stringify({
      userkeys,
    }),
  });
}

async function getActivityVotes(params: ActivityVotesRequest) {
  return await request<ActivityVotesResponse>(`/api/v1/activities/votes`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getInvitesAcceptedBy(params: ActivityInviteAcceptedByRequest) {
  let searchParamsSuffix: string | null = null;

  if (params.limit) {
    const searchParams = new URLSearchParams({ limit: String(params.limit) });
    searchParamsSuffix = `?${searchParams.toString()}`;
  }

  return await request<ActivityInviteAcceptedByResponse>(
    `/api/v1/activities/invite/accepted-by/${params.profileId}${searchParamsSuffix}`,
  );
}

async function getActivityInfo<
  T extends ActivityType,
  R = Extract<ActivityInfoResponse['data'], { type: T }>,
>(
  type: T,
  id: number | string,
  currentUserProfileId?: ActivityInfoRequest['currentUserProfileId'],
): Promise<R> {
  const search = new URLSearchParams({
    currentUserProfileId: String(currentUserProfileId ?? null),
  }).toString();

  return await request<ResponseSuccess<R>>(`/api/v1/activities/${type}/${id}?${search}`);
}

async function getAttestationQuery(params: AttestationQueryRequest) {
  return await request<AttestationQueryResponse>('/api/v1/attestations', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getExtendedAttestationQuery(params: ExtendedAttestationQueryRequest) {
  return await request<ExtendedAttestationQueryResponse>('/api/v1/attestations/extended', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getEnsDetailsByAddress(address: Address) {
  if (!isValidAddress(address)) {
    return null;
  }

  return await request<EnsDetailsByAddressResponse>(`/api/v1/ens-details/by-address/${address}`);
}

async function getEnsDetailsByName(name: string) {
  return await request<EnsDetailsByNameResponse>(`/api/v1/ens-details/by-name/${name}`);
}

async function getContractAddresses({ targetContracts }: ContractAddressesRequest) {
  const searchParams = new URLSearchParams({
    targetContracts: Array.isArray(targetContracts) ? targetContracts.join(',') : targetContracts,
  });

  return await request<ContractAddressesResponse>(`/api/v1/contracts?${searchParams.toString()}`);
}

async function getEthPriceInUSD() {
  return await request<EthPriceResponse>('/api/v1/exchange-rates/eth-price');
}

async function getProfile(params: ProfileQueryRequest) {
  return await request<ProfileQueryResponse>('/api/v1/profiles', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getAddressesByTarget(params: ProfileAddressesRequest) {
  return await request<ProfileAddressesResponse>(`/api/v1/addresses/${params.userkey}`, {
    method: 'GET',
  });
}

async function getRecentProfiles(params: RecentProfileQueryRequest) {
  return await request<RecentProfileQueryResponse>('/api/v1/profiles/recent', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getSignatureForCreateAttestation(params: SignatureForCreateAttestationRequest) {
  return await request<SignatureForCreateAttestationResponse>(
    '/api/signatures/create-attestation',
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
  );
}

async function getTwitterUser(params: TwitterUserRequest) {
  try {
    const searchParams = new URLSearchParams(params);

    return await request<TwitterUserResponse>(`/api/twitter/user/?${searchParams.toString()}`);
  } catch (err) {
    if (err instanceof NetError && err.status === 404) {
      return null;
    }

    throw err;
  }
}

async function searchTwitterUser({ search, limit = 10 }: TwitterUserSearchRequest) {
  const searchParams = new URLSearchParams({ search, limit: String(limit) });

  return await request<TwitterUserSearchResponse>(
    `/api/twitter/users/search/?${searchParams.toString()}`,
  );
}

async function getReplyQuery(params: ReplyQueryRequest) {
  return await request<ReplyQueryResponse>('/api/v1/reply', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getReplySummary(params: ReplySummaryRequest) {
  return await request<ReplySummaryResponse>('/api/v1/reply/summary', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getReviews(params: ReviewQueryRequest) {
  return await request<ReviewQueryResponse>('/api/v1/reviews', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getReviewStats(params: ReviewStatsRequest) {
  return await request<ReviewStatsResponse>('/api/v1/reviews/stats', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function querySearch(params: SearchQueryRequest) {
  return await request<SearchQueryResponse>(`/api/v1/search?query=${params.query}`);
}

async function getRecentTransactions(params: RecentTransactionsRequest) {
  return await request<RecentTransactionsResponse>('/api/v1/transactions/recent', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getRecentInteractions(params: RecentInteractionsRequest) {
  return await request<RecentInteractionsResponse>('/api/v1/transactions/interactions', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getReviewCount(params: ReviewCountRequest) {
  return await request<ReviewCountResponse>('/api/v1/reviews/count', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getVouches(params: VouchQueryRequest) {
  return await request<VouchQueryResponse>('/api/v1/vouches', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getVouchStats(params: VouchStatsRequest) {
  return await request<VouchStatsResponse>('/api/v1/vouches/stats', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getVouchRewards(params: VouchRewardsRequest) {
  return await request<VouchRewardsResponse>('/api/v1/vouches/rewards', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getVouchCount(params: VouchCountRequest) {
  return await request<VouchCountResponse>('/api/v1/vouches/count', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getVouchedEthereum(params: VouchedEthereumRequest) {
  return await request<VouchedEthereumResponse>('/api/v1/vouches/vouched-ethereum', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getMostCredibleVouchers(params: MostCredibleVouchersRequest) {
  return await request<MostCredibleVouchersResponse>('/api/v1/vouches/most-credible-vouchers', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getMutualVouchers(params: MutualVouchersRequest) {
  return await request<MutualVouchersResponse>(
    // TODO: Request types are broken now and because of this the type is
    // basically "any" now. Once we fix Request types, we should remove this comment
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    `/api/v1/vouches/mutual-vouchers?${new URLSearchParams(params).toString()}`,
  );
}

async function getInvitations(params: InvitationQueryRequest) {
  return await request<InvitationQueryResponse>('/api/v1/invitations', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getPendingInvitations(params: PendingInvitationsRequest) {
  return await request<PendingInvitationsResponse>(`/api/v1/invitations/pending/${params.address}`);
}

async function getScore(target: EthosUserTarget): Promise<number> {
  const targetKey = toUserKey(target);

  return await request<ScoreResponse>(`/api/v1/score/${targetKey}`).then((res) => res.score);
}

async function getScoreHistory(target: EthosUserTarget, days: number = 30) {
  const targetKey = toUserKey(target);

  return await request<ScoreHistoryResponse>(
    `/api/v1/score/${targetKey}/history?duration=${days}d`,
  );
}

async function getScoreElements(target: EthosUserTarget): Promise<ScoreResponse['data']> {
  const targetKey = toUserKey(target);

  return await request<ScoreResponse>(`/api/v1/score/${targetKey}`);
}

async function getScoreSimulation(
  subject: EthosUserTarget,
  params: ScoreSimulationRequest,
): Promise<ScoreSimulationResponse['data']> {
  const subjectKey = toUserKey(subject);

  const formattedParams = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  );

  return await request<ScoreSimulationResponse>(
    `/api/v1/score/simulate/${subjectKey}?${new URLSearchParams(formattedParams).toString()}`,
  );
}

async function getHighestScoringActors(limit: number = 5) {
  return await request<HighestScoringActorsResponse>(
    `/api/v1/score/actors/highest-scores?limit=${limit}`,
  );
}

async function getOnboardingStatus(profileId: number, targetScore: number) {
  const params = new URLSearchParams({
    targetScore: String(targetScore),
  }).toString();
  const url = new URL(`/api/v1/onboarding/status/${profileId}?${params}`, getEchoBaseUrl());

  return await request<OnboardingStatusResponse>(url.toString(), {
    method: 'GET',
  });
}

async function getMarketInfo(profileId: number): Promise<MarketInfoResponse['data'] | null> {
  try {
    return await request<MarketInfoResponse>(`/api/v1/markets/${profileId}`);
  } catch (err) {
    if (err instanceof NetError && err.status === 404) {
      return null;
    }

    throw err;
  }
}

async function getMarketPriceHistory(
  profileId: number,
  window: MarketPriceHistoryRequest['window'],
): Promise<MarketPriceHistoryResponse['data']> {
  return await request<MarketPriceHistoryResponse>(
    `/api/v1/markets/${profileId}/price/history?window=${window}`,
  );
}

async function getMarketTransactionHistory(profileId: number) {
  return await request<MarketTransactionHistoryResponse>(`/api/v1/markets/${profileId}/tx/history`);
}

async function getMarketHolders(profileId: number) {
  return await request<MarketHoldersResponse>(`/api/v1/markets/${profileId}/holders`);
}

async function searchMarkets(params: MarketSearchRequest) {
  return await request<MarketSearchResponse>(
    `/api/v1/markets/search?${new URLSearchParams(params).toString()}`,
  );
}

async function getFeesInfo() {
  return await request<FeesInfoResponse>(`/api/v1/fees`);
}

async function processEvents(params: EventsProcessRequest) {
  return await request<EventsProcessResponse>(
    `/api/v1/events/process?${new URLSearchParams(params).toString()}`,
  );
}

export const echoApi = {
  activities: {
    recent: getRecentActivities,
    get: getActivityInfo,
    bulk: getActivities,
    actor: getActivityActor,
    actorsBulk: getActivityActorsBulk,
    votes: getActivityVotes,
    invitesAcceptedBy: getInvitesAcceptedBy,
  },
  addresses: {
    getByTarget: getAddressesByTarget,
  },
  attestations: {
    query: getAttestationQuery,
    queryExtended: getExtendedAttestationQuery,
  },
  ens: {
    getDetailsByAddress: getEnsDetailsByAddress,
    getDetailsByName: getEnsDetailsByName,
  },
  contracts: {
    getAddresses: getContractAddresses,
  },
  feed: {
    get: getFeed,
  },
  exchangeRates: {
    getEthPriceInUSD,
  },
  invitations: {
    query: getInvitations,
    pending: getPendingInvitations,
  },
  profiles: {
    query: getProfile,
    recent: getRecentProfiles,
  },
  signatures: {
    createAttestation: getSignatureForCreateAttestation,
  },
  twitter: {
    user: {
      get: getTwitterUser,
      search: searchTwitterUser,
    },
  },
  replies: {
    query: getReplyQuery,
    summary: getReplySummary,
  },
  reviews: {
    query: getReviews,
    stats: getReviewStats,
    count: getReviewCount,
  },
  scores: {
    get: getScore,
    history: getScoreHistory,
    highestScoringActors: getHighestScoringActors,
    elements: getScoreElements,
    simulate: getScoreSimulation,
  },
  search: {
    query: querySearch,
  },
  transactions: {
    recent: getRecentTransactions,
    interactions: getRecentInteractions,
  },
  vouches: {
    query: getVouches,
    stats: getVouchStats,
    rewards: getVouchRewards,
    count: getVouchCount,
    vouchedEthereum: getVouchedEthereum,
    mostCredibleVouchers: getMostCredibleVouchers,
    mutualVouchers: getMutualVouchers,
  },
  onboarding: {
    status: getOnboardingStatus,
  },
  markets: {
    search: searchMarkets,
    info: getMarketInfo,
    priceHistory: getMarketPriceHistory,
    transactionHistory: getMarketTransactionHistory,
    holders: getMarketHolders,
  },
  fees: {
    info: getFeesInfo,
  },
  events: {
    process: processEvents,
  },
};
