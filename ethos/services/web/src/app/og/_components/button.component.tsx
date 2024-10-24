import { type PropsWithChildren } from 'react';

type ButtonProps = {
  color?: string;
  width?: string;
  height?: string;
};

export function Button({ color, children, width, height }: PropsWithChildren<ButtonProps>) {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: color,
        borderRadius: '191px',
        color: '#F2F2EC',
        fontSize: '28px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontWeight: '600',
      }}
    >
      {children}
    </div>
  );
}
