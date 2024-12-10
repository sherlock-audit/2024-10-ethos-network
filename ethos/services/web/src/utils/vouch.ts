import { type ActivityInfo } from '@ethos/domain';
/**
 * Retrieves the transaction hash URL for a vouch or unvouch event.
 *
 * @param unvouched - Indicates whether the event is an unvouch (true) or vouch (false).
 * @param events - An array of events associated with the activity.
 * @returns The transaction hash of the relevant event.
 */

export function getVouchTxnUrl(unvouched: boolean, events: ActivityInfo['events']) {
  if (!events?.length) return undefined;

  return events.at(unvouched ? -1 : 0)?.txHash;
}
