import { type FieldValues } from 'react-hook-form';

export type FormInputs<T = FieldValues['value']> = {
  title: string;
  description?: string;
  value: T;
};
