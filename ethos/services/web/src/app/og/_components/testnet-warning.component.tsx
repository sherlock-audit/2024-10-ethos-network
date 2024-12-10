import { type HTMLAttributes } from 'react';
import { getEnvironment } from 'config/environment';

export function TestnetWarning({ style }: { style?: HTMLAttributes<HTMLDivElement>['style'] }) {
  if (getEnvironment() === 'prod') {
    return null;
  }

  return (
    <p
      style={{
        fontSize: '25px',
        lineHeight: '31px',
        color: '#B72B38',
        fontWeight: 600,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        ...style,
      }}
    >
      <span>This is testnet data and</span>
      <span>not representative of fact</span>
    </p>
  );
}
