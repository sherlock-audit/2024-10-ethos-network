import { css, type SerializedStyles } from '@emotion/react';
import { Flex, Typography, theme } from 'antd';
import Link from 'next/link';
import { type ReactNode } from 'react';
import { TopActions } from './top-actions/top-actions.component';
import { RelativeDateTime } from 'components/RelativeDateTime';
import { PreventInheritedLinkClicks } from 'components/prevent-inherited-link-clicks/prevent-inherited-link-clicks.component';
import { tokenCssVars } from 'config';

const { Text } = Typography;

type Props = {
  timestamp?: number;
  title: ReactNode;
  onWithdraw?: () => void;
  pathname?: string;
  isPreview?: boolean;
  hideTimestamp?: boolean;
  txnHash?: string;
  wrapperCSS?: SerializedStyles;
};

export function CardHeader({
  timestamp,
  title,
  onWithdraw,
  pathname,
  isPreview,
  hideTimestamp,
  txnHash,
  wrapperCSS,
}: Props) {
  const { token } = theme.useToken();

  const safeTimestamp = Number.isFinite(timestamp) ? timestamp : undefined;

  return (
    <Flex
      css={css`
        padding: 11px ${token.padding}px;
        border: solid ${tokenCssVars.colorBgLayout};
        border-width: 0 0 1px 0;
        ${wrapperCSS}
      `}
      align="stretch"
    >
      <Flex justify="space-between" align="center" gap={4} flex={1}>
        <Flex flex={1}>{title}</Flex>
        {safeTimestamp && !hideTimestamp ? (
          <Link
            href={pathname ?? 'javascript:void(0)'}
            css={css`
              display: flex;
              align-items: center;
            `}
          >
            <Text
              css={css`
                color: ${tokenCssVars.colorTextTertiary};
              `}
            >
              <RelativeDateTime
                dateTimeFormat={{ dateStyle: 'long', timeStyle: 'short' }}
                timestamp={safeTimestamp}
              />
            </Text>
          </Link>
        ) : null}

        {!isPreview && (
          <PreventInheritedLinkClicks>
            <TopActions onWithdraw={onWithdraw} pathname={pathname} txnHash={txnHash} />
          </PreventInheritedLinkClicks>
        )}
      </Flex>
    </Flex>
  );
}
