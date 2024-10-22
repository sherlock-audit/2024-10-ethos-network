import { type AttestationTypes, type TargetContract } from '@ethos/contracts';
import {
  toUserKey,
  type EthosUserTarget,
  reviewActivity,
  type VoteInfo,
  vouchActivity,
  type ActivityActor,
  invitationAcceptedActivity,
  type InvitationAcceptedActivityInfo,
  type ReviewActivityInfo,
  type VouchActivityInfo,
  type UnvouchActivityInfo,
  unvouchActivity,
  type AttestationActivityInfo,
  attestationActivity,
  type ReplySummary,
  X_SERVICE,
  fromUserKey,
} from '@ethos/domain';
import { duration, isValidAddress, notEmpty, shortenHash } from '@ethos/helpers';
import { Prisma } from '@prisma/client';
import { type Log } from 'ethers';
import { cloneDeep } from 'lodash';
import { getAddress, zeroAddress } from 'viem';
import { cachedOperation, createLRUCache } from '../../common/cache/lru.cache';
import { FEATURE_GATES, getGlobalFeatureGate } from '../../common/statsig';
import { convert } from '../../data/conversion';
import { prisma } from '../../data/db';
import { getLatestScore } from '../../data/score';
import { user } from '../../data/user/lookup';
import { type PrismaTwitterProfileCache } from '../../data/user/twitter-profile';
import { ReplySummaryService } from '../reply/reply-summary-service';
import { Service } from '../service.base';
import { ServiceError } from '../service.error';
import { type AnyRecord } from '../service.types';

// cache actors so that if we look up the same actor multiple times in a short
// period of time, we don't hit the database or external APIs too hard
const FIVE_SECONDS_MILLIS = duration(5, 'seconds').toMilliseconds();
const actorCache = createLRUCache<ActivityActor>(FIVE_SECONDS_MILLIS);

export abstract class SharedActivity<
  TInput extends Zod.AnyZodObject,
  TOutput extends AnyRecord,
