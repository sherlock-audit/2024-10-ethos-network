import { type Attestation, type Review, type Vouch } from '@ethos/blockchain-manager';
import {
  type Transaction,
  type Interaction,
  type Relationship,
  type LiteProfile,
} from '@ethos/domain';
import { isAddressEqualSafe, type PaginatedResponse, getUnixTimestamp } from '@ethos/helpers';
import { type TransactionHistoryCache, type Prisma } from '@prisma-pg/client';
import { type Address, getAddress } from 'viem';
import { z } from 'zod';
import { MoralisClient } from '../../common/net/moralis/moralis.client.js';
import { convert } from '../../data/conversion.js';
import { prisma } from '../../data/db.js';
import { user } from '../../data/user/lookup/index.js';
import { Service } from '../service.base.js';
import { type AnyRecord } from '../service.types.js';
import { validators } from '../service.validator.js';

const schema = z
  .object({
    address: validators.address,
  })
  .merge(validators.paginationSchema());

type Input = z.infer<typeof schema>;
const moralis = new MoralisClient();

/**
 * RecentInteractionsService
 *
 * Retrieves and annotates recent Ethereum transactions for a specified address.
 * - Fetches transactions across all chains (not including testnets)
 * - Identifies interactions regardless of whether the user was the sender or receiver
 * - Enriches the data with reviews and vouches between interacting parties
 */
export class RecentInteractionsService extends Service<
  typeof schema,
  PaginatedResponse<Relationship>
> {
  validate(params: AnyRecord): Input {
    return this.validator(params, schema);
  }

  async execute(input: Input): Promise<PaginatedResponse<Relationship>> {
    const {
      address,
      pagination: { limit, offset },
    } = input;
    const transactions = await moralis.getRecentTransactions(address);
    const results = processTransactions(transactions, address);
    const total = Object.values(results).length;
    const sortedInteractions = Object.values(results).sort(
      (a, b) => b.last_transaction_timestamp - a.last_transaction_timestamp,
    );
    // moralis supports pagination in their API but we cache the result, so re-check pagination here.
    // TODO support more than the default of 100 transactions of history
    const paginatedInteractions = sortedInteractions.slice(offset, offset + limit);
    // only bother retrieving reviews and vouches for the paginated scope of interactions
    const values: Relationship[] = await Promise.all(
      paginatedInteractions.map(async (interaction) => {
        const [reviews, vouch] = await Promise.all([
          getReviewsBetween(interaction.address, address),
          getVouchFor(address, interaction.address),
        ]);

        return {
          ...interaction,
          reviews,
          vouch,
        };
      }),
    );

    return {
      values,
      total,
      limit,
      offset,
    };
  }
}

/**
 * Processes a list of transactions and generates a record of interactions for a given user address.
 *
 * @param transactions - An array of Ethereum transactions in Moralis API JSON format
 * @param userAddress - The Ethereum address of the user whose interactions are being processed
 * @returns A record where keys are Ethereum addresses and values are Interaction objects
 */
function processTransactions(
  transactions: TransactionHistoryCache[],
  userAddress: Address,
): Record<Address, Interaction> {
  const results: Record<Address, Interaction> = {};

  transactions.forEach((transaction) => {
    processTransaction(transaction, userAddress, results);
  });

  return results;
}

/**
 * Processes a single transaction and updates the interactions record.
 *
 * @param transaction - The Ethereum transaction in Moralis API JSON format
 * @param userAddress - The Ethereum address of the user whose interactions are being processed
 * @param results - The record of interactions to be updated (updated in place)
 */
function processTransaction(
  transaction: TransactionHistoryCache,
  userAddress: Address,
  results: Record<Address, Interaction>,
): void {
  const fromAddress = getAddress(transaction.fromAddress);
  const toAddress = getAddress(transaction.toAddress);
  const timestamp = getUnixTimestamp(transaction.blockTimestamp);

  function updateInteraction(address: Address): void {
    if (!results[address]) {
      results[address] = {
        address,
        last_transaction_timestamp: timestamp,
        transactions: [toTransaction(transaction)],
      };
    } else {
      results[address].transactions.push(toTransaction(transaction));
      results[address].last_transaction_timestamp = Math.max(
        results[address].last_transaction_timestamp,
        timestamp,
      );
    }
  }

  if (isAddressEqualSafe(fromAddress, userAddress)) {
    updateInteraction(toAddress);
  } else if (isAddressEqualSafe(toAddress, userAddress)) {
    updateInteraction(fromAddress);
  }
}

/**
 * Retrieves a vouch (if it exists) between an author and subject by address
 *
 * @param subject - The Ethereum address of the subject
 * @param author - The Ethereum address of the author
 * @returns A Promise that resolves to a Vouch object or null.
 */
