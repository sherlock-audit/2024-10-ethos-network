import React, { type MouseEventHandler, type ReactElement } from 'react';
import { useAuthMiddleware } from 'hooks/use-auth-middleware';

export function AuthMiddleware({
  children,
}: {
  children: ReactElement<{ onClick?: MouseEventHandler<HTMLElement> }>;
}) {
  const { handleAuth } = useAuthMiddleware();

  if (React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        handleAuth(e).then((result) => {
          if (result) {
            children.props?.onClick?.(e);
          }
        });
      },
    });
  }

  return null;
}
