import { Button, Skeleton } from 'antd';
import { useAuthenticate } from '~/hooks/marketUser.tsx';

export function TransactButton({
  onClick,
  label,
}: {
  onClick: React.MouseEventHandler<HTMLElement>;
  label: string;
}) {
  const { isReady, authenticated, login } = useAuthenticate();

  if (!isReady) {
    return <Skeleton.Button className="w-full rounded-md" active size="large" />;
  }

  return (
    <Button
      type="primary"
      className="w-full rounded-md"
      size="large"
      onClick={(e) => {
        if (authenticated) {
          onClick(e);
        } else {
          login();
        }
      }}
    >
      {authenticated ? label : 'Login'}
    </Button>
  );
}
