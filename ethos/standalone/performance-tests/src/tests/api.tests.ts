import { check, group } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';
import { config } from '../config/config';
import { randomAddress, randomTwitterAccount, randomProfileId } from '../utils/random';

const BASE_URL = config.baseUrl;

type Environment = {
  test_mode: 'smoke' | 'load' | 'stress' | 'soak';
};

// eslint-disable-next-line @typescript-eslint/naming-convention
declare let __ENV: Environment;

export const errorRate = new Rate('errors');

// Helper function to check if status is 200 or 404
function checkStatus(r: { status: number }): boolean {
  return r.status === 200 || r.status === 404;
}

export const options = {
  stages: config.testTypes[__ENV.test_mode || 'smoke'].stages,
  cloud: config.cloud,
  thresholds: config.thresholds,
};

export default function (): void {
  group('Health Check', function () {
    const res = http.get(`${BASE_URL}/healthcheck`);
    check(res, {
      'status is 200 or 404': checkStatus,
    }) || errorRate.add(1);
  });

  group('Get Activities', function () {
    const payload = JSON.stringify({ pagination: { limit: 10, offset: 0 } });
    const params = { headers: { 'Content-Type': 'application/json' } };
    const res = http.post(`${BASE_URL}/api/v1/activities/recent`, payload, params);
    check(res, {
      'Recent activities status is 200 or 404': checkStatus,
    }) || errorRate.add(1);

    const res2 = http.get(`${BASE_URL}/api/v1/activities/actor/address:${randomAddress()}`);
    check(res2, {
      'Actor activities status is 200 or 404': checkStatus,
    }) || errorRate.add(1);
  });

  group('ENS Details', function () {
    const res = http.get(`${BASE_URL}/api/v1/ens-details/by-address/${randomAddress()}`);
    check(res, {
      'status is 200 or 404': checkStatus,
    }) || errorRate.add(1);
  });

  group('Twitter User', function () {
    const res = http.get(`${BASE_URL}/api/twitter/user?username=${randomTwitterAccount()}`);
    check(res, {
      'status is 200 or 404': checkStatus,
    }) || errorRate.add(1);
  });

  group('Get Activities', function () {
    const payload = JSON.stringify({
      currentUserProfileId: 2,
      pagination: { limit: 10, offset: 0 },
    });
    const params = { headers: { 'Content-Type': 'application/json' } };
    const res = http.post(`${BASE_URL}/api/v1/activities`, payload, params);
    check(res, {
      'status is 200 or 404': checkStatus,
    }) || errorRate.add(1);
  });

  group('Activities', function () {
    const userKey = 'address:' + randomAddress();
    const res1 = http.get(`${BASE_URL}/api/v1/activities/actor/${userKey}`);
    check(res1, {
      'Get actor activities status is 200 or 404': checkStatus,
    }) || errorRate.add(1);

    const payload = JSON.stringify({
      currentUserProfileId: randomProfileId(),
      pagination: { limit: 10, offset: 0 },
    });
    const params = { headers: { 'Content-Type': 'application/json' } };
    const res2 = http.post(`${BASE_URL}/api/v1/activities`, payload, params);
    check(res2, {
      'Get activities status is 200 or 404': checkStatus,
    }) || errorRate.add(1);
  });

  group('Attestations', function () {
    const payload = JSON.stringify({
      profileIds: [randomProfileId()],
      pagination: { limit: 10, offset: 0 },
    });
    const params = { headers: { 'Content-Type': 'application/json' } };
    const res = http.post(`${BASE_URL}/api/v1/attestations`, payload, params);
    check(res, {
      'Query attestations status is 200 or 404': checkStatus,
    }) || errorRate.add(1);
  });

  group('ENS Details', function () {
    const randomName = 'user' + Math.floor(Math.random() * 10000) + '.eth';
    const res1 = http.get(`${BASE_URL}/api/v1/ens-details/by-name/${randomName}`);
    check(res1, {
      'Get ENS details by name status is 200 or 404': checkStatus,
    }) || errorRate.add(1);

    const res2 = http.get(`${BASE_URL}/api/v1/ens-details/by-address/${randomAddress()}`);
    check(res2, {
      'Get ENS details by address status is 200 or 404': checkStatus,
    }) || errorRate.add(1);
  });

  group('Feed', function () {
    const res = http.get(`${BASE_URL}/api/v1/feed?limit=10&offset=0`);
    check(res, {
      'Get feed status is 200 or 404': checkStatus,
    }) || errorRate.add(1);
  });

  group('Profiles', function () {
    const payload = JSON.stringify({
      ids: [randomProfileId()],
    });
    const params = { headers: { 'Content-Type': 'application/json' } };
    const res = http.post(`${BASE_URL}/api/v1/profiles`, payload, params);
    check(res, {
      'Query profiles status is 200 or 404': checkStatus,
    }) || errorRate.add(1);
  });

  group('Score', function () {
    const userKey = 'address:' + randomAddress();
    const res1 = http.get(`${BASE_URL}/api/v1/score/${userKey}`);
    check(res1, {
      'Get score status is 200 or 404': checkStatus,
    }) || errorRate.add(1);

    // Add duration parameter to the score history request
    const duration = '30d'; // Example duration, adjust as needed
    const res2 = http.get(`${BASE_URL}/api/v1/score/${userKey}/history?duration=${duration}`);
    check(res2, {
      'Get score history status is 200 or 404': checkStatus,
    }) || errorRate.add(1);
  });

  group('Search', function () {
    const query = encodeURIComponent('test query');
    const res = http.get(`${BASE_URL}/api/v1/search?q=${query}`);
    check(res, {
      'Search status is 200 or 404': checkStatus,
    }) || errorRate.add(1);
  });

  group('Vouches', function () {
    const payload = JSON.stringify({
      profileIds: [randomProfileId()],
      pagination: { limit: 10, offset: 0 },
    });
    const params = { headers: { 'Content-Type': 'application/json' } };
    const res1 = http.post(`${BASE_URL}/api/v1/vouches`, payload, params);
    check(res1, {
      'Query vouches status is 200 or 404': checkStatus,
    }) || errorRate.add(1);
  });
}
