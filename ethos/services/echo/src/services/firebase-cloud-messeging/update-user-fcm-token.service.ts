import { z } from 'zod';
import { prisma } from '../../data/db.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const schema = z.object({
  profileId: validators.profileId,
  token: z.string(),
  deviceIdentifier: z.string(),
  userAgent: z.string().optional(),
});

type Input = z.infer<typeof schema>;
type Output = {
  result: string;
};

const MAX_TOKENS_PER_PROFILE = 10;

export class UpdateUserFCMTokenService extends Service<typeof schema, Output> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute(input: Input): Promise<Output> {
    // TODO: Remove this after the migration is complete, when all records have a deviceIdentifier associated with them
    const exitingProfileAndFCMToken = await prisma.userFcmToken.findFirst({
      where: { profileId: input.profileId, fcmToken: input.token },
    });

    if (exitingProfileAndFCMToken) {
      await prisma.userFcmToken.update({
        where: { id: exitingProfileAndFCMToken.id },
        data: { deviceIdentifier: input.deviceIdentifier, userAgent: input.userAgent },
      });

      return { result: 'updated' };
    }

    const userFcmToken = await prisma.userFcmToken.findFirst({
      where: {
        profileId: input.profileId,
        deviceIdentifier: input.deviceIdentifier,
      },
    });

    // If the token already linked to the profile-device pair, return unchanged, otherwise update the token
    // for the profile-device pair
    if (userFcmToken?.fcmToken === input.token) {
      return { result: 'unchanged' };
    } else if (userFcmToken) {
      await prisma.userFcmToken.update({
        where: { id: userFcmToken.id },
        data: { fcmToken: input.token },
      });

      return { result: 'updated' };
    }

    const existingTokens = await prisma.userFcmToken.findMany({
      where: { profileId: input.profileId },
      orderBy: { createdAt: 'asc' },
    });

    // If the profile has reached the maximum allowed devices, delete the oldest ones
    if (existingTokens.length >= MAX_TOKENS_PER_PROFILE) {
      const tokensToDelete = existingTokens.slice(
        0,
        existingTokens.length - MAX_TOKENS_PER_PROFILE,
      );

      const deleteIds = tokensToDelete.map((token) => token.id);

      await prisma.userFcmToken.deleteMany({
        where: {
          id: { in: deleteIds },
        },
      });
    }

    // register new device for this profile
    await prisma.userFcmToken.create({
      data: {
        profileId: input.profileId,
        fcmToken: input.token,
        deviceIdentifier: input.deviceIdentifier,
        userAgent: input.userAgent,
      },
    });

    return {
      result: 'created',
    };
  }
}
