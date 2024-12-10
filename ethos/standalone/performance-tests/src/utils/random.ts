import { testAddresses } from '../data/address';
import { twitterUsernames } from '../data/twitter';

export function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

export function randomAddress(): string {
  return testAddresses[Math.floor(Math.random() * testAddresses.length)];
}

export function randomTwitterAccount(): string {
  return twitterUsernames[Math.floor(Math.random() * twitterUsernames.length)];
}

export function randomProfileId(): number {
  return Math.floor(Math.random() * 100) + 1;
}
