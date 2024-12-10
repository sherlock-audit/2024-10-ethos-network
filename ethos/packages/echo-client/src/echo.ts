/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { type ActivityType, type EthosUserTarget, isTargetValid, toUserKey } from '@ethos/domain';
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
  type ContributionStatsResponse,
  type ContributionStatsRequest,
  type ContributionActionResponse,
  type ContributionByProfileResponse,
  type ContributionByProfileRequest,
  type ContributionActionRequest,
  type ContributionDailyRequest,
  type ContributionDailyResponse,
  type UpdateUserFCMTokenResponse,
  type UpdateUserFCMTokenRequest,
  type CredibilityLeaderboardQueryResponse,
  type XPLeaderboardQueryResponse,
  type SignatureRegisterAddressRequest,
  type SignatureRegisterAddressResponse,
  type UnifiedActivityRequest,
  type UnifiedActivityResponse,
  type MarketTransactionHistoryRequest,
  type PrivyLoginResponse,
  type XpHistoryRequest,
  type XpHistoryResponse,
  type MarketTransactionHistoryByAddressResponse,
  type MarketTransactionHistoryByAddressRequest,
  type MarketHoldingsByAddressResponse,
  type MarketHoldingsTotalByAddressResponse,
  type MarketHoldingsByAddressRequest,
  type MarketVolumeTradedByAddressResponse,
  type MarketBulkInfoRequest,
  type MarketBulkInfoResponse,
} from '../../../services/echo/src/types/api.types.js';
import { getApi, NetError } from './utils/request-utils.js';

type EchoClientConfig = {
  baseUrl: string;
  ethosService: string;
  headers?: HeadersInit;
};

let echoClientConfig: EchoClientConfig | null = null;

export function setEchoConfig(config: EchoClientConfig) {
  echoClientConfig = config;
}

function checkClientConfig(
  config: EchoClientConfig | null,
): asserts config is NonNullable<typeof echoClientConfig> {
  if (!config) {
    throw new Error(
      'Echo Client configuration was not set. Call setEchoConfig() with a valid configuration.',
    );
  }
}

export type ActivityActor = ActorLookupResponse['data'];

function getDefaultHeaders() {
  checkClientConfig(echoClientConfig);
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Ethos-Service': echoClientConfig.ethosService,
    ...echoClientConfig.headers,
  };

  return headers;
}

let rawRequest: ReturnType<typeof getApi>;

async function request<T extends ResponseSuccess<unknown>>(
  ...args: Parameters<typeof rawRequest>
): Promise<T['data']> {
  checkClientConfig(echoClientConfig);

  if (!rawRequest) {
    // eslint-disable-next-line no-console
    console.debug('Initiating echo API with', echoClientConfig.baseUrl);

    rawRequest = getApi(echoClientConfig.baseUrl, { headers: getDefaultHeaders() });
  }

  const response = await rawRequest<T>(...args);

  return response.data;
}

