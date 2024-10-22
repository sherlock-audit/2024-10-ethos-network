import { type ActivityActor, fromUserKey, toUserKey } from '@ethos/domain';
import { notEmpty } from '@ethos/helpers';
import { z } from 'zod';
import { getLatestTargetScoresSortedByScore } from '../../data/score';
import { profile } from '../../data/user/lookup/profile';
import { SharedActivity } from '../activity/shared.activity';
import { type AnyRecord } from '../service.types';

const queryParamsSchema = z.object({
  limit: z.coerce.number().positive().max(100).optional().default(10),
});

type HighestScoringActorsQueryParams = z.infer<typeof queryParamsSchema>;

type Output = Array<{
  score: number;
  profileActor: ActivityActor;
  inviterActor?: ActivityActor;
}>;

export class HighestScoringActorsService extends SharedActivity<typeof queryParamsSchema, Output> {
  validate(params: AnyRecord): HighestScoringActorsQueryParams {
    return this.validator(params, queryParamsSchema);
  }

  async execute(params: HighestScoringActorsQueryParams): Promise<Output> {
    const scores = await getLatestTargetScoresSortedByScore(params.limit, {
      allowDirty: true,
    });

    const targets = scores.map(({ target }) => fromUserKey(target));
    const liteProfiles = await profile.getProfiles(targets);

    const allTargets = [
      ...targets,
      ...liteProfiles.map(({ invitedBy }) => ({ profileId: invitedBy })),
    ];

    const actorMap = new Map(
      (await this.getActors(allTargets)).map((actor) => [actor.userkey, actor]),
    );
    const liteProfilesMap = new Map(liteProfiles.map((profile) => [profile.id, profile]));

    return targets
      .map((target) => {
        const userKey = toUserKey(target);
        const profileActor = actorMap.get(userKey);

        const inviterActor =
          'profileId' in target
            ? actorMap.get(
                toUserKey({ profileId: liteProfilesMap.get(target.profileId)?.invitedBy ?? -1 }),
              )
            : undefined;

        return profileActor ? { score: profileActor.score, profileActor, inviterActor } : undefined;
      })
      .filter(notEmpty);
  }
}
