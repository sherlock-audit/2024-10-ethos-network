import { formatCurrency, formatEth, formatNumber } from '../number.js';

test('formatNumber', () => {
  expect(formatNumber(1.23456789)).toEqual('1.2346');
  expect(formatNumber(1)).toEqual('1');
  expect(formatNumber(1, { minimumFractionDigits: 2 })).toEqual('1.00');
  expect(formatNumber(1.23456789, { maximumFractionDigits: 3 })).toEqual('1.235');
  expect(formatNumber(123456.789123, { maximumFractionDigits: 3 })).toEqual('123.457K');
  expect(formatNumber(1234560000.789123, { maximumFractionDigits: 1 })).toEqual('1.2B');
  expect(formatNumber(123456.789123, { maximumFractionDigits: 3, notation: 'standard' })).toEqual(
    '123,456.789',
  );
});

test('formatCurrency', () => {
  expect(formatCurrency(1.23456789, 'USD')).toEqual('$1.23');
  expect(formatCurrency(1, 'USD')).toEqual('$1');
  expect(formatCurrency(1, 'USD', { minimumFractionDigits: 2 })).toEqual('$1.00');
  expect(formatCurrency(1.23456789, 'USD', { maximumFractionDigits: 3 })).toEqual('$1.235');
  expect(formatCurrency(123456.789123, 'USD', { maximumFractionDigits: 3 })).toEqual('$123.457K');
  expect(formatCurrency(1234560000.789123, 'USD', { maximumFractionDigits: 1 })).toEqual('$1.2B');
  expect(
    formatCurrency(123456.789123, 'USD', { maximumFractionDigits: 3, notation: 'standard' }),
  ).toEqual('$123,456.789');
});

test('formatEth', () => {
  expect(formatEth(1234567890123456789n, 'wei')).toEqual(`1.235e`);
  expect(formatEth(1000000000000000000n, 'wei')).toEqual(`1e`); // 1 ETH in wei
  expect(formatEth(1100000000000000000n, 'wei')).toEqual(`1.1e`);
  expect(formatEth(1110000000000000000n, 'wei')).toEqual(`1.11e`);
  expect(formatEth(11100000000000000000n, 'wei')).toEqual(`11.1e`);
});

test('formatEth with eth unit', () => {
  expect(formatEth(1, 'eth')).toEqual(`1e`); // 1 ETH
  expect(formatEth(1.1, 'eth')).toEqual(`1.1e`); // 1.1 ETH
  expect(formatEth(0.123456789, 'eth')).toEqual(`0.123e`); // 0.123456789 ETH
  expect(formatEth(10, 'eth')).toEqual(`10e`); // 10 ETH
});
