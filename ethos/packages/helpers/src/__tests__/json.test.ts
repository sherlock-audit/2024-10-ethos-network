import { z } from 'zod';
import { parseSafe, replacer, reviver } from '../json.js';

describe('replacer/reviver', () => {
  it('should throw an error while trying to stringify BigInt', () => {
    const data = { bigint: BigInt(2) };

    expect(() => JSON.stringify(data)).toThrow('Do not know how to serialize a BigInt');
  });

  it('should properly stringify BigInt', () => {
    const data = { bigint: BigInt(2) };

    const stringified = JSON.stringify(data, replacer);

    expect(stringified).toBe('{"bigint":"2n"}');
  });

  it('should properly parse BigInt and timestamp into Date', () => {
    const data = { bigint: '2n', timestamp: '2020-02-20T20:20:20.202Z' };

    const parsed = JSON.parse(JSON.stringify(data), reviver);

    expect(parsed.bigint).toBe(BigInt(2));
    expect(parsed.timestamp).toBeInstanceOf(Date);
  });
});

describe('parseSafe', () => {
  it('should return null for invalid JSON', () => {
    expect(parseSafe(null)).toBeNull();
    expect(parseSafe('')).toBeNull();
    expect(parseSafe('invalid')).toBeNull();
    expect(parseSafe('{"invalid')).toBeNull();
  });

  it('should return null for invalid JSON with error', () => {
    expect(parseSafe(null, { exposeError: true })).toEqual({ result: null, error: null });
    expect(parseSafe('', { exposeError: true })).toEqual({ result: null, error: null });
    expect(parseSafe('invalid', { exposeError: true })).toEqual({
      result: null,
      error: expect.any(SyntaxError),
    });
    expect(parseSafe('{"invalid', { exposeError: true })).toEqual({
      result: null,
      error: expect.any(SyntaxError),
    });
  });

  it('should return parsed JSON', () => {
    expect(parseSafe('{"key":"value"}')).toEqual({ key: 'value' });
    expect(parseSafe('{"amount": "2n"}')).toEqual({ amount: '2n' });
  });

  it('should return parsed JSON with error', () => {
    expect(parseSafe('{"key":"value"}', { exposeError: true })).toEqual({
      result: { key: 'value' },
      error: null,
    });
  });

  it('should properly parse BigInt and timestamp into Date with reviver function', () => {
    const data = { bigint: BigInt(2), timestamp: '2020-02-20T20:20:20.202Z' };

    const json = JSON.stringify(data, replacer);
    const parsed = parseSafe<{ bigint: bigint; timestamp: Date }>(json, { reviver });

    expect(parsed?.bigint).toBe(BigInt(2));
    expect(parsed?.timestamp).toBeInstanceOf(Date);
  });

  it('should properly parse JSON with Zod schema', () => {
    const schema = { key: z.string() };
    const data = { key: 'value', other: 'this should be removed from the result' };

    const json = JSON.stringify(data);
    const parsed = parseSafe(json, { zodSchema: schema });
    const parsedWithError = parseSafe(json, { exposeError: true, zodSchema: schema });

    expect(parsed).toEqual({ key: 'value' });
    expect(parsedWithError).toEqual({ result: { key: 'value' }, error: null });
  });

  it('should return null when parsing JSON with Zod schema', () => {
    const schema = { key: z.string() };
    const data = { key: 2 };

    const json = JSON.stringify(data);

    expect(parseSafe(json, { zodSchema: schema })).toBeNull();
  });

  it('should return error when parsing JSON with Zod schema', () => {
    const schema = { key: z.string() };
    const data = { key: 2 };

    const json = JSON.stringify(data);
    const { result, error } = parseSafe(json, { exposeError: true, zodSchema: schema });

    expect(result).toBeNull();
    expect(error).toBeInstanceOf(z.ZodError);
  });
});
