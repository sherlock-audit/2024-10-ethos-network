import {
  fromUserKey,
  type ActivityInfo,
  reviewActivity,
  vouchActivity,
  activities,
  type ActivityType,
  invitationAcceptedActivity,
  attestationActivity,
  unvouchActivity,
  type LiteProfile,
} from '@ethos/domain';
import { type PaginatedResponse } from '@ethos/helpers';
import { Prisma } from '@prisma/client';
import { type Address } from 'viem';
import { z } from 'zod';
import { prisma } from '../../data/db';
import { user } from '../../data/user/lookup';
import { ServiceError } from '../service.error';
import { type AnyRecord } from '../service.types';
import { validators } from '../service.validator';
import { SharedActivity } from './shared.activity';

const schema = z.object({
  filter: z.array(z.enum(activities)).nonempty().optional(),
  target: validators.ethosUserKey().optional(),
  direction: z.optional(z.enum(['author', 'subject'])),
  currentUserProfileId: z.number().positive().optional().nullable(),
});

const schemaWithPagination = schema.merge(validators.paginationSchema());

type RecentActivityParams = z.infer<typeof schemaWithPagination>;
type Output = PaginatedResponse<ActivityInfo>;

export class RecentActivityService extends SharedActivity<typeof schemaWithPagination, Output> {
  validate(params: AnyRecord): RecentActivityParams {
    return this.validator(params, schemaWithPagination);
  }

  async execute(input: RecentActivityParams): Promise<Output> {
    return await this.fetch(input);
  }

  async fetch(input: RecentActivityParams): Promise<Output> {
    const { limit, offset } = input.pagination;

    // retrieve distinct activities for each activityType requested (e.g. review, vouch, unvouch, etc.)
    const activities: SubqueryResult = await this.recentActivityData(input, limit, offset);
    const values = activities.activities.sort((a, b) => b.timestamp - a.timestamp);

    return {
      values,
      total: activities.count,
      limit: input.pagination.limit,
      offset: input.pagination.offset,
    };
  }

  /**
   * Fetches recent activity data based on the input parameters.
   *
   * @param input - The parameters passed to the service
   *
   * This function handles different scenarios:
   * 1. If a target is specified:
   *    a. For users with an Ethos profile, it fetches activities related to that profile.
   *    b. For non-Ethos user addresses, it fetches activities related to that address.
   *    c. For non-Ethos user attestations, it fetches activities (usually reviews) related to that attestation.
   * 2. If no target is specified, it returns all activities of the given type without user filtering.
   *
   * @throws {ServiceError.NotFound} If a profileId is provided but the Ethos profile doesn't exist.
   * @throws {ServiceError.BadRequest} If the target user identifier is malformed.
   */
  private async recentActivityData(
    input: RecentActivityParams,
    limit: number,
    offset: number,
  ): Promise<SubqueryResult> {
    if (input.target) {
      const target = fromUserKey(input.target);
      const profile = await user.getProfile(target);

      if (profile) {
        // fetch activities for users with an ethos profile
        return await this.recentActivityForProfile(profile, input, limit, offset);
      } else if ('address' in target) {
        // fetch activities for non-ethos user address
        return await this.recentActivityForAddresses([target.address], input, limit, offset);
      } else if ('service' in target && 'account' in target) {
        // fetch activities for non-ethos user attestation (should be reviews only)
        return await this.recentActivityForAttestations([target], input, limit, offset);
      } else if ('profileId' in target) {
        // they requested a profileId for a user who doesn't exist
        throw ServiceError.NotFound('Ethos profile not found', {
          fields: ['profileId'],
        });
      } else {
        throw ServiceError.BadRequest('Invalid target', {
          fields: ['target'],
        });
      }
    } else {
      // return all activities without filtering by user
      return await this.allRecentActivity(input, limit, offset);
    }
  }

  private async allRecentActivity(
    input: RecentActivityParams,
    limit: number,
    offset: number,
  ): Promise<SubqueryResult> {
    const filters = (await this.getActivityFilters(input, {}))
      .flat()
      .filter((filter) => filter !== Prisma.empty);

    return await this.executeQueries(filters, limit, offset, input.currentUserProfileId);
  }

  private async recentActivityForAddresses(
    addresses: Address[],
    input: RecentActivityParams,
    limit: number,
    offset: number,
  ): Promise<SubqueryResult> {
    const filters = (
      await Promise.all(
        addresses.map(async (address) => {
          const queryParams: SubqueryParams = {
            address,
            direction: input.direction,
          };

          return await this.getActivityFilters(input, queryParams);
        }),
      )
    )
      .flat()
      .filter((filter) => filter !== Prisma.empty);

    return await this.executeQueries(filters, limit, offset, input.currentUserProfileId);
  }