async function getActivities(params: ActivitiesRequest) {
  return await request<ActivitiesResponse>('/api/v1/activities', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getUnifiedActivities(params: UnifiedActivityRequest) {
  return await request<UnifiedActivityResponse>('/api/v1/activities/unified', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getActivityActor(target: EthosUserTarget) {
  const userkey = toUserKey(target);

  if (!isTargetValid(target)) {
    return null;
  }

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

async function getCredibilityLeaderboard(params?: { order?: 'asc' | 'desc' }) {
  const searchParams = new URLSearchParams();

  if (params?.order) {
    searchParams.set('order', params.order);
  }
  const queryString = searchParams.toString();
  const url = `/api/v1/profiles/credibility-leaderboard${queryString ? `?${queryString}` : ''}`;

  return await request<CredibilityLeaderboardQueryResponse>(url);
}

async function getXpLeaderboard() {
  return await request<XPLeaderboardQueryResponse>('/api/v1/profiles/xp-leaderboard');
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

async function getSignatureForRegisterAddress(params: SignatureRegisterAddressRequest) {
  return await request<SignatureRegisterAddressResponse>('/api/signatures/register-address', {
    method: 'POST',
    body: JSON.stringify(params),
  });
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
    `/api/twitter/users/search?${searchParams.toString()}`,
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

async function getScore(target: EthosUserTarget) {
  const targetKey = toUserKey(target);

  if (!isTargetValid(target)) {
    return null;
  }

  return await request<ScoreResponse>(`/api/v1/score/${targetKey}`).then((res) => res.score);
}

async function getScoreHistory(
  target: EthosUserTarget,
  days: number = 30,
  extended: boolean = false,
  pagination?: { limit?: number; offset?: number },
) {
  const targetKey = toUserKey(target);

  if (!isTargetValid(target)) return null;

  const searchParams = new URLSearchParams({ duration: `${days}d` });

  if (extended) searchParams.set('expanded', 'true');

  if (pagination?.limit) searchParams.set('limit', String(pagination.limit));

  if (pagination?.offset) searchParams.set('offset', String(pagination.offset));

  return await request<ScoreHistoryResponse>(
    `/api/v1/score/${targetKey}/history?${searchParams.toString()}`,
  );
}

async function getScoreElements(target: EthosUserTarget): Promise<ScoreResponse['data'] | null> {
  const targetKey = toUserKey(target);

  if (!isTargetValid(target)) {
    return null;
  }

  return await request<ScoreResponse>(`/api/v1/score/${targetKey}`);
}

async function simulateScore(
  params: ScoreSimulationRequest,
): Promise<ScoreSimulationResponse['data']> {
  return await request<ScoreSimulationResponse>(`/api/v1/score/simulate`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
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
  const url = new URL(
    `/api/v1/onboarding/status/${profileId}?${params}`,
    echoClientConfig?.baseUrl,
  );

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

async function getMarketsByIds(
  params: MarketBulkInfoRequest,
): Promise<MarketBulkInfoResponse['data']> {
  return await request<MarketBulkInfoResponse>('/api/v1/markets/bulk', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getMarketPriceHistory(
  profileId: number,
  window: MarketPriceHistoryRequest['window'],
): Promise<MarketPriceHistoryResponse['data']> {
  return await request<MarketPriceHistoryResponse>(
    `/api/v1/markets/${profileId}/price/history?window=${window}`,
  );
}

async function getMarketTransactionHistory({
  profileId,
  pagination,
  voteTypeFilter,
}: MarketTransactionHistoryRequest) {
  const searchParams = new URLSearchParams();

  if (profileId) {
    searchParams.set('profileId', profileId.toString());
  }

  if (pagination?.limit) {
    searchParams.set('limit', pagination.limit.toString());
  }

  if (pagination?.offset) {
    searchParams.set('offset', pagination.offset.toString());
  }

  if (voteTypeFilter) {
    searchParams.set('voteTypeFilter', voteTypeFilter);
  }

  return await request<MarketTransactionHistoryResponse>(
    `/api/v1/markets/tx/history?${searchParams.toString()}`,
  );
}

export async function getMarketTxHistoryByAddress(
  params: MarketTransactionHistoryByAddressRequest,
) {
  const searchParams = new URLSearchParams();

  if (params.pagination?.limit) {
    searchParams.set('limit', params.pagination.limit.toString());
  }

  if (params.pagination?.offset) {
    searchParams.set('offset', params.pagination.offset.toString());
  }

  if (params.voteTypeFilter) {
    searchParams.set('voteTypeFilter', params.voteTypeFilter);
  }

  return await request<MarketTransactionHistoryByAddressResponse>(
    `/api/v1/markets/activity/${params.address}?${searchParams.toString()}`,
  );
}

async function getMarketHolders(profileId: number) {
  return await request<MarketHoldersResponse>(`/api/v1/markets/${profileId}/holders`);
}

async function getMarketHoldingsByAddress(params: MarketHoldingsByAddressRequest) {
  const searchParams = new URLSearchParams();

  if (params.pagination?.limit) {
    searchParams.set('limit', params.pagination.limit.toString());
  }

  if (params.pagination?.offset) {
    searchParams.set('offset', params.pagination.offset.toString());
  }

  return await request<MarketHoldingsByAddressResponse>(
    `/api/v1/markets/holdings/${params.address}?${searchParams.toString()}`,
  );
}

async function getMarketHoldingsTotalByAddress(address: Address) {
  return await request<MarketHoldingsTotalByAddressResponse>(
    `/api/v1/markets/holdings/${address}/total`,
  );
}

async function getMarketVolumeTradedByAddress(address: string) {
  return await request<MarketVolumeTradedByAddressResponse>(`/api/v1/markets/volume/${address}`);
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

async function getContributionByProfile({ profileId, status }: ContributionByProfileRequest) {
  const params = new URLSearchParams();
  status.forEach((x) => {
    params.append('status[]', x);
  });

  return await request<ContributionByProfileResponse>(
    `/api/v1/contributions/${profileId}?${params.toString()}`,
  );
}

async function recordContributionAction(params: ContributionActionRequest) {
  await request<ContributionActionResponse>('/api/v1/contributions/action', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function getContributionStatsByProfile({ profileId }: ContributionStatsRequest) {
  return await request<ContributionStatsResponse>(`/api/v1/contributions/${profileId}/stats`);
}

async function contributionDaily(params: ContributionDailyRequest) {
  return await request<ContributionDailyResponse>('/api/v1/contributions/daily', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function updateUserFCMToken(params: UpdateUserFCMTokenRequest) {
  return await request<UpdateUserFCMTokenResponse>(`/api/v1/notifications/user-fcm-token`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function createPrivyLogin(privyToken: string, privyIdToken: string) {
  await request<PrivyLoginResponse>('/api/v1/privy-logins', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${privyToken}`,
      'X-Privy-Id-Token': privyIdToken,
    },
  });
}

async function getXpHistory({
  userkey,
  pagination,
}: XpHistoryRequest): Promise<XpHistoryResponse['data']> {
  const searchParams = new URLSearchParams();

  if (typeof pagination?.limit === 'number') {
    searchParams.append('limit', String(pagination.limit));
  }

  if (typeof pagination?.offset === 'number') {
    searchParams.append('offset', String(pagination.offset));
  }

  return await request<XpHistoryResponse>(
    `/api/v1/xp/${userkey}/history?${searchParams.toString()}`,
  );
}

export const echoClient = {
  activities: {
    unified: getUnifiedActivities,
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
    credibilityLeaderboard: getCredibilityLeaderboard,
    xpLeaderboard: getXpLeaderboard,
  },
  xp: {
    history: getXpHistory,
  },
  signatures: {
    createAttestation: getSignatureForCreateAttestation,
    registerAddress: getSignatureForRegisterAddress,
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
    simulate: simulateScore,
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
    infoByIds: getMarketsByIds,
    priceHistory: getMarketPriceHistory,
    transactionHistory: getMarketTransactionHistory,
    txHistoryByAddress: getMarketTxHistoryByAddress,
    holdingsByAddress: getMarketHoldingsByAddress,
    holdingsTotalByAddress: getMarketHoldingsTotalByAddress,
    holders: getMarketHolders,
    volumeByAddress: getMarketVolumeTradedByAddress,
  },
  fees: {
    info: getFeesInfo,
  },
  events: {
    process: processEvents,
  },
  contribution: {
    getByProfile: getContributionByProfile,
    recordAction: recordContributionAction,
    statsByProfile: getContributionStatsByProfile,
    daily: contributionDaily,
  },
  fcm: {
    updateUserToken: updateUserFCMToken,
  },
  privyLogins: {
    create: createPrivyLogin,
  },
};
