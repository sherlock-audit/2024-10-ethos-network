import { css, type SerializedStyles } from '@emotion/react';
import { forwardRef, type PropsWithChildren } from 'react';

/**
 * We need to wrap icon inside tooltip with span to remove invalid DOM errors.
 * More details: https://ant.design/components/tooltip#why-does-the-warning-finddomnode-is-deprecated-sometimes-appear-in-strict-mode
 * But ant-app is adding a line-height: 1.25 to span which is changing icon size.
 * So this component is setting line-height: 1 to span to fix icon size.
 */
export const TooltipIconWrapper = forwardRef<
  HTMLSpanElement,
  PropsWithChildren<{ css?: SerializedStyles }>
>((props, ref) => {
  const { css: cssProp, children, ...rest } = props;

  return (
    <span
      css={css`
        line-height: 1;
        ${cssProp}
      `}
      {...rest} // Spread tooltip props
      ref={ref}
    >
      {children}
    </span>
  );
});

if (process.env.NODE_ENV !== 'production') {
  TooltipIconWrapper.displayName = 'TooltipIconWrapper';
}
