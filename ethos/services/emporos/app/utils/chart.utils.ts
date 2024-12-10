import { useSearchParams } from '@remix-run/react';
import { z } from 'zod';
import { chartWindowOptions, type ChartWindow } from '~/types/charts.ts';

export type ChartParams = {
  window: ChartWindow;
};

const DEFAULT_CHART_PARAMS: ChartParams = {
  window: '7D',
};

export const chartParamsSchema = z.object({
  window: z.enum(chartWindowOptions),
});

export function getChartParams(
  request: Request,
  defaults: ChartParams | undefined = DEFAULT_CHART_PARAMS,
): ChartParams {
  const { searchParams } = new URL(request.url);
  const result = chartParamsSchema.safeParse({
    window: searchParams.get('window') ?? defaults.window,
  });

  if (!result.success) {
    throw new Response('Invalid chart parameters', { status: 400 });
  }

  return { window: result.data.window ?? defaults.window };
}
export function useChartParams(): [ChartParams, (params: ChartParams) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const window = searchParams.get('window');

  const result = chartParamsSchema.safeParse({
    window: window ?? DEFAULT_CHART_PARAMS.window,
  });

  const params = !result.success ? DEFAULT_CHART_PARAMS : { window: result.data.window };

  function setParams(newParams: ChartParams) {
    searchParams.set('window', newParams.window);
    setSearchParams(searchParams, {
      preventScrollReset: true,
    });
  }

  return [params, setParams];
}
