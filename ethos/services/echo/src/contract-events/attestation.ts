import { xComHelpers } from '@ethos/attestation';
import { type AttestationTypes } from '@ethos/contracts';
import { X_SERVICE, type EthosUserTarget } from '@ethos/domain';
import { getDateFromUnix } from '@ethos/helpers';
import { type Logger } from '@ethos/logger';
import { AttestationEventType, type Prisma } from '@prisma/client';
import { blockchainManager } from '../common/blockchain-manager';
import { TwitterScraper } from '../common/net/twitter/twitter-scraper.client';
import { prisma, refreshView } from '../data/db';
import { type EventProcessor, type WrangledEvent } from './event-processing';

type Payload = {
  attestationCreates: Prisma.AttestationCreateManyInput[];
  attestationUpdates: Prisma.AttestationUpdateManyArgs[];
  attestationEvents: Prisma.AttestationEventCreateManyInput[];
};

type EventUnion =
  | WrangledEvent<'AttestationCreated', AttestationTypes.AttestationCreatedEvent.LogDescription>
  | WrangledEvent<'AttestationArchived', AttestationTypes.AttestationArchivedEvent.LogDescription>
  | WrangledEvent<'AttestationClaimed', AttestationTypes.AttestationClaimedEvent.LogDescription>
  | WrangledEvent<'AttestationRestored', AttestationTypes.AttestationRestoredEvent.LogDescription>;

export const attestationEventProcessor: EventProcessor<EventUnion, Payload> = {
  ignoreEvents: new Set([]),
  getLogs: async (...args) => await blockchainManager.getAttestationEvents(...args),
  parseLog: (log) => blockchainManager.ethosAttestation.contract.interface.parseLog(log),
  eventWrangler: (parsed) => {
    switch (parsed.name) {
      case 'AttestationClaimed': {
        return {
          ...(parsed as unknown as AttestationTypes.AttestationClaimedEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'AttestationCreated': {
        return {
          ...(parsed as unknown as AttestationTypes.AttestationCreatedEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'AttestationArchived': {
        return {
          ...(parsed as unknown as AttestationTypes.AttestationArchivedEvent.LogDescription),
          name: parsed.name,
        };
      }
      case 'AttestationRestored': {
        return {
          ...(parsed as unknown as AttestationTypes.AttestationRestoredEvent.LogDescription),
          name: parsed.name,
        };
      }
    }

    return null;
  },
  preparePayload: async (events, logger) => {
    const attestationCreates = new Map<string, Prisma.AttestationCreateManyInput>();
    const attestationUpdates = new Map<string, Prisma.AttestationUpdateManyArgs>();
    const attestationEvents: Prisma.AttestationEventCreateManyInput[] = [];
    const dirtyScoreTargets: EthosUserTarget[] = [];

    for (const event of events) {
      const attestationHash = blockchainManager.ethosAttestation.hash(
        event.wrangled.args.service,
        event.wrangled.args.account,
      );

      const attestationId = Number(event.wrangled.args.attestationId);

      const attestation = await blockchainManager.getAttestationByHash(attestationHash);

      if (!attestation) {
        logger.warn({ data: { attestationHash } }, 'attestation_not_found');
        continue;
      }

      dirtyScoreTargets.push({ profileId: attestation.profileId });

      attestationEvents.push({
        eventId: event.id,
        attestationId,
        type: eventTypeByEventName.get(event.wrangled.name),
      });

      switch (event.wrangled.name) {
        case 'AttestationCreated': {
          attestationCreates.set(attestationHash, {
            id: attestation.id,
            hash: attestation.hash,
            archived: attestation.archived,
            profileId: attestation.profileId,
            createdAt: getDateFromUnix(attestation.createdAt),
            account: attestation.account,
            service: attestation.service,
          });

          if (attestation.service === X_SERVICE) {
            // evidence is a tweet URL in which the user attested their account
            void populateTwitterCache(event.wrangled.args.evidence, logger);
          }
          break;
        }
        case 'AttestationClaimed':
        case 'AttestationRestored':
        case 'AttestationArchived':
          attestationUpdates.set(attestationHash, {
            data: {
              id: attestation.id,
              archived: attestation.archived,
              profileId: attestation.profileId,
              createdAt: getDateFromUnix(attestation.createdAt),
              account: attestation.account,
              service: attestation.service,
            },
            where: { hash: attestationHash },
          });
          break;
      }
    }

    return {
      payload: {
        attestationCreates: Array.from(attestationCreates.values()),
        attestationUpdates: Array.from(attestationUpdates.values()),
        attestationEvents: Array.from(attestationEvents.values()),
      },
      dirtyScoreTargets,
    };
  },
  submitPayload: async ({ attestationCreates, attestationUpdates, attestationEvents }) => {
    await prisma.$transaction([
      prisma.attestation.createMany({ data: attestationCreates }),
      // eslint-disable-next-line @typescript-eslint/promise-function-async
      ...attestationUpdates.map((x) => prisma.attestation.updateMany(x)),
      prisma.attestationEvent.createMany({ data: attestationEvents }),
    ]);

    await Promise.all([refreshView('targets'), refreshView('names')]);
  },
};

// should we make this more global? not sure if we want two scrapers operating independently
const twitterScraper = new TwitterScraper();

/**
 * Populates the twitter cache so we can display names/avatars given only the
 * twitter ID stored in the attestation itself.
 * @param evidence - The evidence to verify that this is a valid attestation (as emitted by the contract event).
 */
async function populateTwitterCache(evidence: string, logger: Logger): Promise<void> {
  try {
    const username = xComHelpers.extractAccount(evidence);

    if (!username) {
      logger.error({ data: { evidence } }, 'invalid_attestation_evidence');

      return;
    }

    // this getProfile function also caches (or pulls from cache if already known)
    const profile = await twitterScraper.getProfile(username, false);

    if (!profile) {
      logger.error({ data: { username } }, 'twitter_x_scraper_failed');

      return;
    }
    logger.debug({ profile }, 'attestation_target_cached');
    // TODO add a prometheus metric here to check for twitter outages / API rate limits
  } catch (err) {
    logger.error({ err, data: { evidence } }, 'populate_attestation_cache_error');
  }
}

const eventTypeByEventName = new Map<string, AttestationEventType>([
  ['AttestationCreated', AttestationEventType.CREATE],
  ['AttestationClaimed', AttestationEventType.CLAIM],
  ['AttestationArchived', AttestationEventType.ARCHIVE],
  ['AttestationRestored', AttestationEventType.RESTORE],
]);
