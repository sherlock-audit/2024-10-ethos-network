'use client';

import { css } from '@emotion/react';
import { type FallbackRender } from '@sentry/nextjs';
import { Button, Empty, Flex, theme, Typography } from 'antd';
import { useIntercom } from 'react-use-intercom';
import { ErrorContainer } from './error-container';
import { ErrorHeader } from './error-header';
import { tokenCssVars } from 'config/theme';

type ErrorMessageProps = {
  error: any;
  eventId: string;
  variant?: 'small' | 'large';
};

function ErrorMessage({ error, eventId, variant = 'large' }: ErrorMessageProps) {
  const { token } = theme.useToken();

  const isSmall = variant === 'small';

  return (
    <>
      <Empty
        image="/assets/images/illustrations/no_invitations_icon.svg"
        description={null}
        imageStyle={{
          height: isSmall ? 80 : 106, // Adjust image height based on variant
        }}
      />
      <Flex vertical align="center" gap={isSmall ? 4 : 8}>
        <Typography.Title
          level={1}
          css={css`
            font-size: ${isSmall ? '30px' : '40px'};
            line-height: ${isSmall ? '28px' : '40px'};
            text-align: center;
            @media (max-width: ${token.screenSM - 1}px) {
              font-size: ${isSmall ? '16px' : '24px'};
              line-height: ${isSmall ? '24px' : '32px'};
            }
          `}
        >
          Something went wrong
        </Typography.Title>
        <Typography.Text
          css={{
            fontSize: isSmall ? '12px' : '14px',
            lineHeight: isSmall ? '20px' : '22px',
            textAlign: 'center',
            color: tokenCssVars.colorText,
          }}
        >
          {error?.cause?.message || 'Unknown error has occurred'}
        </Typography.Text>
        <Typography.Text
          css={{
            fontSize: isSmall ? '10px' : '12px',
            lineHeight: isSmall ? '18px' : '22px',
            color: tokenCssVars.colorTextSecondary,
          }}
        >
          Error ID:{' '}
          <Typography.Text
            code
            copyable
            css={{ fontSize: 'inherit', color: 'inherit', lineHeight: 'inherit' }}
          >
            {eventId}
          </Typography.Text>
        </Typography.Text>
      </Flex>
    </>
  );
}

// Page-level error boundary component
export function PageErrorBoundary(props: Parameters<FallbackRender>[0]) {
  const { showNewMessage } = useIntercom();
  const error = props.error;

  return (
    <Flex
      vertical
      css={{
        height: tokenCssVars.fullHeight,
        backgroundColor: tokenCssVars.colorBgContainer,
      }}
    >
      <ErrorHeader />
      <ErrorContainer>
        <ErrorMessage error={error} eventId={props.eventId} />
        <Flex gap={8}>
          <Button
            type="default"
            onClick={() => {
              const errorMessage =
                (error instanceof Error && error.message) || 'Unknown error has occurred';
              showNewMessage(formatErrorDetails(props.eventId, errorMessage));
            }}
          >
            Report error
          </Button>
          <Button type="primary" href="/">
            Back home
          </Button>
        </Flex>
      </ErrorContainer>
    </Flex>
  );
}

// Component-level error boundary
export function ComponentErrorBoundary(props: Parameters<FallbackRender>[0]) {
  const { showNewMessage } = useIntercom();
  const { token } = theme.useToken();
  const error = props.error;

  return (
    <Flex
      vertical
      gap={token.marginMD}
      align="center"
      css={{
        padding: token.paddingLG,
        backgroundColor: tokenCssVars.colorBgContainer,
      }}
    >
      <ErrorMessage error={props.error} eventId={props.eventId} variant="small" />
      <Flex gap={8} vertical>
        <Button
          type="default"
          onClick={() => {
            const errorMessage =
              (error instanceof Error && error.message) || 'Unknown error has occurred';
            showNewMessage(formatErrorDetails(props.eventId, errorMessage));
          }}
        >
          Report error
        </Button>
        <Button
          type="primary"
          onClick={() => {
            props.resetError();
          }}
        >
          Reload
        </Button>
      </Flex>
    </Flex>
  );
}

// Helper function to format error details
function formatErrorDetails(eventId: string, errorMessage: string) {
  const errorDetails = `Error ID: ${eventId}`;
  const message = `Error message: ${errorMessage}`;
  const separator = '==============================';
  const question = 'What happened?';

  return `${errorDetails}\n\n${message}\n\n${separator}\n${question}\n`;
}
