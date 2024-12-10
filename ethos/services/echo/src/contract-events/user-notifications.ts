import { getScoreValue, ScoreByValue, type ScoreType } from '@ethos/blockchain-manager';
import {
  attestationActivity,
  type EthosUserTarget,
  reviewActivity,
  vouchActivity,
} from '@ethos/domain';
import { webUrlMap } from '@ethos/env';
import { formatEth, generateSlug, isValidAddress, pluralize } from '@ethos/helpers';
import { type Contract } from '@prisma-pg/client';
import { config } from '../common/config.js';

import { rootLogger } from '../common/logger.js';
import {
  hasAssociatedTokens,
  type NotificationPayload,
  sendNotificationByProfileId,
} from '../common/net/firebase-admin.js';
import { prisma } from '../data/db.js';
import { DiscussionData } from '../data/discussion/index.js';
import { getLatestScoreOrCalculate } from '../data/score/calculate.js';
import { findScoreTargetKey } from '../data/score/lookup.js';
import { user } from '../data/user/lookup/index.js';

const logger = rootLogger.child({ module: 'user-notifications' });

function getWebServerUrl(): string {
  return webUrlMap[config.ETHOS_ENV === 'local' ? 'dev' : config.ETHOS_ENV];
}

function getIconUrl(iconName: string): string {
  return `${getWebServerUrl()}/assets/images/pwa/notifications/${iconName}`;
}

function getBlockieAvatar(address: string | null): string | null {
  if (address && isValidAddress(address))
    return new URL(`/avatar/blockie/${address}`, getWebServerUrl()).toString();

  return null;
}

const ETHOS_BADGE_ICON = getIconUrl('ethos-badge-icon.png');
const POSITIVE_REVIEW_ICON = getIconUrl('positive-review-icon.png');
const NEGATIVE_REVIEW_ICON = getIconUrl('negative-review-icon.png');
const NEUTRAL_REVIEW_ICON = getIconUrl('neutral-review-icon.png');
const VOUCH_ICON = getIconUrl('vouch-icon.png');
const UNVOUCH_ICON = getIconUrl('unvouch-icon.png');

const MAX_DESCRIPTION_LENGTH = 160;

async function calculateScoreChange(target: EthosUserTarget): Promise<number> {
  await getLatestScoreOrCalculate(target);
  const targetKey = await findScoreTargetKey(target);

  const twoRecords = await prisma.scoreHistory.findMany({
    select: {
      score: true,
    },
    where: {
      target: targetKey,
    },
    orderBy: { createdAt: 'desc' },
    take: 2,
  });

  if (twoRecords.length < 2) {
    return 0;
  }

  const newScore = twoRecords[0].score;
  const lastScore = twoRecords[1].score;

  return newScore - lastScore;
}

async function getAuthorDetails(
  authorProfileId: number,
): Promise<ReturnType<typeof user.getNameAvatarDescription>> {
  const authorTarget = { profileId: authorProfileId };

  return await user.getNameAvatarDescription(authorTarget);
}

function createReviewNotificationPayload(
  authorName: string,
  scoreChange: number,
  scoreType: ScoreType,
): {
  title: string;
  description: string;
  icon: string;
} {
  const points = pluralize(Math.abs(scoreChange), 'point', 'points');
  const scoreDirection = scoreChange > 0 ? 'up' : scoreChange < 0 ? 'down' : 'remain';
  let title: string;
  let description: string;
  let icon: string;

  if (scoreType === 'positive') {
    title = 'You got a positive review!';
    description =
      scoreDirection === 'up'
        ? `Great news! ${authorName} just left a positive review on your profile. Your score just went up by ${Math.abs(scoreChange)} ${points}.`
        : `${authorName} just left a positive review on your profile. Your score hasn’t changed.`;
    icon = POSITIVE_REVIEW_ICON;
  } else if (scoreType === 'negative') {
    title = 'You got a negative review!';
    description =
      scoreDirection === 'down'
        ? `Heads up! ${authorName} just left a negative review on your profile. Your score went down by ${Math.abs(scoreChange)} ${points}.`
        : `${authorName} just left a negative review on your profile. Your score hasn’t changed.`;
    icon = NEGATIVE_REVIEW_ICON;
  } else {
    title = 'You got a neutral review!';
    description = `Heads up! ${authorName} just left a neutral review on your profile. Your score ${scoreDirection === 'remain' ? "hasn't changed" : 'has been adjusted'}.`;
    icon = NEUTRAL_REVIEW_ICON;
  }

  return { title, description, icon };
}