> extends Service<TInput, TOutput> {
  public async getActor(target: EthosUserTarget): Promise<ActivityActor> {
    return await cachedOperation('actorCache', actorCache, target, this._getActor.bind(this));
  }

  // TODO: remove in favor of getActors once it supports attestation as target
  // or when we migrate to single target profileId
  private async _getActor(target: EthosUserTarget): Promise<ActivityActor> {
    if (getGlobalFeatureGate(FEATURE_GATES.USE_VIEWS_FOR_ACTORS)) {
      this.logger.debug('[_getActor] FEATURE_GATES.USE_VIEWS_FOR_ACTORS enabled');
      const actors = await this.getActorsFromView([target]);

      if (actors.length === 0) {
        return {
          userkey: toUserKey(target),
          name: null,
          avatar: null,
          description: null,
          username: null,
          primaryAddress: zeroAddress,
          score: 0,
        };
      }

      return actors[0];
    }

    const profile = await user.getProfile(target);

    if ('profileId' in target) {
      if (!profile) {
        throw ServiceError.NotFound('Profile not found');
      }
    }

    const [{ name, username, avatar, description }, score] = await Promise.all([
      user.getNameAvatarDescription(target),
      getLatestScore(target, { allowDirty: true, asyncCalculate: true }).then(
        (data) => data?.score ?? 0,
      ),
    ]);
    const primaryAddress = await user.getPrimaryAddress(target);

    return {
      userkey: toUserKey(target),
      avatar,
      name,
      username,
      description,
      score,
      profileId: profile?.id,
      primaryAddress: primaryAddress ?? zeroAddress,
    };
  }

  public async getActors(targets: EthosUserTarget[]): Promise<ActivityActor[]> {
    if (getGlobalFeatureGate(FEATURE_GATES.USE_VIEWS_FOR_ACTORS)) {
      this.logger.debug('[getActors] FEATURE_GATES.USE_VIEWS_FOR_ACTORS enabled');

      return await this.getActorsFromView(targets);
    }

    const profileIdMap = await user.getProfileIdsByTargets(targets);

    const promises = targets.map(async (target) => {
      const profileId = profileIdMap.get(target);

      if ('profileId' in target && !profileId) {
        return null;
      }

      // prefer to use profile id if it exists, otherwise fallback to address/attestation
      if (profileId) target = { profileId };

      const [{ name, username, avatar, description }, score] = await Promise.all([
        user.getNameAvatarDescription(target),
        getLatestScore(target, { allowDirty: true, asyncCalculate: true }).then(
          (data) => data?.score ?? 0,
        ),
      ]);

      const primaryAddress = await user.getPrimaryAddress(target);

      return {
        userkey: toUserKey(target),
        avatar,
        name,
        username,
        description,
        score,
        primaryAddress: primaryAddress ?? zeroAddress,
        profileId: profileId ?? undefined,
      };
    });

    const actors = await Promise.all(promises);

    return actors.filter(notEmpty);
  }

  public async getActorsFromView(targets: EthosUserTarget[]): Promise<ActivityActor[]> {
    if (targets.length === 0) {
      return [];
    }

    this.logger.debug(`Requested ${targets.length} actors.`);
    this.logger.debug(JSON.stringify(targets));

    const userKeysMap: Map<string, string> = targets.reduce((map, target) => {
      // to map the search userkey in lowercase to the original case-sensitive target
      map.set(toUserKey(target, true), toUserKey(target));

      return map;
    }, new Map<string, string>());
    const userKeys = Array.from(userKeysMap.keys());

    const actors = await prisma.$queryRaw<ActivityActor[]>`
            WITH
            PROFILE_IDS AS (
                SELECT
                    ID, TARGET
                FROM
                    TARGETS
                WHERE
                    TARGET IN (${Prisma.join(userKeys)})
            ),
            NON_USER_NAMES AS (
                SELECT
                    *
                FROM
                    NAMES
                WHERE
                    ID IS NULL
                    AND TARGET IN (${Prisma.join(userKeys)})
            ),
            NON_USER_SCORES AS (
                SELECT
                    *
                FROM
                    SCORES
                WHERE
                    ID IS NULL
                    AND TARGET IN (${Prisma.join(userKeys)})
            )
            (
                SELECT DISTINCT ON (PIDS.ID)
                    'profileId:' || PIDS.ID::TEXT ID,
                    PIDS.ID "profileId",
                    LOWER(PA.ADDRESS) "primaryAddress",
                    COALESCE(PIDS.TARGET, N.TARGET, S.TARGET) USERKEY,
                    N.NAME,
                    N.AVATAR,
                    N.USERNAME,
                    N.DESCRIPTION,
                    COALESCE(S.SCORE, 0) SCORE
                FROM
                    PROFILE_IDS PIDS
                    JOIN PROFILE_ADDRESSES PA ON PA."profileId" = PIDS.ID
                    LEFT JOIN NAMES N ON N.ID = PIDS.ID
                    LEFT JOIN SCORES S ON S.ID = PIDS.ID
                    OR S.TARGET = N.TARGET
                ORDER BY
                    PIDS.ID,
                    PA.ID
            )
        UNION
        SELECT
            COALESCE(N.TARGET, S.TARGET) ID,
            NULL "profileId",
            CASE
                WHEN COALESCE(N.TARGET, S.TARGET) LIKE 'address:%' THEN REGEXP_REPLACE(COALESCE(N.TARGET, S.TARGET), '^(address:)', '')
                ELSE NULL
            END "primaryAddress",
            COALESCE(N.TARGET, S.TARGET) USERKEY,
            N.NAME,
            N.AVATAR,
            N.USERNAME,
            N.DESCRIPTION,
            COALESCE(S.SCORE, 0) SCORE
        FROM
            NON_USER_NAMES N
            LEFT JOIN NON_USER_SCORES S ON S.TARGET = N.TARGET`;

    this.logger.debug(`Found ${actors.length} actors.`);
    this.logger.debug(JSON.stringify(actors));

    return actors.map((actor) => {
      if (actor?.score === 0) {
        void getLatestScore(fromUserKey(actor?.userkey), {
          allowDirty: true,
          asyncCalculate: true,
        });
      }

      return {
        ...actor,
        userkey: userKeysMap.get(actor.userkey) ?? actor.userkey,
        name: actor.name ?? shortenHash(actor.primaryAddress),
        primaryAddress: actor.primaryAddress ?? zeroAddress,
        profileId: actor.profileId ?? undefined,
      };
    });
  }

  public async getProfileActivities(ids: number[]): Promise<InvitationAcceptedActivityInfo[]> {
    if (ids.length === 0) return [];
    // find the profiles
    const profiles = await prisma.profile.findMany({
      where: { id: { in: ids } },
      include: {
        ProfileAddress: true,
        Attestation: true,
        ProfileEvent: {
          include: {
            event: true,
          },
          orderBy: {
            event: { createdAt: 'asc' },
          },
        },
      },
    });

    // append activity info for each
    const activities = await Promise.all(
      profiles.map(async (profile) => {
        const addresses = profile.ProfileAddress.map((pa) => getAddress(pa.address));
        const data: InvitationAcceptedActivityInfo['data'] = convert.toProfile(profile, addresses);
        const [author, subject] = await Promise.all([
          this.getActor({ profileId: profile.invitedBy }),
          this.getActor({ profileId: profile.id }),
        ]);
        const events = profile.ProfileEvent.map((event) => convert.toBlockchainEvent(event.event));

        const info: InvitationAcceptedActivityInfo = {
          type: invitationAcceptedActivity,
          data,
          timestamp: data.createdAt,
          votes: {
            upvotes: 0,
            downvotes: 0,
          },
          replySummary: { count: 0, participated: false },
          author,
          subject,
          events,
        };

        return info;
      }),
    );

    return activities;
  }

  public async getReviews(
    ids: number[],
    currentUserProfileId?: number | null,
  ): Promise<ReviewActivityInfo[]> {
    if (ids.length === 0) return [];
    const [reviews, voteInfoMap, replySummaryMap] = await Promise.all([
      prisma.review.findMany({
        where: { id: { in: ids } },
        include: {
          ReviewEvent: {
            include: {
              event: true,
            },
            orderBy: {
              event: { createdAt: 'asc' },
            },
          },
        },
      }),
      this.getVoteInfo(reviewActivity, ids),
      this.getReplySummary(reviewActivity, ids, currentUserProfileId),
    ]);

    const activities = await Promise.all(
      reviews.map(async (review) => {
        const data = convert.toReview(review);
        const reviewTarget: EthosUserTarget =
          !isValidAddress(review.subject) && review.account && review.service
            ? { service: review.service, account: review.account }
            : { address: getAddress(review.subject) };

        const [author, subject] = await Promise.all([
          this.getActor({ address: getAddress(review.author) }),
          this.getActor(reviewTarget),
        ]);

        const events = review.ReviewEvent.map((reviewEvent) =>
          convert.toBlockchainEvent(reviewEvent.event),
        );

        const info: ReviewActivityInfo = {
          type: reviewActivity,
          data,
          timestamp: data.createdAt,
          votes: voteInfoMap[review.id],
          replySummary: replySummaryMap[review.id],
          author,
          subject,
          events,
        };

        return info;
      }),
    );

    return activities;
  }

  public async getVouches(
    ids: number[],
    currentUserProfileId?: number | null,
  ): Promise<VouchActivityInfo[]> {
    if (ids.length === 0) return [];
    const [vouches, voteInfoMap, replySummaryMap] = await Promise.all([
      prisma.vouch.findMany({
        where: { id: { in: ids } },
        include: {
          VouchEvent: {
            include: {
              event: true,
            },
          },
        },
      }),
      this.getVoteInfo(vouchActivity, ids),
      this.getReplySummary(vouchActivity, ids, currentUserProfileId),
    ]);

    const activities = await Promise.all(
      vouches.map(async (vouch) => {
        const data = convert.toVouch(vouch);

        const [author, subject] = await Promise.all([
          this.getActor({ profileId: vouch.authorProfileId }),
          this.getActor({ profileId: vouch.subjectProfileId }),
        ]);

        const events = vouch.VouchEvent.map((vouchEvent) =>
          convert.toBlockchainEvent(vouchEvent.event),
        );

        const info: VouchActivityInfo = {
          type: vouchActivity,
          data,
          timestamp: data.activityCheckpoints.vouchedAt,
          votes: voteInfoMap[vouch.id],
          replySummary: replySummaryMap[vouch.id],
          author,
          subject,
          events,
        };

        return info;
      }),
    );

    return activities;
  }

  public async getUnvouches(
    ids: number[],
    currentUserProfileId?: number | null,
  ): Promise<UnvouchActivityInfo[]> {
    if (ids.length === 0) return [];
    const [vouches, voteInfoMap, replySummaryMap] = await Promise.all([
      prisma.vouch.findMany({
        where: {
          id: { in: ids },
          unvouchedAt: { not: null },
        },
        include: {
          VouchEvent: {
            include: {
              event: true,
            },
          },
        },
      }),
      this.getVoteInfo(vouchActivity, ids),
      this.getReplySummary(vouchActivity, ids, currentUserProfileId),
    ]);

    const activities = await Promise.all(
      vouches.map(async (vouch) => {
        const data = convert.toVouch(vouch);

        const [author, subject] = await Promise.all([
          this.getActor({ profileId: vouch.authorProfileId }),
          this.getActor({ profileId: vouch.subjectProfileId }),
        ]);

        const events = vouch.VouchEvent.map((vouchEvent) =>
          convert.toBlockchainEvent(vouchEvent.event),
        );

        const info: UnvouchActivityInfo = {
          type: unvouchActivity,
          data,
          timestamp: data.activityCheckpoints.unvouchedAt,
          votes: voteInfoMap[vouch.id],
          replySummary: replySummaryMap[vouch.id],
          author,
          subject,
          events,
        };

        return info;
      }),
    );

    return activities;
  }

  public async getAttestations(
    ids: number[],
    currentUserProfileId?: number | null,
  ): Promise<AttestationActivityInfo[]> {
    if (ids.length === 0) return [];
    const [attestations, voteInfoMap, replySummaryMap] = await Promise.all([
      prisma.attestation.findMany({
        where: { id: { in: ids } },
        include: {
          AttestationEvent: {
            include: {
              event: true,
            },
          },
        },
      }),
      this.getVoteInfo(attestationActivity, ids),
      this.getReplySummary(attestationActivity, ids, currentUserProfileId),
    ]);

    const xComAttestationAccounts = attestations
      .filter((a) => a.service === X_SERVICE)
      .map((a) => a.account);

    const xComAccounts = xComAttestationAccounts.length
      ? await prisma.twitterProfileCache.findMany({
          where: {
            id: { in: xComAttestationAccounts },
          },
        })
      : [];

    const xComAccountsMap = xComAccounts.reduce<Map<string, PrismaTwitterProfileCache>>(
      (acc, x) => {
        if (!acc.has(x.id)) {
          acc.set(x.id, x);
        }

        return acc;
      },
      new Map(),
    );

    const activities = await Promise.all(
      attestations.map(async (attestation) => {
        const xComAccount = xComAccountsMap.get(attestation.account);
        const data = convert.toAttestationFromPrisma(attestation);

        const author = await this.getActor({ profileId: attestation.profileId });

        const events = attestation.AttestationEvent.map((attestationEvent) =>
          convert.toBlockchainEvent(attestationEvent.event),
        );

        const parsedEvents = attestation.AttestationEvent.map((e) =>
          this.blockchainManager.ethosAttestation.contract.interface.parseLog(
            e.event.logData as unknown as Log,
          ),
        );

        const attestationCreatedEvent = parsedEvents.find(
          (e) => e?.name === 'AttestationCreated',
        ) as unknown as AttestationTypes.AttestationCreatedEvent.LogDescription | undefined;

        // This should never happen
        if (!attestationCreatedEvent) {
          throw new Error('Could not find AttestationCreated event');
        }

        const info: AttestationActivityInfo = {
          type: attestationActivity,
          data: {
            ...data,
            username: xComAccount?.username ?? '',
            evidence: attestationCreatedEvent.args.evidence,
          },
          timestamp: data.createdAt,
          votes: voteInfoMap[data.id],
          replySummary: replySummaryMap[data.id],
          author,
          subject: author,
          events,
        };

        return info;
      }),
    );

    return activities;
  }

  public async getVoteInfo(type: TargetContract, ids: number[]): Promise<Record<number, VoteInfo>> {
    const empty: VoteInfo = {
      upvotes: 0,
      downvotes: 0,
    };
    const targetContract = this.blockchainManager.getContractAddress(type);
    const voteInfoMap: Record<number, VoteInfo> = {};

    // initialize a value for each id as 0/0/null
    for (const id of ids) {
      voteInfoMap[id] = cloneDeep(empty);
    }

    const voteCounts = await prisma.vote.groupBy({
      by: ['targetId', 'isUpvote'],
      where: {
        targetContract,
        targetId: { in: ids },
        isArchived: false,
      },
      _count: {
        _all: true,
      },
    });

    for (const voteCount of voteCounts) {
      if (voteCount.isUpvote) {
        voteInfoMap[voteCount.targetId].upvotes = voteCount._count._all;
      } else {
        voteInfoMap[voteCount.targetId].downvotes = voteCount._count._all;
      }
    }

    return voteInfoMap;
  }

  public async getReplySummary(
    type: TargetContract,
    ids: number[],
    currentUserProfileId?: number | null,
  ): Promise<Record<number, ReplySummary>> {
    const targetContract = this.blockchainManager.getContractAddress(type);

    const replySummaryService = this.useService(ReplySummaryService);
    const replySummary = await replySummaryService.run({
      targetContract,
      parentIds: ids,
      currentUserProfileId: currentUserProfileId ?? null,
    });

    return replySummary[targetContract];
  }
}
