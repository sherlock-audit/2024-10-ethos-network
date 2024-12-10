import Icon, { type CustomIconComponentProps } from './icon.tsx';

export function LineChartSvg() {
  return (
    <svg width="1em" height="1em" fill="currentColor" viewBox="0 -960 960 960">
      <path d="m140-220-60-60 300-300 160 160 284-320 56 56-340 384-160-160-240 240Z" />
    </svg>
  );
}

export function LineChartIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={LineChartSvg} {...props} />;
}
