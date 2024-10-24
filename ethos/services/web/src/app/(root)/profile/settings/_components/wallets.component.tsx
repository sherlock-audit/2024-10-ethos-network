import { Avatar, Card, List, Typography } from 'antd';
import { getBlockieUrl } from 'hooks/user/lookup';
import { useConnectedProfileAddresses } from 'hooks/user/utils';

export function Wallets() {
  const { data: profileAddresses, isPending } = useConnectedProfileAddresses();

  return (
    <Card title="Wallets">
      <List
        dataSource={profileAddresses?.allAddresses}
        loading={isPending}
        itemLayout="horizontal"
        renderItem={(wallet) => (
          <List.Item>
            <List.Item.Meta
              avatar={<Avatar src={getBlockieUrl(wallet)} />}
              title={
                <Typography.Text>
                  <strong>Address:</strong>
                </Typography.Text>
              }
              description={
                <Typography.Text
                  copyable={{
                    text: wallet,
                  }}
                >
                  {wallet}
                </Typography.Text>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
