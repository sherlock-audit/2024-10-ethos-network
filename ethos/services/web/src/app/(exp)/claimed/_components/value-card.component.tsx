import { InfoCircleOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { Card, Flex, theme, Tooltip, Typography } from 'antd';
import { type ReactNode } from 'react';

type ValueCardProps = {
  title: string;
  tooltipText: string;
  value: ReactNode;
  icon?: ReactNode;
  valueColor?: string;
};

export function ValueCard({ title, tooltipText, value, icon, valueColor }: ValueCardProps) {
  const { token } = theme.useToken();

  return (
    <Card
      css={css({
        width: '100%',
        maxWidth: '500px',
        padding: `${token.paddingSM}px`,
      })}
    >
      <Flex vertical gap={token.marginSM} align="center">
        <Flex gap={token.marginSM}>
          <Typography.Text
            css={css({
              fontSize: token.fontSizeSM,
            })}
            type="secondary"
          >
            {title}
          </Typography.Text>
          <Tooltip title={tooltipText}>
            <InfoCircleOutlined />
          </Tooltip>
        </Flex>
        <Flex gap={token.marginSM}>
          <Typography.Title
            level={1}
            css={css({
              color: valueColor,
            })}
            type="secondary"
          >
            <Flex align="center" gap={token.marginXS}>
              {value}
              <span
                css={css({
                  fontSize: '66%',
                })}
              >
                {icon}
              </span>
            </Flex>
          </Typography.Title>
        </Flex>
      </Flex>
    </Card>
  );
}
