import { type ProfileId } from '@ethos/blockchain-manager';
import { fromUserKey, type ActivityActor } from '@ethos/domain';
import { intersection } from 'lodash';
import { type Simplify } from 'type-fest';
import { z } from 'zod';
import { prisma } from '../../data/db';
import { profile } from '../../data/user/lookup/profile';
import { SharedActivity } from '../activity/shared.activity';
import { ServiceError } from '../service.error';
import { type AnyRecord } from '../service.types';
import { validators } from '../service.validator';

const schema = z.object({
  viewerUserKey: validators.ethosUserKey(),
  targetUserKey: validators.ethosUserKey(),
});

type Input = Simplify<z.input<typeof schema>>;
type Output = ActivityActor[];

export class MutualVouchers extends SharedActivity<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute({ viewerUserKey, targetUserKey }: Input): Promise<Output> {
    const [viewerProfile, targetProfile] = await profile.getProfiles([
      fromUserKey(viewerUserKey),
      fromUserKey(targetUserKey),
    ]);

    if (!viewerProfile) {
      throw ServiceError.NotFound('Viewer profile not found', { fields: ['viewerUserKey'] });
    }

    if (!targetProfile) {
      throw ServiceError.NotFound('Target profile not found', { fields: ['targetUserKey'] });
    }

    const [profileIdsOfTargetVouchers, profileIdsViewerVouchedFor] = await Promise.all([
      this.getProfileIdsOfTargetVouchers(targetProfile.id),
      this.getProfileIdsViewerVouchedFor(viewerProfile.id),
    ]);

    const mutualVouchersProfileIds = intersection(
      profileIdsOfTargetVouchers,
      profileIdsViewerVouchedFor,
    );

    return await this.getActors(mutualVouchersProfileIds.map((profileId) => ({ profileId })));
  }

  private async getProfileIdsOfTargetVouchers(targetProfileId: ProfileId): Promise<number[]> {
    const targetVouches = await prisma.vouch.findMany({
      select: {
        authorProfileId: true,
      },
      where: {
        archived: false,
        subjectProfileId: targetProfileId,
      },
    });

    return targetVouches.map((vouch) => vouch.authorProfileId);
  }

  private async getProfileIdsViewerVouchedFor(profileId: ProfileId): Promise<number[]> {
    const vouches = await prisma.vouch.findMany({
      select: {
        subjectProfileId: true,
      },
      where: {
        archived: false,
        authorProfileId: profileId,
      },
    });

    return vouches.map((vouch) => vouch.subjectProfileId);
  }
}
