import { css } from '@emotion/react';
import { Avatar, Card, Flex, Typography } from 'antd';
import { type ReactNode, type PropsWithChildren } from 'react';
import { tokenCssVars } from 'config';

type SidebarCardProps = {
  title?: string;
  icon?: ReactNode;
};

export function SidebarCard({ title, icon, children }: PropsWithChildren<SidebarCardProps>) {
  return (
    <Card size="default">
      <Flex
        gap={10}
        vertical
        css={css`
          height: 100%;
        `}
      >
        <Flex gap={6} align="center">
          <Avatar
            css={css`
              background-color: transparent;
            `}
            size="small"
            icon={
              <div
                css={css`
                  font-size: 14px;
                  color: ${tokenCssVars.colorText};
                `}
              >
                {icon}
              </div>
            }
          />
          <Typography.Title level={5}>{title}</Typography.Title>
        </Flex>
      </Flex>
      {children}
    </Card>
  );
}
