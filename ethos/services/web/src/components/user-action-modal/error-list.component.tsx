import { css } from '@emotion/react';
import { Alert, Flex } from 'antd';
import { type UseFormReturn } from 'react-hook-form';
import { type FormInputs } from './user-action-modal.types';

type Props = {
  form: UseFormReturn<FormInputs<number>>;
};

export function ErrorList({ form }: Props) {
  const errors = Object.values(form.formState.errors);

  if (!errors.length) return null;

  return (
    <Flex
      vertical
      gap={8}
      css={css`
        margin: 15px 34px;
      `}
    >
      {errors.map(
        (error) =>
          error && (
            <Alert
              key={error.message}
              message={error.message}
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