async function getVouchFor(subject: Address, author: Address): Promise<Vouch | null> {
  const [subjectProfile, authorProfile] = await Promise.all([
    user.getProfile({ address: subject }),
    user.getProfile({ address: author }),
  ]);

  if (!authorProfile || !subjectProfile) {
    // both users must have profiles for vouch to exist
    return null;
  }

  const vouch = await prisma.vouch.findFirst({
    where: {
      authorProfileId: authorProfile.id,
      subjectProfileId: subjectProfile.id,
      archived: false,
    },
  });

  return vouch ? convert.toVouch(vouch) : null;
}

/**
 * Retrieves reviews between two addresses where either can be the subject or author
 *
 * @param address - The Ethereum address of one of the users
 * @param connected - The Ethereum address of the other user
 * @returns A Promise that resolves to an array of Review objects.
 *
 * This function handles four scenarios:
 * 1. Neither user has an Ethos profile
 * 2. Only the target user has an Ethos profile
 * 3. Only the connected user has an Ethos profile
 * 4. Both users have Ethos profiles
 *
 * It fetches reviews in both directions (from `address` to `connected` and vice versa)
 * and combines them into a single array.
 */
async function getReviewsBetween(address: Address, connected: Address): Promise<Review[]> {
  const [targetProfile, connectedProfile] = await Promise.all([
    user.getProfile({ address }),
    user.getProfile({ address: connected }),
  ]);

  if (!connectedProfile && !targetProfile) {
    // neither are ethos users, none can have left reviews
    return [];
  } else if (!connectedProfile && targetProfile) {
    // connected user does not have a profile, only be identified by address
    const reviews = await prisma.review.findMany({
      where: {
        authorProfileId: targetProfile.id,
        subject: connected,
        archived: false,
      },
    });

    return reviews.map(convert.toReview);
  } else if (!targetProfile && connectedProfile) {
    // target not an ethos user; only identified by address
    const reviews = await prisma.review.findMany({
      where: {
        authorProfileId: connectedProfile.id,
        subject: address,
        archived: false,
      },
    });

    return reviews.map(convert.toReview);
  } else if (connectedProfile && targetProfile) {
    // both are ethos users
    const [
      connectedProfileAttestations,
      targetProfileAttestations,
      connectedProfileAddresses,
      targetProfileAddresses,
    ] = await Promise.all([
      user.getAttestations(connectedProfile.id),
      user.getAttestations(targetProfile.id),
      user.getAddresses({ profileId: connectedProfile.id }),
      user.getAddresses({ profileId: targetProfile.id }),
    ]);

    const [fromReviews, toReviews] = await Promise.all([
      prisma.review.findMany(
        getReviewsForProfile(
          connectedProfile.id,
          targetProfileAttestations,
          targetProfileAddresses.allAddresses,
        ),
      ),
      prisma.review.findMany(
        getReviewsForProfile(
          targetProfile.id,
          connectedProfileAttestations,
          connectedProfileAddresses.allAddresses,
        ),
      ),
    ]);

    return [...fromReviews, ...toReviews].map(convert.toReview);
  }
  throw new Error('Invalid state');
}

/**
 * Constructs a Prisma query to find reviews for a pair of profiles
 *
 * @param authorProfile - The profile of the author of the reviews.
 * @param subjectProfile - The profile of the subject of the reviews.
 * @returns A Prisma query object for finding reviews.
 */
function getReviewsForProfile(
  authorProfileId: LiteProfile['id'],
  subjectAttestations: Attestation[],
  subjectAddresses: Address[],
): Prisma.ReviewFindManyArgs {
  return {
    where: {
      authorProfileId,
      archived: false,
      OR: [
        {
          subject: {
            in: subjectAddresses,
          },
        },
        {
          account: {
            in: subjectAttestations.map((x) => x.account),
          },
          service: {
            in: subjectAttestations.map((x) => x.service),
          },
        },
      ],
    },
  };
}

function toTransaction(item: TransactionHistoryCache): Transaction {
  return {
    hash: item.hash,
    from_address: getAddress(item.fromAddress),
    from_address_label: item.fromAddressLabel ?? undefined,
    from_address_entity_logo: item.fromAddressLogo ?? undefined,
    to_address: getAddress(item.toAddress),
    to_address_label: item.toAddressLabel ?? undefined,
    to_address_entity_logo: item.toAddressLogo ?? undefined,
    value: item.value,
    block_timestamp: getUnixTimestamp(item.blockTimestamp),
    category: item.category ?? '',
    summary: item.summary ?? '',
  };
}
