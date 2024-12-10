import { css } from '@emotion/react';
import { type PropsWithChildren } from 'react';

export function PreventInheritedLinkClicks({ children }: PropsWithChildren) {
  return (
    <span
      css={css`
        display: contents;
      `}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      {children}
    </span>
  );
}
