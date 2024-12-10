import { getNetworkByEnvironment } from '@ethos/contracts';
import {
  type EthosUserTargetWithTwitterUsername,
  type EthosUserTarget,
  X_SERVICE,
} from '@ethos/domain';
import { isAddressEqualSafe, isValidEnsName, shortenHash } from '@ethos/helpers';
import { convertScoreToLevel } from '@ethos/score';
import { type Metadata } from 'next';
import { type Address, zeroAddress } from 'viem';
import { getEnvironment } from 'config/environment';
import { getWebServerUrl } from 'config/misc';
import { echoApi } from 'services/echo';

const twitterUsername = '@ethos_network';

function getTitlePrefix() {
  return getEnvironment() === 'prod' ? '' : `[TESTNET DATA] `;
}

export function generateRootMetadata(): Metadata {
  const environment = getEnvironment();
  const title = `Ethos${environment === 'prod' ? '' : ` (${getNetworkByEnvironment(environment)})`}`;
  const description =
    'Reputation & credibility for crypto, driven by peer-to-peer reviews & secured by staked Ethereum. What’s your crypto credibility score?';
  const image = new URL('/assets/images/og/ethos.png', getWebServerUrl()).toString();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
    },
    twitter: {
      title,
      description,
      site: twitterUsername,
      card: 'summary_large_image',
      images: [image],
    },
  };
}

export async function generateProfileMetadata(
  target: EthosUserTargetWithTwitterUsername,
): Promise<Metadata> {
  let actorTarget: EthosUserTarget;

  if ('service' in target && 'username' in target) {
    const twitterProfile = await echoApi.twitter.user.get({ username: target.username });

    if (twitterProfile) {
      actorTarget = { service: X_SERVICE, account: twitterProfile.id };
    } else {
      actorTarget = { address: zeroAddress };
    }
  } else {
    actorTarget = target;
  }
  if ('address' in actorTarget && isValidEnsName(actorTarget.address)) {
    const ensDetails = await echoApi.ens.getDetailsByName(actorTarget.address);

    if (ensDetails.address) actorTarget = { address: ensDetails.address };
  }

  const data = await echoApi.activities.actor(actorTarget).catch(() => null);

  if (!data) {
    return {
      title: 'Profile not found | Ethos',
    };
  }
  const name = data.name ?? 'Unknown user';
  const scoreLevel = convertScoreToLevel(data.score);
  const displayScoreLevel = scoreLevel.charAt(0).toUpperCase() + scoreLevel.slice(1);

  const titlePrefix = getTitlePrefix();
  const title = `${titlePrefix}${name} is rated "${displayScoreLevel}" with a ${data.score} Ethos Credibility Score`;
  const description = 'Click here to learn more about what people say about them';
  const image = new URL(`/og/profile-cards/${data.userkey}`, getWebServerUrl()).toString();

  return {
    title: `${name} | Ethos credibility profile - ${data.score} (${displayScoreLevel})`,
    description: `Want to see more about what people are saying about ${name}? Click the link to find out`,
    openGraph: {
      title,
      description,
      images: [image],
    },
    twitter: {
      title,
      description,
      site: twitterUsername,
      card: 'summary_large_image',
      images: [image],
    },
  };
}

export async function generateReviewMetadata(id: number) {
  const review = await echoApi.activities.get('review', id).catch(() => null);

  if (!review) {
    return {
      title: 'Review not found | Ethos',
    };
  }

  const titlePrefix = getTitlePrefix();
  const title = `${titlePrefix}${review.author.name} left a ${review.data.score} review for ${review.subject.name}`;
  const description = review.data.comment ? `"${review.data.comment}"` : undefined;
  const image = new URL(
    `/og/activity-cards/reviews/${review.data.id}`,
    getWebServerUrl(),
  ).toString();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
    },
    twitter: {
      title,
      description,
      site: twitterUsername,
      card: 'summary_large_image',
      images: [image],
    },
  };
}

export async function generateVouchMetadata(id: number) {
  const vouch = await echoApi.activities.get('vouch', id).catch(() => null);

  if (!vouch) {
    return {
      title: 'Vouch not found | Ethos',
    };
  }

  const titlePrefix = getTitlePrefix();
  const action = vouch.data.archived ? 'unvouched' : 'vouched';
  const title = `${titlePrefix}${vouch.author.name} ${action} for ${vouch.subject.name}`;
  const description = vouch.data.comment ? `"${vouch.data.comment}"` : undefined;
  const image = new URL(
    `/og/activity-cards/vouches/${vouch.data.id}`,
    getWebServerUrl(),
  ).toString();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
    },
    twitter: {
      title,
      description,
      site: twitterUsername,
      card: 'summary_large_image',
      images: [image],
    },
  };
}

export async function generateInviteMetadata(
  address: Address,
  inviterProfileId: number,
): Promise<Metadata> {
  const name = shortenHash(address) ?? 'Unknown address';

  const titlePrefix = getTitlePrefix();
  const title =
    `${titlePrefix} Invitation to Ethos` +
    (!isAddressEqualSafe(address, zeroAddress) ? ` for ${name}` : '');
  const description =
    `Click here to accept invitation` +
    (!isAddressEqualSafe(address, zeroAddress) ? ` as ${name}` : '');

  const image = new URL(
    `/og/invitations/${inviterProfileId}/${address}`,
    getWebServerUrl(),
  ).toString();

  return {
    title: `Accept invitation` + (!isAddressEqualSafe(address, zeroAddress) ? ` - (${name})` : ''),
    description,
    openGraph: {
      title,
      description,
      images: [image],
    },
    twitter: {
      title,
      description,
      site: twitterUsername,
      card: 'summary_large_image',
      images: [image],
    },
  };
}
