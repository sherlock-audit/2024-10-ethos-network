import { ClassNames } from '@emotion/react';
import { Flex, Typography, theme, Tooltip, type TooltipProps } from 'antd';
import { type ReactNode } from 'react';
import { tokenCssVars } from 'config/theme';

const { Text } = Typography;
const { useToken } = theme;

// Define a custom interface that extends TooltipProps
type CustomTooltipProps = {
  overlayInnerStyle?: React.CSSProperties;
} & TooltipProps;

type CustomPopoverProps = {
  title?: ReactNode;
  content: ReactNode;
  children: ReactNode;
} & Omit<CustomTooltipProps, 'title'>;

export function CustomPopover({ title, content, children, ...props }: CustomPopoverProps) {
  const { token } = useToken();

  return (
    <ClassNames>
      {/* eslint-disable-next-line @typescript-eslint/unbound-method */}
      {({ css }) => (
        <Tooltip
          {...props}
          overlayClassName={css`
            & .ant-tooltip-arrow::before {
              background-color: ${tokenCssVars.colorBgElevated};
            }
          `}
          overlayInnerStyle={{
            width: 'max-content',
            backgroundColor: tokenCssVars.colorBgElevated,
            padding: token.paddingSM,
            ...props.overlayInnerStyle,
          }}
          title={
            (title ?? content) ? (
              <Flex vertical gap={8}>
                {title && <Text strong>{title}</Text>}
                <Text>{content}</Text>
              </Flex>
            ) : null
          }
        >
          {children}
        </Tooltip>
      )}
    </ClassNames>
  );
}
