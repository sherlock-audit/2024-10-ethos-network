import { zeroAddress } from 'viem';
import { english, generateMnemonic, mnemonicToAccount } from 'viem/accounts';
import { fromUserKey, isUserKeyValid, toUserKey } from '../user';

const { address } = mnemonicToAccount(generateMnemonic(english));

test('toUserKey', () => {
  expect(toUserKey({ profileId: 123 })).toBe('profileId:123');
  expect(toUserKey({ address })).toBe(`address:${address}`);
  expect(toUserKey({ service: 'x.com', account: '123456789' })).toBe('service:x.com:123456789');
  expect(toUserKey({ service: 'x.com', username: 'johndoe' })).toBe(
    'service:x.com:username:johndoe',
  );
});

test('fromUserKey', () => {
  expect(fromUserKey('profileId:123')).toEqual({ profileId: 123 });
  expect(fromUserKey(`address:${address}`)).toEqual({ address });
  expect(fromUserKey('service:x.com:123456789')).toEqual({
    service: 'x.com',
    account: '123456789',
  });
  expect(fromUserKey('service:x.com:username:johndoe', true)).toEqual({
    service: 'x.com',
    username: 'johndoe',
  });
  expect(() => fromUserKey('service:x.com:username:johndoe')).toThrow('"username" is not allowed');
});

test('isUserKeyValid', () => {
  expect(isUserKeyValid({ address })).toBe(true);
  expect(isUserKeyValid({ address: zeroAddress })).toBe(false);
  expect(isUserKeyValid({ service: 'x.com', account: '123456789' })).toBe(true);
  expect(isUserKeyValid({ service: 'x.com', username: 'johndoe' })).toBe(true);
  expect(isUserKeyValid({ profileId: 123 })).toBe(true);
  expect(isUserKeyValid({ profileId: 0 })).toBe(false);
  expect(isUserKeyValid({ profileId: -10 })).toBe(false);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  expect(() => isUserKeyValid({})).toThrow('Invalid EthosUserTarget');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  expect(() => isUserKeyValid({ address, smth: 'x.com' })).toThrow('EthosUserTarget');
  expect(() => isUserKeyValid({ profileId: 123, address })).toThrow('EthosUserTarget');
  expect(() => isUserKeyValid({ profileId: 123, service: 'x.com' })).toThrow('EthosUserTarget');
  expect(() => isUserKeyValid({ profileId: 123, address, service: 'x.com' })).toThrow(
    'EthosUserTarget',
  );
});
