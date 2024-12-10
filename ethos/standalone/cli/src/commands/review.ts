import { type Review, Score } from '@ethos/blockchain-manager';
import { parseEther } from 'ethers';
import { isAddress } from 'viem';
import { type ArgumentsCamelCase, type Argv } from 'yargs';
import { globals } from '../globals.js';
import { Validator } from '../utils/input.js';
import { error, f, out, txn } from '../utils/output.js';
import { type WalletManager } from '../utils/walletManager.js';
import { Command, Subcommand } from './command.js';

/**
 * Common pagination options for review listing commands
 */
function getPaginationOptions(): Record<string, any> {
  return {
    offset: {
      type: 'number',
      alias: 'o',
      describe: 'Starting index for pagination',
      default: 0,
    },
    limit: {
      type: 'number',
      alias: 'l',
      describe: 'Maximum number of reviews to return',
      default: 20,
    },
  };
}

/**
 * Fetches paginated reviews using the provided indexing function
 */
async function fetchPaginatedReviews(
  user: WalletManager,
  offset: number,
  limit: number,
  getReviewId: (index: number) => Promise<bigint>,
): Promise<Review[]> {
  const reviews: Review[] = [];

  for (let i = offset; i < offset + limit; i++) {
    try {
      const reviewId = await getReviewId(i);
      const review = await user.connect.ethosReview.getReview(Number(reviewId));

      if (review) {
        reviews.push(review);
      }
    } catch (e) {
      break;
    }
  }

  return reviews;
}

function displayReviews(reviews: Review[]): void {
  if (reviews.length === 0) {
    out('No reviews found.');

    return;
  }

  reviews.forEach((review, index) => {
    out(`\nReview #${index + 1}:`);
    out(f('ID:', review.id.toString()));
    out(f('Score:', String(Score[review.score])));
    out(f('Comment:', review.comment));
    out(f('Created At:', new Date(review.createdAt * 1000).toLocaleString()));
    out(f('Archived:', review.archived ? 'Yes' : 'No'));
    out(f('Author:', review.author));
    out(f('Metadata:', review.metadata));
    out('---');
  });
}

class AddReview extends Subcommand {
  public readonly name = 'add';
  public readonly description = 'Add a review';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      subject: {
        type: 'string',
        alias: 's',
        describe: 'Nickname, Twitter handle, ENS, or address of the subject',
        demandOption: true,
      },
      rating: {
        type: 'string',
        alias: 'r',
        describe: 'Rating (positive, neutral, negative)',
        demandOption: true,
      },
      comment: {
        type: 'string',
        alias: 'c',
        describe: 'Review comment',
        demandOption: true,
      },
      description: {
        type: 'string',
        alias: 'd',
        describe: 'Review description',
        default: '',
        demandOption: false,
      },
      source: {
        type: 'string',
        alias: 'o',
        describe: 'Source of the review',
        default: '',
        demandOption: false,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const subject = new Validator(argv).String('subject');
    const rating = new Validator(argv).Rating('rating');
    const comment = new Validator(argv).String('comment');
    const description = new Validator(argv).String('description');
    const source = new Validator(argv).String('source');
    const isTwitterHandle = subject.includes('twitter.com') || subject.includes('x.com');
    // TODO import twitter scraper and translate from username to account id
    const target = isTwitterHandle
      ? { service: 'x.com', account: subject.split('/').pop() ?? '' }
      : { address: await user.interpretName(subject) };
    const metadata = description || source ? JSON.stringify({ description, source }) : '';
    out(`💬 Adding review for: ${subject}`);
    await txn(user.connect.ethosReview.addReview(rating, target, comment, metadata));
  }
}

class GetReview extends Subcommand {
  public readonly name = 'get';
  public readonly description = 'Get a review';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      reviewId: {
        type: 'number',
        alias: 'i',
        describe: 'Id of the review',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const reviewId = new Validator(argv).Integer('reviewId');
    const review = await user.connect.ethosReview.getReview(reviewId);

    if (!review) {
      error('Review not found');

      return;
    }
    out(`Review: ${JSON.stringify(review, null, 2)}`);
  }
}

class ArchiveReview extends Subcommand {
  public readonly name = 'archive';
  public readonly description = 'Archive a review';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      reviewId: {
        type: 'number',
        alias: 'i',
        describe: 'ID of the review to archive',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const reviewId = new Validator(argv).Integer('reviewId');
    out(`📁 Archiving review: ${reviewId}`);
    await txn(user.connect.ethosReview.archiveReview(reviewId));
  }
}

class EditReview extends Subcommand {
  public readonly name = 'edit';
  public readonly description = 'Edit an existing review';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      reviewId: {
        type: 'number',
        alias: 'i',
        describe: 'ID of the review to edit',
        demandOption: true,
      },
      comment: {
        type: 'string',
        alias: 'c',
        describe: 'Updated review comment',
        demandOption: true,
      },
      description: {
        type: 'string',
        alias: 'd',
        describe: 'Updated review description',
        default: '',
        demandOption: false,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const reviewId = new Validator(argv).Integer('reviewId');
    const comment = new Validator(argv).String('comment');
    const description = new Validator(argv).String('description');
    const metadata = description ? JSON.stringify({ description }) : '';

    out(`✏️ Editing review: ${reviewId}`);
    await txn(user.connect.ethosReview.editReview(reviewId, comment, metadata));
  }
}

