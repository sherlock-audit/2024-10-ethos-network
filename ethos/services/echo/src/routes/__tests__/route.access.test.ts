import { shouldBlockRoute } from '../route.access.js';

describe('shouldBlockRoute', () => {
  const blockedRoutes = {
    GET: '/api/blocked',
    POST: '/api/restricted',
  };

  function testShouldBlockRoute(method: string, path: unknown, expected: boolean): void {
    test(`should return ${expected} for method ${method} and path ${path as string}`, () => {
      expect(shouldBlockRoute(method, path as string, blockedRoutes)).toBe(expected);
    });
  }

  // Test cases for blocked routes
  testShouldBlockRoute('GET', '/api/blocked', true);
  testShouldBlockRoute('GET', '/api/blocked/subpath', true);
  testShouldBlockRoute('POST', '/api/restricted', true);
  testShouldBlockRoute('POST', '/api/restricted/subpath', true);

  // Test cases for allowed routes
  testShouldBlockRoute('GET', '/api/allowed', false);
  testShouldBlockRoute('POST', '/api/open', false);
  testShouldBlockRoute('PUT', '/api/blocked', false); // Different method, same path

  // Test cases for invalid inputs
  testShouldBlockRoute('GET', null, false);
  testShouldBlockRoute('GET', undefined, false);
  testShouldBlockRoute('GET', 123, false);
  testShouldBlockRoute('INVALID_METHOD', '/api/blocked', false);

  // Test case for empty blockedRoutes
  test('should return false when blockedRoutes is empty', () => {
    expect(shouldBlockRoute('GET', '/api/any', {})).toBe(false);
  });
});
