import { css } from '@emotion/react';

const TABLET_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1024;

export const hideOnMobileCSS = css`
  @media (max-width: ${TABLET_BREAKPOINT - 1}px) {
    display: none;
  }
`;

export const hideOnBelowTabletCSS = css`
  @media (max-width: ${TABLET_BREAKPOINT - 1}px) {
    display: none;
  }
`;

export const hideOnTabletOnlyCSS = css`
  @media (min-width: ${TABLET_BREAKPOINT}px) and (max-width: ${DESKTOP_BREAKPOINT - 1}px) {
    display: none;
  }
`;

export const hideOnTabletAndAboveCSS = css`
  @media (min-width: ${TABLET_BREAKPOINT}px) {
    display: none;
  }
`;

export const hideOnBelowDesktopCSS = css`
  @media (max-width: ${DESKTOP_BREAKPOINT - 1}px) {
    display: none;
  }
`;

export const hideOnDesktopCSS = css`
  @media (min-width: ${DESKTOP_BREAKPOINT}px) {
    display: none;
  }
`;
