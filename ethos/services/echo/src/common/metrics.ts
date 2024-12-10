import { AggregatorRegistry, collectDefaultMetrics, Counter, Summary } from 'prom-client';
import { type SnakeCase } from 'type-fest';

const PREFIX = 'echo_';
const aggregatorRegistry = new AggregatorRegistry();

export function initDefaultMetrics(): void {
  collectDefaultMetrics({ prefix: PREFIX });
}

export async function getMetrics(): Promise<{ contentType: string; metrics: string }> {
  const metrics = await aggregatorRegistry.clusterMetrics();

  return {
    contentType: aggregatorRegistry.contentType,
    metrics,
  };
}

function prefixName(name: string): string {
  return `${PREFIX}${name}`;
}

/**
 * Metrics utility object for creating counters, summaries, and timers.
 */
export const metrics = {
  /**
   * Creates a Prometheus Counter.
   *
   * A Counter is a cumulative metric that represents a single monotonically increasing counter
   * whose value can only increase or be reset to zero on restart. For example, you can use a
   * counter to represent the number of requests served, tasks completed, or errors.
   *
   * Note: summaries include a count; you don't need both for the same target.
   *
   * @param name - The name of the counter metric.
   * @param help - A description of what the counter represents.
   * @param labelNames - An array of label names for the counter.
   * @returns A Prometheus Counter instance.
   */
  makeCounter<T extends string>({
    name,
    help,
    labelNames = [],
  }: {
    name: string;
    help: string;
    labelNames?: Array<SnakeCase<T>>;
  }): Counter<SnakeCase<T>> {
    return new Counter({
      name: prefixName(name),
      help,
      labelNames,
    });
  },

  /**
   * Creates a Prometheus Summary.
   *
   * A Summary samples observations (usually things like request durations and response sizes)
   * and provides a total count of observations and a sum of all observed values. It calculates
   * configurable quantiles over a sliding time window.
   *
   * Summaries are useful when you need to track the size of events,
   * observe how long certain operations take, or count events while calculating their average.
   *
   * @param name - The name of the summary metric.
   * @param help - A description of what the summary represents.
   * @param labelNames - An array of label names for the summary.
   * @returns A Prometheus Summary instance.
   */
  makeSummary<T extends string>({
    name,
    help,
    labelNames,
  }: {
    name: string;
    help: string;
    labelNames: Array<SnakeCase<T>>;
  }): Summary<SnakeCase<T>> {
    return new Summary({
      name: prefixName(name),
      help,
      labelNames,
    });
  },
};
