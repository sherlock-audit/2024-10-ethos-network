import { type Reply, type Attestation, type Review, type Vouch } from '@ethos/blockchain-manager';
import { type $Enums, type Contract } from '@prisma-pg/client';
import { convert } from '../conversion.js';
import { prisma } from '../db.js';
import { profile } from '../user/lookup/profile.js';

export type ActivityEntity =
  | (Review & { type: 'REVIEW' })
  | (Vouch & { type: 'VOUCH' })
  | (Attestation & { type: 'ATTESTATION' });

export type Entity = ActivityEntity | (Reply & { type: 'DISCUSSION' });

export async function getEntityAuthorProfileId(entity: Entity): Promise<number> {
  switch (entity.type) {
    case 'DISCUSSION':
      return entity.authorProfileId;
    case 'ATTESTATION':
      return entity.profileId;
    case 'REVIEW': {
      const profileId = await profile.getProfileIdByAddress(entity.author);

      if (!profileId) throw new Error(`No profile found for address ${entity.author}`);

      return profileId;
    }
    case 'VOUCH':
      return entity.authorProfileId;
    default:
      throw Error('Invalid entity type');
  }
}

export async function getActivityEntity(
  parentId: number,
  contract: Contract | $Enums.Contract,
): Promise<ActivityEntity> {
  if (contract === 'DISCUSSION') {
    const parentReply = await prisma.reply.findUnique({ where: { id: parentId } });

    if (!parentReply?.contract)
      throw new Error(`Invalid reply or missing contract with id=${parentId}`);

    return await getActivityEntity(parentReply.parentId, parentReply.contract);
  }

  const entity = await getEntity(parentId, contract);

  if (entity === null || 'parentId' in entity) {
    throw new Error(`Expected ActivityEntity but received ${entity ? 'Reply' : 'null'}`);
  }

  return entity;
}

export async function getEntity(id: number, contract: Contract): Promise<Entity> {
  const findOptions = { where: { id } };

  if (contract === 'DISCUSSION') {
    const reply = await prisma.reply.findUnique(findOptions);

    if (!reply) throw new Error(`No reply found with id=${id}`);

    return { type: 'DISCUSSION', ...convert.toReplyFromPrisma(reply) };
  }

  if (contract === 'REVIEW') {
    const review = await prisma.review.findUnique(findOptions);

    if (!review) throw new Error(`No review found with id=${id}`);

    return { type: 'REVIEW', ...convert.toReview(review) };
  }

  if (contract === 'VOUCH') {
    const vouch = await prisma.vouch.findUnique(findOptions);

    if (!vouch) throw new Error(`No vouch found with id=${id}`);

    return { type: 'VOUCH', ...convert.toVouch(vouch) };
  }

  if (contract === 'ATTESTATION') {
    const attestation = await prisma.attestation.findUnique(findOptions);

    if (!attestation) throw new Error(`No attestation found with id=${id}`);

    return { type: 'ATTESTATION', ...convert.toAttestationFromPrisma(attestation) };
  }

  throw new Error(`Unsupported contract type`);
}
