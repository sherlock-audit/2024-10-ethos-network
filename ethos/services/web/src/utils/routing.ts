import { type Attestation } from '@ethos/blockchain-manager';
import {
  type ActivityInfo,
  attestationActivity,
  invitationAcceptedActivity,
  reviewActivity,
  unvouchActivity,
  vouchActivity,
  type EthosUserTargetWithTwitterUsername,
  X_SERVICE,
} from '@ethos/domain';
import { generateSlug } from '@ethos/helpers';
import { type SetRequired } from 'type-fest';
import { zeroAddress, type Address, getAddress, isAddress } from 'viem';
import { resolveAddressFromEnsName } from '../services/ens';
import { ethosHomepageLink } from 'constant/links';

const serviceMap: Record<string, string> = {
  [X_SERVICE]: 'x',
};

type RouteTo = {
  profile: string;
  score: string;
  slash: string;
  xpHistory: string;
};

export function routeTo(
  target: Exclude<
    EthosUserTargetWithTwitterUsername,
    { profileId: number } | { service: string; account: string }
  > | null,
): RouteTo {
  const routes: RouteTo = {
    // default to a route that does exist to so Next.js prefetching plays nice
    profile: '',
    score: '',
    slash: '/slash',
    xpHistory: '',
  };

  if (target) {
    if ('address' in target) {
      routes.profile = `/profile/${target.address}`;
      routes.score = `${routes.profile}/score`;
      routes.xpHistory = `${routes.profile}/xp`;
    }
    if ('service' in target && 'username' in target) {
      routes.profile = `/profile/${serviceMap[target.service]}/${target.username}`;
      routes.score = `${routes.profile}/score`;
      routes.xpHistory = `${routes.profile}/xp`;
    }
  }

  return routes;
}

/**
 * Generate a profile invite URL
 * @param profileId The profile ID of the inviter
 * @param inviteeAddress The address of the invitee
 * @param returnRelative Whether to return a relative URL, defaults to false
 * @returns URL
 */
export async function generateProfileInviteUrl(
  profileId: number,
  inviteeAddress: string,
  returnRelative = false,
): Promise<string> {
  const address = await resolveAddressFromEnsName(inviteeAddress);

  const inviteId =
    profileId !== undefined ? btoa(`${profileId.toString()}-${address}`).replaceAll(/=/g, '') : '';
  const url = new URL(`/invite/${inviteId}`, window.location.origin);

  return returnRelative ? url.pathname : url.toString();
}

/**
 * Generate invite URL
 * @returns Accept Invite URL
 */

export function getAcceptInviteUrl(): string {
  const url = new URL(`/invite/accept`, window.location.origin);

  return url.toString();
}

/**
 * Get the service path for a given attestation service
 * @param {Attestation["service"]} service - The attestation service
 * @returns {string} The corresponding service path
 */

function getServicePath(service: Attestation['service']): string {
  switch (service) {
    case X_SERVICE:
      return 'x';
    default:
      // eslint-disable-next-line no-case-declarations
      const _exhaustiveCheck: never = service;
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      console.error(`Unhandled service: ${_exhaustiveCheck}`);

      return service;
  }
}

/**
 * Generate a profile invite URL
 * @param type - review or vouch
 * @param id - The ID of the review or vouch
 * @returns URL string
 */
export function getActivityUrl(
  activity: SetRequired<Partial<ActivityInfo>, 'data' | 'type'>,
  includeOrigin = false,
): string {
  const { type, data } = activity;

  // Origin doesn't matter, it's used to create a valid URL. We use only the pathname then.
  const origin = typeof window !== 'undefined' ? window.location.origin : ethosHomepageLink;

  function getPathname(pathname: string) {
    return includeOrigin
      ? new URL(pathname, origin).toString()
      : new URL(pathname, origin).pathname;
  }

  switch (type) {
    case attestationActivity:
      return getPathname(`/profile/${getServicePath(data.service)}/${data.username}`);
    case invitationAcceptedActivity:
      return getPathname(`/profile/${data.primaryAddress}`);
    case reviewActivity:
    case vouchActivity: {
      const slug = generateSlug(data.comment);

      return getPathname(`/activity/${type}/${data.id}/${slug}`);
    }
    case unvouchActivity: {
      const slug = generateSlug(data.comment);

      return getPathname(`/activity/${vouchActivity}/${data.id}/${slug}`);
    }
    default:
      // eslint-disable-next-line no-case-declarations
      const _exhaustiveCheck: never = type;
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unhandled activity type: ${_exhaustiveCheck}`);
  }
}

export function getServiceAccountUrl({
  service,
  account,
}: {
  service: string; // Attestation['service'] is not compatible in some components
  account: string;
}): string {
  return `https://${service}/${account}`;
}

/**
 * Parse a profile invite ID
 * @param inviteId
 */
export function parseProfileInviteId(inviteId: string): {
  inviterProfileId: number | null;
  inviteeAddress: Address | null;
} {
  let [inviterProfileId, inviteeAddress]: string[] | null[] = [null, null];

  if (inviteId === 'accept') {
    return {
      inviterProfileId: -1,
      inviteeAddress: zeroAddress,
    };
  }

  try {
    [inviterProfileId, inviteeAddress] = atob(inviteId).split('-');
  } catch {
    // nothing to do
  }

  if (!isAddress(inviteeAddress ?? '', { strict: false })) {
    inviteeAddress = null;
  }

  return {
    inviterProfileId: inviterProfileId ? Number(inviterProfileId) : null,
    inviteeAddress: inviteeAddress ? getAddress(inviteeAddress) : null,
  };
}
