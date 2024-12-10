import { type Invitation, InvitationStatus, ScoreImpact } from '@ethos/domain';
import { type PaginatedResponse } from '@ethos/helpers';
import { ScoreElementNames } from '@ethos/score';
import { type $Enums, type Prisma } from '@prisma-pg/client';
import { type Address, getAddress } from 'viem';
import { z } from 'zod';
import { prisma } from '../../data/db.js';
import { getLatestScore } from '../../data/score/calculate.js';
import { getScoreElements } from '../../data/score/lookup.js';
import { type ScoreSimulationResult } from '../../data/score/types.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const params = z.object({
  invitedBy: validators.profileId,
});

const schema = params.merge(validators.paginationSchema());

type Input = z.infer<typeof schema>;
type Output = PaginatedResponse<Invitation>;

const STATUS_MAP: Record<$Enums.InvitationStatus, InvitationStatus> = {
  ACCEPTED: InvitationStatus.ACCEPTED,
  PENDING: InvitationStatus.INVITED,
  DECLINED: InvitationStatus.ACCEPTED_OTHER_INVITATION,
};

export class InvitationQuery extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute(searchBy: Input): Promise<Output> {
    const [invitations, invitationsCount] = await Promise.all([
      prisma.invitation.findMany({
        include: { acceptedProfile: true },
        where: paramsToWhere(searchBy),
        orderBy: { sentAt: 'desc' },
        skip: searchBy.pagination.offset,
        take: searchBy.pagination.limit,
      }),
      prisma.invitation.count({
        where: paramsToWhere(searchBy),
      }),
    ]);

    const invitedScores = await Promise.all(
      invitations.map(async (invitation) => {
        if (invitation.acceptedProfileId !== null) {
          const score = await getLatestScore({ profileId: invitation.acceptedProfileId });

          if (!score) {
            return 0;
          }

          const elements = await getScoreElements(score.id);

          if (!elements) {
            return 0;
          }

          const invitationElement = elements[ScoreElementNames.ETHOS_INVITATION_SOURCE_CREDIBILITY];

          return invitationElement?.weighted ?? 0;
        }

        return 0;
      }),
    );

    return {
      values: invitations.map<Invitation>((x, i) => {
        let score: Invitation['score'];

        if (x.acceptedProfile !== null) {
          score = {
            value: Math.floor(Math.abs(invitedScores[i])),
            impact: invitedScores[i] > 0 ? ScoreImpact.POSITIVE : ScoreImpact.NEGATIVE,
          };
        } else {
          score = { value: 0, impact: ScoreImpact.NEUTRAL };
        }

        return {
          id: toInviteId(x.senderProfileId, x.recipient as Address),
          senderProfileId: x.senderProfileId,
          recipientAddress: getAddress(x.recipient),
          // txnHash: string; NOT IMPLEMENTED YET
          status: STATUS_MAP[x.status],
          score,
          dateInvited: x.sentAt,
          dateAccepted: x.acceptedProfile?.createdAt ?? undefined,
        };
      }),
      limit: searchBy.pagination.limit,
      offset: searchBy.pagination.offset,
      total: invitationsCount,
    };
  }
}

function paramsToWhere(searchBy: z.infer<typeof schema>): Prisma.InvitationWhereInput {
  const where: Prisma.InvitationWhereInput = {
    senderProfileId: searchBy.invitedBy,
  };

  return where;
}

function toInviteId(senderProfileId: number, recipientAddress: Address): string {
  return `${senderProfileId}-${recipientAddress}`;
}

/**
 * Preliminary score impact calculation; will need to be updated to account for scores being bonded over time
 * Note: 0.2 factor is hardcoded right now and reflects the current score calculation but should be
 * dynamically calculated in the future
 *
 * @param senderScore The score of the sender.
 * @param recipientScore The score of the recipient.
 * @returns An object containing the value of the score change and its impact (positive, negative, or neutral).
 */
export function invitationScoreImpact(
  senderScore: number,
  _recipientScore: number,
): ScoreSimulationResult['simulation'] {
  // TODO we should base this on the score module, not hardcode it
  // ^ double check this
  const impact = Math.round(senderScore * 0.2);

  return scoreImpact(senderScore, _recipientScore + impact);
}

export function scoreImpact(
  oldScore: number,
  newScore: number,
): ScoreSimulationResult['simulation'] {
  const scoreChange = newScore - oldScore;
  const impact =
    scoreChange > 0
      ? ScoreImpact.POSITIVE
      : scoreChange < 0
        ? ScoreImpact.NEGATIVE
        : ScoreImpact.NEUTRAL;

  return {
    value: scoreChange,
    relativeValue: impact === ScoreImpact.POSITIVE ? scoreChange : -scoreChange,
    impact,
    adjustedRecipientScore: newScore,
  };
}
