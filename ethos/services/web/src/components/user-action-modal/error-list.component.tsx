import { css } from '@emotion/react';
import { Alert, Flex } from 'antd';
import { type UseFormReturn } from 'react-hook-form';
import { type FormInputs } from './user-action-modal.types';

type Props = {
  form: UseFormReturn<FormInputs>;
};

export function ErrorList({ form }: Props) {
  const errors = Object.values(form.formState.errors);

  if (!errors.length) return null;

  return (
    <Flex
      vertical
      gap={8}
      css={css`
        margin-inline: 34px;
        margin-bottom: 42px;
      `}
    >
      {errors.map(
        (error) =>
          error && (
            <Alert
              key={error.message as string}
              message={error.message as string}
              type="error"
              showIcon
              onClose={() => {
                if ('ref' in error && error.ref && 'name' in error.ref) {
                  const fieldName = error.ref.name as keyof FormInputs;
                  form.clearErrors(fieldName);
                }
              }}
              closable
            />
          ),
      )}
    </Flex>
  );
}
