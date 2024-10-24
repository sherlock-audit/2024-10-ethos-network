import { check, group } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';
import { config } from '../config/config';
import { randomTwitterAccount } from '../utils/random';

const BASE_URL = config.baseUrl;

type Environment = {
  test_mode: 'smoke' | 'load' | 'stress' | 'soak';
};

// eslint-disable-next-line
declare let __ENV: Environment;

export const errorRate = new Rate('errors');

export const options = {
  stages: config.testTypes[__ENV.test_mode || 'smoke'].stages,
  cloud: config.cloud,
  thresholds: config.thresholds,
};

export default function (): void {
  group('Get Score', function () {
    const randomUsername = randomTwitterAccount();
    const res = http.get(`${BASE_URL}/v1/score/service:x.com:${randomUsername}`); // TODO: Write random x selector
    check(res, {
      'status is 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  });
}
