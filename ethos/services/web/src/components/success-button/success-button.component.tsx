import { css, type SerializedStyles } from '@emotion/react';
import { Button, type ButtonProps } from 'antd';
import { type ButtonVariantType } from 'antd/es/button';
import { forwardRef } from 'react';
import { tokenCssVars } from 'config/theme';

const outlineStyle = css`
  background-color: ${tokenCssVars.colorBgContainer};
  border-color: ${tokenCssVars.colorSuccessBorderHover};
  color: ${tokenCssVars.colorSuccess};
  &:hover {
    color: ${tokenCssVars.colorSuccessTextHover};
    border-color: ${tokenCssVars.colorSuccessBorderHover};
  }
`;

const solidStyle = css`
  background-color: ${tokenCssVars.colorSuccess};
  border-color: ${tokenCssVars.colorSuccessBorder};
  color: ${tokenCssVars.buttonDangerColor};
  &:hover {
    border-color: ${tokenCssVars.colorSuccessBorderHover};
    background-color: ${tokenCssVars.colorSuccessHover};
  }
`;

const textStyle = css`
  color: ${tokenCssVars.colorSuccess};
  &:hover {
    color: ${tokenCssVars.colorSuccessHover};
    background-color: ${tokenCssVars.colorSuccessBgHover};
  }
`;

const linkStyle = css`
  color: ${tokenCssVars.colorSuccess};
  &:hover {
    color: ${tokenCssVars.colorSuccessHover};
  }
`;

const filledStyle = css`
  background-color: ${tokenCssVars.colorSuccessBg};
  border-color: ${tokenCssVars.colorSuccessBorder};
  color: ${tokenCssVars.colorSuccess};
  &:hover {
    background-color: #bad0b6;
  }
`;

const variantStyleMap: Record<ButtonVariantType, SerializedStyles> = {
  outlined: outlineStyle,
  filled: filledStyle,
  dashed: outlineStyle,
  link: linkStyle,
  solid: solidStyle,
  text: textStyle,
};

export const SuccessButton = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const { variant } = props;

  return (
    <Button ref={ref} css={variant && variantStyleMap[variant]} {...props}>
      {props.children}
    </Button>
  );
});

if (process.env.NODE_ENV !== 'production') {
  SuccessButton.displayName = 'SuccessButton';
}
