import { snakeCase } from 'lodash';
import { type Summary } from 'prom-client';
import { metrics } from '../metrics';

type Label = 'method_name' | 'http_method' | 'response_code';

export function getClientSummaryMetric(client: string): Summary<Label> {
  return metrics.makeSummary({
    name: `http_request_out_${snakeCase(client)}`,
    help: 'Statistics for outgoing HTTP requests',
    labelNames: ['method_name', 'http_method', 'response_code'] satisfies Label[],
  });
}
