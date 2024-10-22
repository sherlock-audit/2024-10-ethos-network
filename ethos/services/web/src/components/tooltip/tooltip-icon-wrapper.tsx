import { css, type SerializedStyles } from '@emotion/react';
import { type PropsWithChildren } from 'react';
/**
 * We need to wrap icon inside tooltip with span to remove invalid DOM errors.
 * But ant-app is adding a line-height: 1.25 to span which is changing icon size.
 * So this component is setting line-height: 1 to span to fix icon size.
 */

export function TooltipIconWrapper(props: PropsWithChildren<{ css?: SerializedStyles }>) {
  const { css: cssProp, children, ...rest } = props;

  return (
    <span
      css={css`
        line-height: 1;
        ${cssProp}
      `}
      {...rest} // Spread tooltip props
    >
      {children}
    </span>
  );
}
