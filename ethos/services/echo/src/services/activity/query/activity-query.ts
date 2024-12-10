import { type ActivityInfo } from '@ethos/domain';
import { Prisma } from '@prisma-pg/client';
import { type Address } from 'viem';
import { type z } from 'zod';
import { blockchainManager } from '../../../common/blockchain-manager.js';
import { prisma } from '../../../data/db.js';
import { type sharedFilterSchema } from '../utility.js';

type Input = {
  data: {
    query: Prisma.Sql;
    id: Prisma.Sql;
    timestamp: Prisma.Sql;
    contract: Address | null;
  };
  orderBy: z.infer<typeof sharedFilterSchema>['orderBy'];
  currentUserProfileId: z.infer<typeof sharedFilterSchema>['currentUserProfileId'];
  pagination: {
    limit: number;
    offset: number;
  };
};

export type ActivityQueryOutput<T> = Array<{
  data: T;
  metadata: ActivityMetadata;
}>;

export type ActivityMetadata = {
  timestamp: Date;
  votes: ActivityInfo['votes'];
  replySummary: ActivityInfo['replySummary'];
};

const ORDER_BY_DIRECTION_MAP: Record<Input['orderBy']['direction'], Prisma.Sql> = {
  asc: Prisma.sql`ASC`,
  desc: Prisma.sql`DESC`,
};

export async function activityQuery<T>({
  data,
  currentUserProfileId,
  pagination,
  orderBy,
}: Input): Promise<ActivityQueryOutput<T>> {
  let orderBySql = Prisma.empty;
  switch (orderBy.field) {
    case 'timestamp':
      orderBySql = Prisma.sql`ORDER BY data.${data.timestamp} ${ORDER_BY_DIRECTION_MAP[orderBy.direction]}`;
      break;
    case 'votes':
      orderBySql = Prisma.sql`ORDER BY COALESCE(vote_info.upvotes, 0) - COALESCE(vote_info.downvotes, 0) ${ORDER_BY_DIRECTION_MAP[orderBy.direction]}`;
      break;
  }

  const sql = Prisma.sql`
      WITH RECURSIVE
      data AS (
        ${data.query}
      ),
      vote_info AS (
         SELECT
          "targetContract",
          "targetId",
          COUNT(*) FILTER (WHERE "isUpvote" = true) as upvotes,
          COUNT(*) FILTER (WHERE "isUpvote" = false) as downvotes
        FROM votes
        GROUP BY "targetContract", "targetId"
      ),
      reply_hierarchy AS (
        -- base case
        SELECT
          replies.id,
          replies."parentId",
          replies."targetContract",
          replies."authorProfileId",
          replies."parentId" as "rootParentId",
          replies."targetContract" as "rootContract"
        FROM replies
        INNER JOIN data ON replies."parentId" = data.${data.id} AND replies."targetContract" = ${data.contract}

        UNION

        -- recursive query
        SELECT
          child.id,
          child."parentId",
          child."targetContract",
          child."authorProfileId",
          reply_hierarchy."rootParentId" as "rootParentId",
          reply_hierarchy."rootContract" as "rootContract"
        FROM replies AS child
        INNER JOIN reply_hierarchy ON reply_hierarchy.id = child."parentId" AND child."targetContract" = ${blockchainManager.getContractAddress('discussion')}
      ),
      reply_summary as (
        SELECT
          "rootParentId" as "parentId",
          "rootContract" as "targetContract",
          COUNT(*) as total_reply_count,
          COUNT(*) FILTER (WHERE "authorProfileId" = ${currentUserProfileId}) as current_user_reply_count,
          COUNT(*) FILTER (WHERE "rootParentId" = "parentId" AND "rootContract" = "targetContract") as root_reply_count
        FROM reply_hierarchy
        GROUP BY "rootParentId", "rootContract"
      )

      SELECT
        COALESCE(vote_info.upvotes, 0) as upvotes,
        COALESCE(vote_info.downvotes, 0) as downvotes,
        reply_summary.root_reply_count as "replyCount",
        COALESCE(reply_summary.current_user_reply_count > 0, false) as participated,
        data.${data.timestamp} as timestamp,
        data.*
      FROM data
      LEFT JOIN vote_info ON
        vote_info."targetContract" = ${data.contract} AND
        vote_info."targetId" = data.${data.id}
      LEFT JOIN reply_summary ON
        reply_summary."parentId" = data.${data.id} AND
        reply_summary."targetContract" = ${data.contract}
      ${orderBySql}
      OFFSET ${pagination.offset}
      LIMIT ${pagination.limit}
    `;

  type Result = T & {
    upvotes: bigint;
    downvotes: bigint;
    replyCount: bigint;
    participated: boolean;
    timestamp: Date;
  };

  const results = await prisma.$queryRaw<Result[]>(sql);

  const output: ActivityQueryOutput<T> = [];

  for (const { upvotes, downvotes, replyCount, participated, timestamp, ...data } of results) {
    output.push({
      data: data as T,
      metadata: {
        timestamp,
        votes: {
          upvotes: Number(upvotes),
          downvotes: Number(downvotes),
        },
        replySummary: {
          count: Number(replyCount),
          participated,
        },
      },
    });
  }

  return output;
}
