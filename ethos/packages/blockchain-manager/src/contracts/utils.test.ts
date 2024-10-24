import { type Log } from 'ethers';
import { zeroAddress } from 'viem';
import { decodeWETH9Log, formatTokenAmount, parseTokenAmount } from './utils';

describe('parseTokenAmount', () => {
  // TODO: it loads Mocha types instead of Jest ones
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment, @typescript-eslint/prefer-ts-expect-error
  // @ts-ignore - Property 'each' does not exist on type 'SuiteFunction'.
  describe.each([
    { value: '0.1', tokenAddress: zeroAddress, expected: 100000000000000000n },
    { value: '123.987', tokenAddress: zeroAddress, expected: 123987000000000000000n },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment, @typescript-eslint/prefer-ts-expect-error
    // @ts-ignore - Binding element '...' implicitly has an 'any' type.
  ])('Token $tokenAddress with value $value', ({ value, tokenAddress, expected }) => {
    it(`should return ${expected}n`, () => {
      expect(parseTokenAmount(value, tokenAddress)).toBe(expected);
    });
  });
});

describe('formatTokenAmount', () => {
  // TODO: it loads Mocha types instead of Jest ones
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment, @typescript-eslint/prefer-ts-expect-error
  // @ts-ignore - Property 'each' does not exist on type 'SuiteFunction'.
  describe.each([
    { value: 100000000000000000n, tokenAddress: zeroAddress, expected: '0.1' },
    { value: 123987000000000000000n, tokenAddress: zeroAddress, expected: '123.987' },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment, @typescript-eslint/prefer-ts-expect-error
    // @ts-ignore - Binding element '...' implicitly has an 'any' type.
  ])('Token $tokenAddress with value $value', ({ value, tokenAddress, expected }) => {
    it(`should return ${expected}n`, () => {
      expect(formatTokenAmount(value, tokenAddress)).toBe(expected);
    });
  });
});

describe('decodeWETH9Log', () => {
  it('should decode a WETH9 deposit log', () => {
    const log = {
      provider: {
        retryOptions: { retries: 5, randomize: true },
      },
      transactionHash: '0x5eb9267f603fbd4bc23d74600acceb09753368399fc648fb898c5c9bef3ed9bd',
      blockHash: '0x09b94e8876a99e9255e59fa97aa0e0038b1c6a82cf552731433145e0a4fb07c8',
      blockNumber: 14897485,
      removed: undefined,
      address: '0x4200000000000000000000000000000000000006',
      data: '0x00000000000000000000000000000000000000000000000abbcd4ef377580000',
      topics: [
        '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c',
        '0x0000000000000000000000002086111d95aa6a057d450b8949eecb7b26c42deb',
      ],
      index: 2,
      transactionIndex: 4,
    };
    const decoded = decodeWETH9Log(log as unknown as Log);
    expect(decoded.deposit).toEqual(198000000000000000000n);
  });
  it('should decode a WETH9 withdraw log', () => {
    const log = {
      provider: {
        retryOptions: { retries: 5, randomize: true },
      },
      transactionHash: '0x321cfc480f83b28aff12949537f7d0d83fb91a99512f887f2cd3ab755996d24b',
      blockHash: '0xf6b484089ea64d1674398fd26e449e29324c384c493ad16e312affcd8e158e98',
      blockNumber: 14897594,
      removed: undefined,
      address: '0x4200000000000000000000000000000000000006',
      data: '0x00000000000000000000000000000000000000000000000abbc5528358fcd98c',
      topics: [
        '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65',
        '0x0000000000000000000000002086111d95aa6a057d450b8949eecb7b26c42deb',
      ],
      index: 2,
      transactionIndex: 2,
    };
    const decoded = decodeWETH9Log(log as unknown as Log);
    expect(decoded.withdraw).toEqual(197997752116687198604n);
  });
});
