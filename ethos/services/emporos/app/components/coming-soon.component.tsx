import { useNavigate } from '@remix-run/react';
import { Button, Typography } from 'antd';

export function ComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Typography.Title level={2}>Coming Soon</Typography.Title>
      <Typography.Text className="text-xs">
        We are working on something great for you.
      </Typography.Text>
      <Button
        type="primary"
        size="large"
        onClick={() => {
          navigate(-1);
        }}
      >
        Go back
      </Button>
    </div>
  );
}
