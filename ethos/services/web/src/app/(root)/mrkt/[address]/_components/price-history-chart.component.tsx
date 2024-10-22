import { formatCurrency } from '@ethos/helpers';
import { theme } from 'antd';
import {
  type AreaSeriesPartialOptions,
  ColorType,
  createChart,
  TickMarkType,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';

export const chartWindowOptions = ['1D', '7D', '1M', '1Y', 'All'] as const;
export type ChartWindow = (typeof chartWindowOptions)[number];

export const priceTypeOptions = ['trust', 'distrust'] as const;
export type PriceType = 'trust' | 'distrust';

type AreaChartProps = {
  data: Array<{ time: UTCTimestamp; trust: number; distrust: number }>;
  priceType: PriceType;
  chartWindow: ChartWindow;
};

export function PriceHistoryChart({ data, priceType }: AreaChartProps) {
  const { token } = theme.useToken();

  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const seriesColors: Record<PriceType, AreaSeriesPartialOptions> = {
      trust: {
        lineColor: token.colorSuccess,
        topColor: token.colorSuccess,
        bottomColor: token.colorSuccessBg,

        lineWidth: 2,
      },
      distrust: {
        lineColor: token.colorError,
        topColor: token.colorError,
        bottomColor: token.colorErrorBg,
        lineWidth: 2,
      },
    };
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      grid: {
        horzLines: {
          visible: false,
        },
        vertLines: {
          visible: false,
        },
      },
      handleScale: false,
      handleScroll: false,
      layout: {
        background: { type: ColorType.Solid, color: token.colorBgContainer },
        textColor: token.colorText,
        attributionLogo: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 200,
      timeScale: {
        borderColor: token.colorText,
        timeVisible: true,
        secondsVisible: false, // Hide seconds if not needed
        tickMarkFormatter: (time: UTCTimestamp, _tickMarkType: TickMarkType, locale: string) => {
          if (_tickMarkType === TickMarkType.Time) {
            return new Date(time * 1000).toLocaleTimeString(locale, {
              hour: '2-digit',
              minute: '2-digit',
            });
          } else {
            return new Date(time * 1000).toLocaleDateString(locale);
          }
        },
      },
      rightPriceScale: {
        borderColor: token.colorText,
      },
    });
    chart.timeScale().fitContent();
    chart.priceScale('right');

    const priceSeries = chart.addAreaSeries({
      title: priceType === 'trust' ? 'Trust Price' : 'Distrust Price',
      priceLineVisible: false,
      ...seriesColors[priceType],
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => {
          return formatCurrency(price, 'ETH', { maximumFractionDigits: 5 });
        },
      },
    });
    priceSeries.setData(
      data.map((d) => ({ time: d.time, value: priceType === 'trust' ? d.trust : d.distrust })),
    );

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, priceType, token]);

  return <div ref={chartContainerRef} />;
}
