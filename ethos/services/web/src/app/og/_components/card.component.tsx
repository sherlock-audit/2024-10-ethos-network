import { type PropsWithChildren } from 'react';
import { lightTheme } from 'config/theme';

export function Card({
  children,
  elevated,
  outerSpace = true,
}: PropsWithChildren<{ elevated?: boolean; outerSpace?: boolean }>) {
  return (
    <OuterCard elevated={elevated} outerSpace={outerSpace}>
      {children}
    </OuterCard>
  );
}

export const cardPaddingX = 27;

function OuterCard({
  children,
  elevated,
  outerSpace,
}: PropsWithChildren<{ elevated?: boolean; outerSpace: boolean }>) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: outerSpace ? `14px ${cardPaddingX}px` : '',
        background: 'transparent',
        fontFamily: 'Inter',
        color: lightTheme.token.colorText,
      }}
    >
      <CardContent elevated={elevated} outerSpace={outerSpace}>
        {children}
      </CardContent>
    </div>
  );
}

function CardContent({
  children,
  elevated,
  outerSpace,
}: PropsWithChildren<{ elevated?: boolean; outerSpace: boolean }>) {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: elevated
          ? lightTheme.token.colorBgElevated
          : lightTheme.token.colorBgContainer,
        borderRadius: outerSpace ? '29px' : 0,
        overflow: 'hidden',
        boxShadow:
          '0px 23px 29px 0px rgba(0, 0, 0, 0.00), 0px 26px 26px 0px rgba(0, 0, 0, 0.01), 0px 7px 22px 0px rgba(0, 0, 0, 0.03), 0px 4px 17px 0px rgba(0, 0, 0, 0.05), 0px 4px 9px 0px rgba(0, 0, 0, 0.06)',
      }}
    >
      {children}
    </div>
  );
}
