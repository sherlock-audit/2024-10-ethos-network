import {
  activities,
  attestationActivity,
  invitationAcceptedActivity,
  reviewActivity,
  unvouchActivity,
  vouchActivity,
  type ActivityInfo,
} from '@ethos/domain';
import { upperFirst } from 'lodash';
import { z } from 'zod';
import { spotProcessEvent } from '../../contract-events';
import { prisma } from '../../data/db';
import { ServiceError } from '../service.error';
import { type AnyRecord } from '../service.types';
import { SharedActivity } from './shared.activity';

const schema = z.object({
  type: z.enum(activities),
  id: z.string(), // vouch can be 0 or a transaction hash
  currentUserProfileId: z.number().positive().nullable().optional().default(null),
});

type Input = z.infer<typeof schema>;

export class ActivityService extends SharedActivity<typeof schema, ActivityInfo> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute(props: Input): Promise<ActivityInfo> {
    const activity = await this.getActivity(props);

    if (!activity) {
      throw ServiceError.NotFound(`${upperFirst(props.type)} not found`);
    }

    return activity;
  }

  private async getActivity({ type, id, currentUserProfileId }: Input): Promise<ActivityInfo> {
    if (id.startsWith('0x')) {
      if (![reviewActivity, vouchActivity].includes(type)) {
        throw ServiceError.NotFound(`Cannot spot process activity of type ${type}`);
      }
      const processSuccessful = await spotProcessEvent(id);

      if (processSuccessful) {
        const dbEvent = await prisma.blockchainEvent.findFirst({
          where: {
            txHash: id,
            contract: type,
          },
        });

        if (type === reviewActivity) {
          const review = await prisma.reviewEvent.findFirst({
            where: {
              eventId: dbEvent?.id,
            },
          });
          id = review?.reviewId.toString() ?? '';
        } else if (type === vouchActivity) {
          const vouch = await prisma.vouchEvent.findFirst({
            where: {
              eventId: dbEvent?.id,
            },
          });
          id = vouch?.vouchId.toString() ?? '';
        } else {
          throw ServiceError.NotFound('Currently supporting lookup by reviews and vouches');
        }
      }
    }

    if (!id) {
      throw ServiceError.NotFound(`Activity not found`);
    }

    const activityId = parseInt(id);

    switch (type) {
      case reviewActivity:
        return (await this.getReviews([activityId], currentUserProfileId))[0];
      case vouchActivity:
        return (await this.getVouches([activityId], currentUserProfileId))[0];
      case unvouchActivity:
        return (await this.getUnvouches([activityId], currentUserProfileId))[0];
      case attestationActivity:
        return (await this.getAttestations([activityId]))[0];
      case invitationAcceptedActivity:
        return (await this.getProfileActivities([activityId]))[0];
      default:
        throw new Error('Invalid activity type');
    }
  }
}
