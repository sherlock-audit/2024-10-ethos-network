import { css, type SerializedStyles } from '@emotion/react';
import { Flex, type FlexProps } from 'antd';
import { tokenCssVars } from 'config/theme';

export function ActivityIconTag(
  props: {
    hasPadding?: boolean;
    css?: SerializedStyles;
  } & FlexProps,
) {
  const { hasPadding, css: cssProp, children, ...rest } = props;

  return (
    <Flex
      align="center"
      justify="center"
      css={css`
        background-color: ${tokenCssVars.colorBgLayout};
        border-radius: 6px;
        height: 34px;
        min-width: 34px;
        width: fit-content;
        flex-shrink: 0;
        padding-inline: ${hasPadding ? '10px' : '0px'};
        ${cssProp}
      `}
      {...rest}
    >
      {children}
    </Flex>
  );
}
