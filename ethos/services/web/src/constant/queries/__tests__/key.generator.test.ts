import { type EthosUserTarget } from '@ethos/domain';
import { INVALIDATE_ALL, _keyGenerator } from '../key.generator';
import { cacheKeys } from '../queries.constant';

const generated = _keyGenerator.byOptional('arbitraryKey');

test('_keyGenerator', () => {
  expect(_keyGenerator.byString('key')('name')).toEqual(['key', 'name']);
  expect(generated('name')).toEqual(['arbitraryKey', 'name']);
  expect(generated('id')).toEqual(['arbitraryKey', 'id']);
  expect(_keyGenerator.byNumber('key')(1)).toEqual(['key', 1]);
});

test('cacheKeys', () => {
  expect(cacheKeys.attestation.byTarget({ address: '0x5f' })).toEqual([
    'attestation',
    'byAddress',
    '0x5f',
  ]);
  expect(cacheKeys.profile.byAddress(INVALIDATE_ALL)).toEqual(['profile', 'byAddress']);
});

test('byTarget', () => {
  const targets: EthosUserTarget[] = [
    { address: '0x5f' },
    { profileId: 5 },
    { service: 'x.com', account: 'NASA' },
  ];

  expect(cacheKeys.profile.byTarget(targets[0])).toEqual(['profile', 'byAddress', '0x5f']);
  expect(cacheKeys.profile.byTarget(targets[1])).toEqual(['profile', 'byProfileId', 5]);
  expect(cacheKeys.profile.byTarget(targets[2])).toEqual(['profile', 'x.com', 'nasa']);
});
