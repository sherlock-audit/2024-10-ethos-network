import { activities, reviewActivity, vouchActivity, type ActivityInfo } from '@ethos/domain';
import { upperFirst } from 'lodash-es';
import { z } from 'zod';
import { spotProcessEvent } from '../../contract-events/index.js';
import { prisma } from '../../data/db.js';
import { Service } from '../service.base.js';
import { ServiceError } from '../service.error.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';
import { UnifiedActivityService } from './unified-activity.service.js';

const schema = z.object({
  type: z.enum(activities),
  id: z.string(), // vouch can be 0 or a transaction hash
  currentUserProfileId: validators.profileId.nullable().optional().default(null),
});

type Input = z.infer<typeof schema>;

export class ActivityService extends Service<typeof schema, ActivityInfo> {
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

  private async getActivity({
    type,
    id,
    currentUserProfileId,
  }: Input): Promise<ActivityInfo | null> {
    if (id.startsWith('0x')) {
      if (![reviewActivity, vouchActivity].includes(type)) {
        throw ServiceError.NotFound(`Cannot spot process activity of type ${type}`);
      }

      const processSuccessful = await spotProcessEvent(id).catch((error) => {
        throw ServiceError.BadRequest(
          error instanceof Error ? error.message : 'Failed to process event',
        );
      });

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
      } else {
        throw ServiceError.NotFound('Event not found');
      }
    }

    if (!id) {
      throw ServiceError.NotFound(`Activity not found`);
    }

    const activityId = parseInt(id, 10);

    if (!Number.isInteger(activityId) || activityId < 0) {
      throw ServiceError.BadRequest('Invalid activity id');
    }

    const results = await this.useService(UnifiedActivityService).run({
      ids: {
        [type]: [activityId],
      },
      filter: [type],
      currentUserProfileId,
      cache: false,
      orderBy: { field: 'timestamp', direction: 'desc' },
      pagination: { limit: 1 },
    });

    if (results.values.length === 1) {
      return results.values[0];
    }

    return null;
  }
}