class RestoreReview extends Subcommand {
  public readonly name = 'restore';
  public readonly description = 'Restore a previously archived review';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      reviewId: {
        type: 'number',
        alias: 'i',
        describe: 'ID of the review to restore',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const reviewId = new Validator(argv).Integer('reviewId');
    out(`🔄 Restoring review: ${reviewId}`);
    await txn(user.connect.ethosReview.restoreReview(reviewId));
  }
}

class ListReviews extends Subcommand {
  public readonly name = 'list';
  public readonly description = 'List all reviews by an author';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      author: {
        type: 'string',
        alias: 'a',
        describe: 'Nickname, ENS, or address of the author (default: current profile)',
        default: '0',
      },
      ...getPaginationOptions(),
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const author = new Validator(argv).String('author');
    const offset = new Validator(argv).Integer('offset');
    const limit = new Validator(argv).Integer('limit');

    const authorAddress: string | null =
      author === '0' ? (await user.getActiveWallet()).address : await user.interpretName(author);

    out(`📋 Fetching reviews for author: ${authorAddress}`);

    const reviews = await fetchPaginatedReviews(
      user,
      offset,
      limit,
      async (index) =>
        await user.connect.ethosReview.contract.reviewIdsByAuthorAddress(authorAddress, index),
    );

    displayReviews(reviews);
  }
}

class ReviewsBySubjectAddress extends Subcommand {
  public readonly name = 'by-subject';
  public readonly description = 'Get reviews by subject address';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      subject: {
        type: 'string',
        alias: 's',
        describe: 'Nickname, ENS name, or address of the subject',
        demandOption: true,
      },
      ...getPaginationOptions(),
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const subject = new Validator(argv).String('subject');
    const offset = new Validator(argv).Integer('offset');
    const limit = new Validator(argv).Integer('limit');
    const address = await user.interpretName(subject);

    if (!isAddress(address)) {
      error('Invalid subject or unable to resolve to an address');

      return;
    }

    const reviews = await fetchPaginatedReviews(
      user,
      offset,
      limit,
      async (index) =>
        await user.connect.ethosReview.contract.reviewIdsBySubjectAddress(address, index),
    );

    out(`Reviews for subject ${subject} (${address}):`);
    displayReviews(reviews);
  }
}

class ReviewsBySubjectAttestationHash extends Subcommand {
  public readonly name = 'by-attestation';
  public readonly description = 'Get reviews by subject attestation details';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      service: {
        type: 'string',
        alias: 's',
        describe: 'Service name (default: "x.com")',
        default: 'x.com',
      },
      account: {
        type: 'string',
        alias: 'a',
        describe: 'Account identifier for the service',
        demandOption: true,
      },
      ...getPaginationOptions(),
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const service = new Validator(argv).String('service');
    const account = new Validator(argv).String('account');
    const offset = new Validator(argv).Integer('offset');
    const limit = new Validator(argv).Integer('limit');

    const attestationHash = user.connect.ethosAttestation.hash(service, account);

    const reviews = await fetchPaginatedReviews(
      user,
      offset,
      limit,
      async (index) =>
        await user.connect.ethosReview.contract.reviewIdsByAttestationHash(attestationHash, index),
    );

    out(`Reviews for attestation (${service}/${account}):`);
    out(`Attestation Hash: ${attestationHash}`);
    displayReviews(reviews);
  }
}

class SetReviewPrice extends Subcommand {
  public readonly name = 'set-price';
  public readonly description = 'Set review price for a specific payment token';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      allowed: {
        type: 'boolean',
        alias: 'a',
        describe: 'Whether the token is allowed',
        default: true,
      },
      token: {
        type: 'string',
        alias: 't',
        describe: 'Payment token address',
        default: '0x0000000000000000000000000000000000000000',
      },
      price: {
        type: 'string',
        alias: 'p',
        describe: 'Review price (in eth)',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const allowed = new Validator(argv).Boolean('allowed');
    const token = new Validator(argv).String('token');
    const price = new Validator(argv).Float('price');

    if (!isAddress(token)) {
      error('Invalid token address');

      return;
    }

    out(`Setting review price for token ${token}:`);
    out(`Allowed: ${allowed}, Price: ${price}e`);

    if (globals.verbose) {
      out(`Price in wei: ${parseEther(price.toString())}`);
    }
    await txn(
      user.connect.ethosReview.setReviewPrice(allowed, token, parseEther(price.toString())),
    );
  }
}

class WithdrawFunds extends Subcommand {
  public readonly name = 'withdraw';
  public readonly description = 'Withdraw funds from the contract';
  public readonly arguments = (yargs: Argv): Argv =>
    yargs.options({
      token: {
        type: 'string',
        alias: 't',
        describe:
          'Payment token address (use "0x0000000000000000000000000000000000000000" for native currency)',
        demandOption: true,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const token = new Validator(argv).String('token');

    if (!isAddress(token)) {
      error('Invalid token address');

      return;
    }

    out(`Withdrawing funds for token ${token}`);
    await txn(user.connect.ethosReview.withdrawFunds(token));
  }
}

export class ReviewCommand extends Command {
  public readonly name = 'review';
  public readonly description = 'Leave reviews';
  public readonly subcommands = [
    new AddReview(),
    new ListReviews(),
    new ReviewsBySubjectAddress(),
    new ReviewsBySubjectAttestationHash(),
    new GetReview(),
    new EditReview(),
    new ArchiveReview(),
    new RestoreReview(),
    new SetReviewPrice(),
    new WithdrawFunds(),
  ];
}