export type ReviewNotificationInput = {
  id: number;
  subject: string;
  author: string;
  authorProfileId: number;
  score: number;
  comment: string;
  service?: string;
  account?: string;
};

export async function sendReviewNotificationToUsers(
  reviews: ReviewNotificationInput[],
): Promise<void> {
  await Promise.all(
    reviews.map(
      async ({ id, subject, author, authorProfileId, score, service, account, comment }) => {
        const ethosTarget: EthosUserTarget | null =
          subject && isValidAddress(subject)
            ? { address: subject }
            : service && account
              ? {
                  service,
                  account,
                }
              : null;

        if (!ethosTarget) return;

        const profileId = await user.getProfileId(ethosTarget);

        if (!profileId) return;

        const subjectTarget = { profileId };

        if (!(await hasAssociatedTokens(profileId))) {
          return;
        }

        const { name: authorName } = await getAuthorDetails(authorProfileId);
        const scoreType = ScoreByValue[getScoreValue(score)];
        const scoreChange = await calculateScoreChange(subjectTarget);

        const { title, description, icon } = createReviewNotificationPayload(
          authorName ?? author,
          scoreChange,
          scoreType,
        );
        const slug = generateSlug(comment);
        const url = `${webUrlMap[config.ETHOS_ENV]}/activity/${reviewActivity}/${id}/${slug}`;

        const payload: NotificationPayload = {
          title,
          body: description,
          badge: ETHOS_BADGE_ICON,
          icon,
          url,
        };

        await sendNotificationByProfileId(profileId, payload);
      },
    ),
  );
}

export type VouchNotificationInput = {
  id: number;
  stakedAmount: bigint;
  authorProfileId: number;
  subjectProfileId: number;
  comment: string;
};

export async function sendVouchNotificationToUsers(
  vouches: VouchNotificationInput[],
): Promise<void> {
  await Promise.all(
    vouches.map(async (vouch) => {
      const subjectProfileId = vouch.subjectProfileId;
      const subjectTarget = { profileId: subjectProfileId };

      if (!(await hasAssociatedTokens(subjectProfileId))) {
        return;
      }

      const { name: authorName } = await getAuthorDetails(vouch.authorProfileId);
      const scoreChange = await calculateScoreChange(subjectTarget);
      const points = pluralize(Math.abs(scoreChange), 'point', 'points');

      const title = `You got vouched for ${formatEth(vouch.stakedAmount)}`;
      const description = `${authorName} vouched for you. Your score just went up by ${Math.abs(scoreChange)} ${points}.`;
      const slug = generateSlug(vouch.comment);
      const url = `${webUrlMap[config.ETHOS_ENV]}/activity/${vouchActivity}/${vouch.id}/${slug}`;

      const payload: NotificationPayload = {
        title,
        body: description,
        badge: ETHOS_BADGE_ICON,
        icon: VOUCH_ICON,
        url,
      };

      await sendNotificationByProfileId(subjectProfileId, payload);
    }),
  );
}

export type UnVouchNotificationInput = {
  id: number;
  withdrawnAmount: bigint;
  authorProfileId: number;
  subjectProfileId: number;
  comment: string;
};

export async function sendUnVouchNotificationToUsers(
  vouches: UnVouchNotificationInput[],
): Promise<void> {
  await Promise.all(
    vouches.map(async (vouch) => {
      const subjectProfileId = vouch.subjectProfileId;

      if (!(await hasAssociatedTokens(subjectProfileId))) {
        return;
      }

      const { name: authorName } = await getAuthorDetails(vouch.authorProfileId);

      const title = `You got unvouched for ${formatEth(vouch.withdrawnAmount)}`;
      const description = `Heads up! ${authorName} just removed a vouch for you.`;
      const slug = generateSlug(vouch.comment);
      const url = `${webUrlMap[config.ETHOS_ENV]}/activity/${vouchActivity}/${vouch.id}/${slug}`;

      const payload: NotificationPayload = {
        title,
        body: description,
        badge: ETHOS_BADGE_ICON,
        icon: UNVOUCH_ICON,
        url,
      };

      await sendNotificationByProfileId(subjectProfileId, payload);
    }),
  );
}

