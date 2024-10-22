import { type EthosVouch } from '../../typechain-types';

export function mapVouch(
  vouch: EthosVouch.VouchStructOutput | undefined,
): EthosVouch.VouchStruct | null {
  if (!vouch) return null;

  return {
    archived: vouch.archived,
    unhealthy: vouch.unhealthy,
    authorProfileId: vouch.authorProfileId,
    authorAddress: vouch.authorAddress,
    stakeToken: vouch.stakeToken,
    vouchId: vouch.vouchId,
    subjectProfileId: vouch.subjectProfileId,
    comment: vouch.comment,
    metadata: vouch.metadata,
    activityCheckpoints: {
      vouchedAt: vouch.activityCheckpoints.vouchedAt,
      unvouchedAt: vouch.activityCheckpoints.unvouchedAt,
      unhealthyAt: vouch.activityCheckpoints.unhealthyAt,
    },
  };
}
