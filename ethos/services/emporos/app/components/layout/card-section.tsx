import { Link } from '@remix-run/react';
import { Flex, Typography } from 'antd';
import { type PropsWithChildren } from 'react';

type CardSectionProps = PropsWithChildren<{
  title: string;
  seeAllLink?: string;
}>;

export function CardSection({ title, seeAllLink, children }: CardSectionProps) {
  return (
    <div className="lg:mx-16 w-full">
      <Flex justify="space-between" align="bottom" className="mb-2">
        <Typography.Title level={3}>{title}</Typography.Title>
        {seeAllLink && (
          <Typography.Title level={4}>
            <Link to={seeAllLink} className="text-antd-colorPrimary">
              See All
            </Link>
          </Typography.Title>
        )}
      </Flex>
      {children}
    </div>
  );
}
