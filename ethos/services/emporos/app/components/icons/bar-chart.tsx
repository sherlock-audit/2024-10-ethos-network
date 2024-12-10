import Icon, { type CustomIconComponentProps } from './icon.tsx';

function BarChartSvg() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <path d="M4 13.335c.733 0 1.333-.6 1.333-1.334V7.335C5.333 6.6 4.733 6 3.999 6c-.733 0-1.333.6-1.333 1.334V12c0 .734.6 1.334 1.333 1.334ZM10.666 10.001v2c0 .734.6 1.334 1.333 1.334.734 0 1.334-.6 1.334-1.334v-2c0-.733-.6-1.333-1.334-1.333-.733 0-1.333.6-1.333 1.333ZM8 13.335c.733 0 1.333-.6 1.333-1.334v-8c0-.733-.6-1.333-1.334-1.333-.733 0-1.333.6-1.333 1.333v8c0 .734.6 1.334 1.333 1.334Z" />
      </g>
    </svg>
  );
}

export function BarChartIcon(props: Partial<CustomIconComponentProps>) {
  return <Icon component={BarChartSvg} {...props} />;
}
