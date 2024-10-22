import { css } from '@emotion/react';
import { type ScoreValue } from '@ethos/blockchain-manager';
import { Button, Flex, Tooltip } from 'antd';
import { type ButtonColorType } from 'antd/es/button';
import { Controller, type UseFormReturn } from 'react-hook-form';

import { DislikeFilled, LikeDislike, LikeFilled } from 'components/icons';
import { SuccessButton } from 'components/success-button/success-button.component';
import { type FormInputs } from 'components/user-action-modal/user-action-modal.types';
import { tokenCssVars } from 'config';

type Props = {
  form: UseFormReturn<FormInputs<ScoreValue>>;
};

export function ReviewFormInput({ form }: Props) {
  return (
    <Controller
      control={form.control}
      name="value"
      rules={{
        required: 'Review type is required',
      }}
      render={({ field: { onChange, value = -1 } }) => (
        <Flex
          vertical
          justify="center"
          gap={10}
          css={css`
            margin-bottom: 24px;
          `}
        >
          <Flex justify="center" gap={10}>
            {[
              { label: 'Negative', color: 'danger', val: 0, icon: <DislikeFilled /> },
              { label: 'Neutral', color: 'default', val: 1, icon: <LikeDislike /> },
              {
                label: 'Positive',
                color: 'primary',
                val: 2,
                icon: <LikeFilled />,
                isSuccessButton: true,
              },
            ].map(({ label, color, val, icon, isSuccessButton }) =>
              isSuccessButton ? (
                <Tooltip key={val} title="Leave a positive review" mouseEnterDelay={0.75}>
                  <SuccessButton
                    key={val}
                    color="primary"
                    variant={value === val ? 'solid' : 'outlined'}
                    css={css`
                      border-width: 0px;
                      background-color: ${value !== val
                        ? tokenCssVars.colorBgContainer
                        : undefined};
                    `}
                    icon={icon}
                    onClick={() => {
                      onChange(val);
                    }}
                  >
                    {label}
                  </SuccessButton>
                </Tooltip>
              ) : (
                <Tooltip
                  key={val}
                  title={`Leave a ${label.toLowerCase()} review`}
                  mouseEnterDelay={0.75}
                >
                  <Button
                    key={val}
                    type="primary"
                    color={color as ButtonColorType}
                    variant={value === val ? 'solid' : 'outlined'}
                    icon={icon}
                    onClick={() => {
                      onChange(val);
                    }}
                    css={css`
                      border-width: 0px;
                      background-color: ${value !== val
                        ? tokenCssVars.colorBgContainer
                        : undefined};
                    `}
                  >
                    {label}
                  </Button>
                </Tooltip>
              ),
            )}
          </Flex>
        </Flex>
      )}
    />
  );
}