  private async recentActivityForAttestations(
    attestations: Array<{ service: string; account: string }>,
    input: RecentActivityParams,
    limit: number,
    offset: number,
  ): Promise<SubqueryResult> {
    const filters = (
      await Promise.all(
        attestations.map(async (attestation) => {
          const queryParams: SubqueryParams = {
            service: attestation.service,
            account: attestation.account,
            direction: input.direction,
          };

          return await this.getActivityFilters(input, queryParams);
        }),
      )
    )
      .flat()
      .filter((filter) => filter !== Prisma.empty);

    return await this.executeQueries(filters, limit, offset, input.currentUserProfileId);
  }

  private async recentActivityForProfile(
    profile: LiteProfile,
    input: RecentActivityParams,
    limit: number,
    offset: number,
  ): Promise<SubqueryResult> {
    let filters = [];

    const [profileAddresses, attestations] = await Promise.all([
      user.getAddresses({ profileId: profile.id }),
      user.getAttestations(profile.id),
    ]);

    // activities for attestations
    filters.push(
      ...(await Promise.all(
        attestations.map(async (attestation) => {
          const queryParams: SubqueryParams = {
            service: attestation.service,
            account: attestation.account,
            direction: input.direction,
          };

          return await this.getActivityFilters(input, queryParams);
        }),
      )),
    );

    // activities for addresses
    filters.push(
      ...(await Promise.all(
        profileAddresses.allAddresses.map(async (address) => {
          const queryParams: SubqueryParams = {
            address,
            direction: input.direction,
          };

          return await this.getActivityFilters(input, queryParams);
        }),
      )),
    );

    filters.push(
      ...(await this.getActivityFilters(input, {
        profileId: profile.id,
        direction: input.direction,
      })),
    );

    filters = filters.flat().filter((filter) => filter !== Prisma.empty);

    return await this.executeQueries(filters, limit, offset, input.currentUserProfileId);
  }

  private async getActivityFilters(
    input: RecentActivityParams,
    f: SubqueryParams,
  ): Promise<Prisma.Sql[]> {
    const activityFilter = input.filter ?? activities;

    const activityMap: ActivityFilterMap = new Map([
      [attestationActivity, async (f) => await this.recentAttestationFilter(f)],
      [invitationAcceptedActivity, async (f) => await this.recentInvitationsAcceptedFilter(f)],
      [reviewActivity, async (f) => await this.recentReviewsFilter(f)],
      [vouchActivity, async (f) => await this.recentVouchesFilter(f, true)],
      [unvouchActivity, async (f) => await this.recentVouchesFilter(f, false)],
    ]);

    return await Promise.all(
      activityFilter.map(async (activityType: ActivityType) => {
        const filterFunction =
          activityMap.get(activityType) ?? (async () => await Promise.resolve(Prisma.empty));

        return await filterFunction(f);
      }),
    );
  }

  private async executeQueries(
    filters: Prisma.Sql[],
    limit: number,
    offset: number,
    currentUserProfileId?: number | null,
  ): Promise<SubqueryResult> {
    filters = filters.flat().filter((filter) => filter && filter !== Prisma.empty);

    let where = Prisma.empty;

    if (filters.length > 0) {
      where = Prisma.sql`WHERE ${Prisma.join(filters, 'OR')}`;
    }

    const countQuery = Prisma.sql`
      WITH distinct_activities AS (
      SELECT DISTINCT activity_type type,
        CASE WHEN activity_type = 'invitation-accepted' THEN CAST(subject AS INTEGER)
            ELSE id
        END id
      FROM activities
      ${where})
      SELECT count(*) FROM distinct_activities`;

    const total = (await prisma.$queryRaw<Array<{ count: number }>>(countQuery))[0];

    const mainQuery = Prisma.sql`
      SELECT DISTINCT activity_type type,
        CASE WHEN activity_type = 'invitation-accepted' THEN CAST(subject AS INTEGER)
            ELSE id
        END id, "createdAt"
      FROM activities
      ${where}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}`;

    const rows =
      await prisma.$queryRaw<Array<{ type: string; id: number; createdAt: Date }>>(mainQuery);

    const ids = rows.reduce((acc: ActivityIdsAccumulator, curr) => {
      if (!acc[curr.type]) {
        acc[curr.type] = [];
      }

      (acc[curr.type] as number[]).push(curr.id);

      return acc;
    }, {});

    const activities: ActivityInfo[] = [];

    activities.push(
      ...(
        await Promise.all(
          Object.keys(ids).map(async (activity) => {
            switch (activity) {
              case attestationActivity:
                return await this.getAttestations(ids.attestation ?? []);
              case invitationAcceptedActivity:
                return await this.getProfileActivities(ids[invitationAcceptedActivity] ?? []);
              case reviewActivity:
                return await this.getReviews(ids.review ?? [], currentUserProfileId);
              case vouchActivity:
                return await this.getVouches(ids.vouch ?? [], currentUserProfileId);
              case unvouchActivity:
                return await this.getUnvouches(ids.unvouch ?? [], currentUserProfileId);
              default:
                return await Promise.resolve([]);
            }
          }),
        )
      ).flat(),
    );

    return {
      count: Number(total.count),
      activities,
    };
  }

