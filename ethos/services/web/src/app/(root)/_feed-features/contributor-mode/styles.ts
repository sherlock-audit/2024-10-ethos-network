import { css } from '@emotion/react';
import { tokenCssVars } from 'config/theme';

export const contributorModeCard = css`
  box-shadow:
    0px 322px 90px 0px rgba(0, 0, 0, 0),
    0px 206px 83px 0px rgba(0, 0, 0, 0.01),
    0px 116px 70px 0px rgba(0, 0, 0, 0.05),
    0px 52px 52px 0px rgba(0, 0, 0, 0.09),
    0px 13px 28px 0px rgba(0, 0, 0, 0.1);
  background-color: ${tokenCssVars.colorBgContainer};
`;

export function getCardWidthStyles(props?: {
  cardWidth?: number;
  cardBodyPadding?: number;
  vwOffset?: number;
}) {
  const { cardWidth = 340, cardBodyPadding = 18, vwOffset = 40 } = props ?? {};

  return {
    cardWidth: `min(${cardWidth}px, calc(100vw - ${vwOffset}px))`,
    titleWidth: `min(calc(${cardWidth}px - ${cardBodyPadding * 2}px), calc(100vw - ${vwOffset}px - ${cardBodyPadding * 2}px))`,
  };
}

export const contributorModeFixedContainer = css`
  height: 100%;
`;
