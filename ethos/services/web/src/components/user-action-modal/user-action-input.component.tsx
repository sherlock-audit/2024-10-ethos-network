import { css } from '@emotion/react';
import { type ScoreValue } from '@ethos/blockchain-manager';
import { Flex, Input, theme, Typography } from 'antd';
import { type Control, Controller } from 'react-hook-form';
import { type FormInputs } from './user-action-modal.types';
import { tokenCssVars } from 'config';
import { MAX_TITLE_LENGTH } from 'constant/restrictions.constant';

type Props = {
  control: Control<FormInputs<ScoreValue>>;
  onTitleChange: (value: string) => void;
};

const { Text } = Typography;

export function ReviewInput({ control, onTitleChange }: Props) {
  const { token } = theme.useToken();

  return (
    <Flex
      vertical
      css={css`
        width: 100%;
      `}
    >
      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, value } }) => (
          <div
            css={css`
              position: relative;
            `}
          >
            {value ? undefined : (
              <Text
                css={css`
                  color: ${tokenCssVars.colorError};
                  position: absolute;
                  top: 10px;
                  left: 5px;
                  z-index: 5;
                `}
              >
                *
              </Text>
            )}
            <Input.TextArea
              autoSize
              onChange={(e) => {
                onChange(e);
                onTitleChange(e.target.value);
              }}
              placeholder="Add Title"
              variant="borderless"
              size="large"
              maxLength={MAX_TITLE_LENGTH}
              value={value}
              css={css`
                background: ${tokenCssVars.colorBgContainer};
                color: ${tokenCssVars.colorText};
                font-size: 19px;
                font-family: var(--font-queens), sans-serif !important;
                & textarea {
                  font-family: var(--font-queens), sans-serif !important;
                }
              `}
            />
          </div>
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, value } }) => {
          return (
            <Input.TextArea
              autoSize
              onChange={onChange}
              placeholder="Add description (optional)"
              size="small"
              variant="borderless"
              value={value}
              css={css`
                text-align: left;
                font-size: ${token.fontSizeSM}px;
                line-height: 20px;
                background: ${tokenCssVars.colorBgContainer};
                color: ${tokenCssVars.colorTextSecondary};
                padding-left: 11px;
              `}
            />
          );
        }}
      />
    </Flex>
  );
}
