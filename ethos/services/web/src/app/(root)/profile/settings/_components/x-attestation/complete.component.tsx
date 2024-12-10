import { Alert, Typography } from 'antd';
import Link from 'next/link';

const { Text } = Typography;

export function CompleteStep({ username }: { username: string }) {
  return (
    <Alert
      type="success"
      message="Success"
      description={
        <Text>
          Your x.com account{' '}
          <Link href={`https://x.com/${username}`} target="_blank">
            <Text strong>@{username}</Text>
          </Link>{' '}
          is now associated with your Ethos profile!
        </Text>
      }
      showIcon
    />
  );
}
