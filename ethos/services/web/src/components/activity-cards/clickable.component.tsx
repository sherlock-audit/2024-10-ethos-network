import { css } from '@emotion/react';
import { type ReactNode, type PropsWithChildren } from 'react';

/**
 * Makes the entire child component clickable if link is provided.
 *
 * Handles both left and middle mouse button clicks.
 */
export function Clickable({
  children,
  link,
  target = '_self',
}: PropsWithChildren<{ link?: string; target?: HTMLAnchorElement['target'] }>): ReactNode {
  if (!link) {
    return children;
  }

  return (
    <span
      role="link"
      tabIndex={0}
      onMouseDown={(e) => {
        // Left-click
        if (e.button === 0) {
          // Open in new tab if meta key (Cmd on MacOS or Ctrl on Windows/Linux) is pressed
          window.open(link, e.metaKey ? '_blank' : target);
          // Middle-click
        } else if (e.button === 1) {
          window.open(link, '_blank');
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          window.open(link, target);
        }
      }}
      css={css`
        display: contents;
        cursor: pointer;
      `}
    >
      {children}
    </span>
  );
}
