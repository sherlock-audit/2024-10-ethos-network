import { echoUrlMap } from '@ethos/env';

const BASE_URL = __ENV.API_BASE_URL || echoUrlMap.dev;

export const config = {
  baseUrl: BASE_URL,
  cloud: {
    projectID: 3711730,
    name: 'API Tests',
    // distribution: {
    //   distributionLabel1: { loadZone: 'amazon:us:ashburn', percent: 50 },
    //   distributionLabel2: { loadZone: 'amazon:ie:dublin', percent: 50 },
    // },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'], // http errors should be less than 2%
    http_req_duration: ['p(95)<3000'], // 95% requests should be below 3s
  },
  testTypes: {
    smoke: {
      stages: [
        { duration: '1m', target: 1 }, // 1 user for 1 minute
      ],
    },
    load: {
      stages: [
        { duration: '2m', target: 30 }, // simulate ramp-up of traffic from 1 to 30 users over 2 minutes.
        { duration: '2m', target: 30 }, // stay at 30 users for 2 minutes
        { duration: '2m', target: 0 }, // ramp-down to 0 users
      ],
    },
    stress: {
      stages: [
        { duration: '2m', target: 20 }, // below normal load
        { duration: '2m', target: 20 },
        { duration: '2m', target: 50 }, // around normal load
        { duration: '5m', target: 50 },
        { duration: '2m', target: 80 }, // ramping out to beaking point
        { duration: '5m', target: 90 },
        { duration: '2m', target: 100 }, // beyond the breaking point
        { duration: '5m', target: 100 },
        { duration: '5m', target: 0 }, // scale down. Recovery stage.
      ],
    },
    soak: {
      stages: [
        { duration: '2m', target: 25 }, // ramp up to  25users(80% of the normal capacity)
        { duration: '3h56m', target: 25 }, // stay at 25 for ~4 hours
        { duration: '2m', target: 0 }, // scale down. (optional)
      ],
    },
  },
};
