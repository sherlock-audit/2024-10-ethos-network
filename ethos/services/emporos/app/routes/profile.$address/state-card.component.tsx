import { Card, Flex, Typography } from 'antd';

export function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card
      className="flex-1 md:flex-initial"
      classNames={{
        body: 'py-4 px-4 lg:py-6 md:px-8 h-full flex',
      }}
    >
      <Flex vertical align="center" justify="center" gap={4} flex={1}>
        <Typography.Text className="text-sm text-antd-colorTextSecondary">{title}</Typography.Text>
        <Typography.Title className="text-antd-colorPrimary" level={2}>
          {value}
        </Typography.Title>
      </Flex>
    </Card>
  );
}