export type DiscussionNotificationInput = {
  id: number;
  parentId: number;
  authorProfileId: number;
  content: string;
  contract?: Contract | null;
};

export async function sendReplyNotificationToUsers(
  discussions: DiscussionNotificationInput[],
): Promise<void> {
  await Promise.all(
    discussions.map(async (discussion) => {
      if (!discussion.contract) return;
      try {
        const parentEntity = await DiscussionData.getEntity(
          discussion.parentId,
          discussion.contract,
        );
        const authorProfileId = discussion.authorProfileId;
        const parentEntityAuthorProfileId =
          await DiscussionData.getEntityAuthorProfileId(parentEntity);

        if (
          authorProfileId === parentEntityAuthorProfileId ||
          !(await hasAssociatedTokens(parentEntityAuthorProfileId))
        ) {
          return;
        }

        const activityEntity = await DiscussionData.getActivityEntity(
          discussion.parentId,
          discussion.contract,
        );

        const { name: authorName, avatar } = await getAuthorDetails(authorProfileId);
        const authorAvatar =
          avatar ??
          getBlockieAvatar(await user.getPrimaryAddress({ profileId: authorProfileId })) ??
          undefined;

        const description =
          discussion.content.length > MAX_DESCRIPTION_LENGTH
            ? `${discussion.content.slice(0, MAX_DESCRIPTION_LENGTH)}...`
            : discussion.content;

        const slug = generateSlug(discussion.content);

        let title;

        switch (parentEntity.type) {
          case 'DISCUSSION':
            title = `${authorName} replied to your comment.`;
            break;
          case 'REVIEW':
            title = `${authorName} left a comment on your review.`;
            break;
          case 'ATTESTATION':
            title = `${authorName} left a comment on your attestation.`;
            break;
          case 'VOUCH':
            title = `${authorName} left a comment on your ${parentEntity.archived ? 'unvouch' : 'vouch'}.`;
            break;
          default:
            title = `${authorName} left a comment.`;
        }

        let url;

        switch (activityEntity.type) {
          case 'REVIEW':
            url = `${webUrlMap[config.ETHOS_ENV]}/activity/${reviewActivity}/${activityEntity.id}/${slug}`;
            break;
          case 'ATTESTATION':
            url = `${webUrlMap[config.ETHOS_ENV]}/activity/${attestationActivity}/${activityEntity.id}/${slug}`;
            break;
          case 'VOUCH':
            url = `${webUrlMap[config.ETHOS_ENV]}/activity/${vouchActivity}/${activityEntity.id}/${slug}`;
            break;
        }

        const payload: NotificationPayload = {
          title,
          body: description,
          icon: authorAvatar,
          badge: ETHOS_BADGE_ICON,
          url,
        };

        await sendNotificationByProfileId(parentEntityAuthorProfileId, payload);
      } catch (err) {
        logger.error(
          {
            err,
            data: {
              id: discussion.id,
              parentId: discussion.parentId,
              contract: discussion.contract,
            },
          },
          'Failed to send reply notification',
        );
      }
    }),
  );
}

export type AcceptInvitationNotificationInput = {
  profileId: number;
  invitedBy: number;
};

export async function sendAcceptInvitationNotificationToUsers(
  invitations: AcceptInvitationNotificationInput[],
): Promise<void> {
  await Promise.all(
    invitations.map(async (invitation) => {
      if (!(await hasAssociatedTokens(invitation.invitedBy))) {
        return;
      }
      try {
        const { name: authorName, avatar } = await getAuthorDetails(invitation.profileId);
        const primaryAddress = await user.getPrimaryAddress({ profileId: invitation.profileId });
        const authorAvatar = avatar ?? getBlockieAvatar(primaryAddress) ?? undefined;

        const title = `${authorName} just accepted your invite!`;
        const description = `Go be the first to leave them a review.`;
        const url = primaryAddress
          ? `${webUrlMap[config.ETHOS_ENV]}/profile/${primaryAddress}`
          : undefined;

        const payload: NotificationPayload = {
          title,
          body: description,
          badge: ETHOS_BADGE_ICON,
          icon: authorAvatar,
          url,
        };

        await sendNotificationByProfileId(invitation.invitedBy, payload);
      } catch (err) {
        logger.error(
          {
            err,
            data: {
              profileId: invitation.profileId,
              invitedBy: invitation.invitedBy,
            },
          },
          'Failed to send accept invitation notification',
        );
      }
    }),
  );
}
