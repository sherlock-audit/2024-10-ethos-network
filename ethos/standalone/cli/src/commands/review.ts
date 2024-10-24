import { type Review } from '@ethos/blockchain-manager';
import { parseEther } from 'ethers';
import { isAddress } from 'viem';
import { type ArgumentsCamelCase, type Argv } from 'yargs';
import { globals } from '../globals';
import { Validator } from '../utils/input';
import { error, f, out, txn } from '../utils/output';
import { type WalletManager } from '../utils/walletManager';
import { Command, Subcommand } from './command';

function displayReviews(reviews: Review[]): void {
  if (reviews.length === 0) {
    out('No reviews found.');

    return;
  }

  reviews.forEach((review, index) => {
    out(`\nReview #${index + 1}:`);
    out(f('ID:', review.id.toString()));
    out(f('Score:', review.score));
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
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const subject = new Validator(argv).String('subject');
    const rating = new Validator(argv).Rating('rating');
    const comment = new Validator(argv).String('comment');
    const description = new Validator(argv).String('description');
    const isTwitterHandle = subject.includes('twitter.com') || subject.includes('x.com');
    // TODO import twitter scraper and translate from username to account id
    const target = isTwitterHandle
      ? { service: 'x.com', account: subject.split('/').pop() ?? '' }
      : { address: await user.interpretName(subject) };
    const metadata = description ? JSON.stringify({ description }) : '';
    out(`💬 Adding review for: ${subject}`);
    await txn(user.connect.addReview(rating, target, comment, metadata));
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
      authorProfileId: {
        type: 'number',
        alias: 'a',
        describe: 'Profile ID of the author (default: current profile)',
        default: 0,
      },
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const authorProfileId = new Validator(argv).Integer('authorProfileId');
    let profileId: number | null = authorProfileId;

    if (authorProfileId === 0) {
      profileId = await user.getEthosProfileId();
    }

    if (!profileId) {
      error('No profile ID found');

      return;
    }

    out(`📋 Fetching reviews for author profile ID: ${profileId}`);

    const reviews = await user.connect.ethosReview.getAllReviewsByAuthor(profileId);

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
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const subject = new Validator(argv).String('subject');
    const address = await user.interpretName(subject);

    if (!isAddress(address)) {
      error('Invalid subject or unable to resolve to an address');

      return;
    }

    const reviewIds = await user.connect.ethosReview.reviewIdsBySubjectAddress(address);
    const reviews = await Promise.all(
      reviewIds.map(async (id) => await user.connect.ethosReview.getReview(id)),
    );
    const validReviews = reviews.filter((review): review is Review => review !== null);

    out(`Reviews for subject ${subject} (${address}):`);
    displayReviews(validReviews);
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
    });

  public async method(user: WalletManager, argv: ArgumentsCamelCase<unknown>): Promise<void> {
    const service = new Validator(argv).String('service');
    const account = new Validator(argv).String('account');

    const attestationHash = user.connect.ethosAttestation.hash(service, account);

    const reviewIds =
      await user.connect.ethosReview.reviewIdsBySubjectAttestationHash(attestationHash);
    const reviews = await Promise.all(
      reviewIds.map(async (id) => await user.connect.ethosReview.getReview(id)),
    );
    const validReviews = reviews.filter((review): review is Review => review !== null);

    out(`Reviews for attestation (${service}/${account}):`);
    out(`Attestation Hash: ${attestationHash}`);
    displayReviews(validReviews);
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
