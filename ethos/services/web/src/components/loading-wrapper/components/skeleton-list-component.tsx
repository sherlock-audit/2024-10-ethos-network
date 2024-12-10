import { Skeleton, Flex } from 'antd';

export function SkeletonList({ size = 3 }: { size?: number }) {
  return (
    <Flex align="stretch" vertical>
      <Skeleton
        active
        title={{ style: { display: 'none' } }}
        paragraph={{ rows: size, width: '100%' }}
      />
    </Flex>
  );
}