  private async recentReviewsFilter(queryParams: SubqueryParams): Promise<Prisma.Sql> {
    const type = 'review';

    if (queryParams.address) {
      const profileId = (await user.getProfileId({ address: queryParams.address })) ?? undefined;

      if (queryParams.direction === 'author' && profileId) {
        return Prisma.sql`(activity_type = ${type} AND "authorProfileId" = ${profileId})`;
      } else if (queryParams.direction === 'subject') {
        return Prisma.sql`(activity_type = ${type} AND subject = ${queryParams.address})`;
      } else {
        return Prisma.sql`(activity_type = ${type} AND ("authorProfileId" = ${
          profileId ?? null
        } OR subject = ${queryParams.address}))`;
      }
    } else if (queryParams.service && queryParams.account) {
      return Prisma.sql`(activity_type = ${type} AND subject = ${queryParams.service + ':' + queryParams.account})`;
    } else {
      return Prisma.empty;
    }
  }

  private async recentVouchesFilter(
    queryParams: SubqueryParams,
    isVouch: boolean,
  ): Promise<Prisma.Sql> {
    const type = isVouch ? 'vouch' : 'unvouch';

    const profileId = queryParams.address
      ? ((await user.getProfileId({ address: queryParams.address })) ?? undefined)
      : queryParams.profileId;

    if (profileId) {
      if (queryParams.direction === 'author') {
        return Prisma.sql`(activity_type = ${type} AND "authorProfileId" = ${profileId})`;
      } else if (queryParams.direction === 'subject') {
        return Prisma.sql`(activity_type = ${type} AND subject = ${profileId.toString()})`;
      } else {
        return Prisma.sql`(activity_type = ${type} AND ("authorProfileId" = ${profileId} OR subject = ${profileId.toString()}))`;
      }
    } else {
      // TODO we currently only support looking up unvouches by address or profileId
      return Prisma.empty;
    }
  }

  private async recentAttestationFilter(queryParams: SubqueryParams): Promise<Prisma.Sql> {
    const type = 'attestation';

    const profileId = queryParams.address
      ? ((await user.getProfileId({ address: queryParams.address })) ?? undefined)
      : queryParams.profileId;

    if (queryParams.service && queryParams.account) {
      return Prisma.sql`(activity_type = ${type} AND subject = ${queryParams.service + ':' + queryParams.account})`;
    } else if (profileId) {
      return Prisma.sql`(activity_type = ${type} AND "authorProfileId" = ${profileId})`;
    } else {
      return Prisma.empty;
    }
  }

  private async recentInvitationsAcceptedFilter(queryParams: SubqueryParams): Promise<Prisma.Sql> {
    const type = 'invitation-accepted';

    if (queryParams.profileId) {
      if (queryParams.direction === 'author') {
        return Prisma.sql`(activity_type = ${type} AND "authorProfileId" = ${queryParams.profileId})`;
      } else if (queryParams.direction === 'subject') {
        return Prisma.sql`(activity_type = ${type} AND subject = ${queryParams.profileId.toString()})`;
      } else {
        return Prisma.sql`(activity_type = ${type} AND ("authorProfileId" = ${queryParams.profileId} OR subject = ${queryParams.profileId.toString()}))`;
      }
    } else if (queryParams.address) {
      const profileIdByAddress = await user.getProfileId({ address: queryParams.address });

      if (queryParams.direction === 'author') {
        throw new ServiceError('Not implemented: looking up invitations by sender address', {
          fields: ['address', 'direction'],
          code: 'NOT_IMPLEMENTED',
          status: 501,
        });
      } else if (profileIdByAddress) {
        return Prisma.sql`(activity_type = ${type} AND subject = ${profileIdByAddress.toString()})`;
      }
    } else if (queryParams.service && queryParams.account) {
      if (queryParams.direction === 'author') {
        throw new ServiceError('Not implemented: looking up invitations by sender attestation', {
          fields: ['service', 'account', 'direction'],
          code: 'NOT_IMPLEMENTED',
          status: 501,
        });
      } else {
        const profileIdByAttestation = await user.getProfileIdByAttestation(
          queryParams.service,
          queryParams.account,
        );

        if (profileIdByAttestation)
          return Prisma.sql`(activity_type = ${type} AND subject = ${profileIdByAttestation.toString()})`;
        else return Prisma.empty;
      }
    }

    return Prisma.empty;
  }
}

/* HELPER FUNCTIONS AND TYPES */
type SubqueryParams = {
  service?: string;
  account?: string;
  address?: Address;
  profileId?: number;
  direction?: string;
};

type SubqueryResult = {
  activities: ActivityInfo[];
  count: number;
};

type ActivityFilterFunction = (filters: SubqueryParams) => Promise<Prisma.Sql>;
type ActivityFilterMap = Map<ActivityType, ActivityFilterFunction>;

type ActivityIdsAccumulator = {
  attestation?: number[];
  'invitation-accepted'?: number[];
  review?: number[];
  vouch?: number[];
  unvouch?: number[];
  [key: string]: number[] | number | undefined;
};
