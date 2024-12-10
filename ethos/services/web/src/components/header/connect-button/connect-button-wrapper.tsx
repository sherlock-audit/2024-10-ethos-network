import { css, type SerializedStyles } from '@emotion/react';
import { type PropsWithChildren } from 'react';

export function ConnectButtonWrapper({
  children,
  ready,
  wrapperCSS,
}: PropsWithChildren<{
  ready: boolean;
  wrapperCSS?: SerializedStyles;
}>) {
  return (
    <div
      {...(!ready && {
        'aria-hidden': true,
        style: {
          opacity: 0,
          pointerEvents: 'none',
          userSelect: 'none',
        },
      })}
      css={css`
        ${wrapperCSS}
        line-height: 0;
      `}
    >
      {children}
    </div>
  );
}
