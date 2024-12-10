import { Link, useRouteError, isRouteErrorResponse } from '@remix-run/react';
import { Button, Typography } from 'antd';
import { useLoginMarketUser } from '~/hooks/marketUser.tsx';

const boundaryContainerClass = 'w-full lg:mx-16 flex flex-col items-center justify-center gap-4';

export function AuthErrorBoundary() {
  const error = useRouteError();
  const login = useLoginMarketUser();

  if (isRouteErrorResponse(error)) {
    return (
      <div className={boundaryContainerClass}>
        <Typography.Title level={3}>{error.data}</Typography.Title>

        {error.status === 401 && (
          <Button onClick={login} type="primary">
            Login
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={boundaryContainerClass}>
      <Typography.Title level={3}>Something went wrong</Typography.Title>
      <Link to="/" className="text-antd-colorLink">
        Go back
      </Link>
    </div>
  );
}
