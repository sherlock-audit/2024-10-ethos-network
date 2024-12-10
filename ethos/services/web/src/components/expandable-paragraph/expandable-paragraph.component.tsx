import { css } from '@emotion/react';
import { theme, Typography } from 'antd';
import { tokenCssVars } from 'config/theme';

const { Paragraph, Text } = Typography;
const { useToken } = theme;

type ExpandableParagraphProps = {
  children: string;
  rows?: number;
  enabled?: boolean;
};

export function ExpandableParagraph({
  children,
  rows = 3,
  enabled = true,
}: ExpandableParagraphProps) {
  const { token } = useToken();

  return (
    <Paragraph
      type="secondary"
      css={css`
        white-space: pre-line;
        line-height: ${token.lineHeightSM};

        .ant-typography-collapse {
          margin-inline-start: 0;
        }
      `}
      ellipsis={
        enabled
          ? {
              rows,
              expandable: 'collapsible',
              symbol: (expanded: boolean) => <EllipsisSymbol expanded={expanded} />,
            }
          : false
      }
    >
      {children}
    </Paragraph>
  );
}

function EllipsisSymbol({ expanded }: { expanded: boolean }) {
  return (
    <Text
      css={css`
        color: ${tokenCssVars.colorPrimary};
        cursor: pointer;
        margin-left: ${expanded ? 4 : 0}px;

        &:hover {
          color: ${tokenCssVars.colorPrimaryHover};
        }
      `}
    >
      {expanded ? 'Read less' : 'Read more'}
    </Text>
  );
}
