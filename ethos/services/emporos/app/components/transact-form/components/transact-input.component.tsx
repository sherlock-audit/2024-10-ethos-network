import clsx from 'clsx';
import { forwardRef, type InputHTMLAttributes } from 'react';

export const TransactInput = forwardRef(function TransactInput(
  {
    onChange,
    ...props
  }: {
    onChange: (value: string) => void;
  } & InputHTMLAttributes<HTMLInputElement>,
  ref: React.ForwardedRef<HTMLInputElement>,
) {
  return (
    <div className="transact-input">
      <input
        className={clsx(
          'bg-transparent text-center text-6xl/none relative text-antd-colorTextBase font-plex placeholder:font-plex',
          'overflow-hidden border-none outline-none w-full',
        )}
        placeholder="0"
        ref={ref}
        lang="en"
        onChange={(e) => {
          onChange(e.target.value);
        }}
        {...props}
      />
    </div>
  );
});
