import React, {
  type MouseEventHandler,
  type ReactElement,
  cloneElement,
  isValidElement,
} from 'react';
import { useAuthMiddleware } from 'hooks/use-auth-middleware';

// TODO: Need to rework this event attaching
function attachOnClick(
  element: ReactElement<any, any>,
  handleAuth: (e: React.MouseEvent<HTMLElement>) => Promise<boolean>,
): ReactElement {
  if (!isValidElement(element)) return element;

  const newProps = {
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      handleAuth(e).then((result) => {
        if (result) {
          (element.props as { onClick?: MouseEventHandler<HTMLElement> }).onClick?.(e);
        }
      });
    },
  };

  // @ts-expect-error - We know that element.props.children is an array
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const children = React.Children.map(element.props.children, (child: ReactElement) =>
    attachOnClick(child, handleAuth),
  );

  return cloneElement(element, newProps, children);
}

export function AuthMiddleware({
  children,
}: {
  children: ReactElement<{ onClick?: MouseEventHandler<HTMLElement> }>;
}) {
  const { handleAuth } = useAuthMiddleware();

  return attachOnClick(children, handleAuth);
}
