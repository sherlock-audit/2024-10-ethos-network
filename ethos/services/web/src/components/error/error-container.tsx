import { Flex } from 'antd';
import { type PropsWithChildren } from 'react';
import { ERROR_HEADER_HEIGHT } from './error-header';

export function ErrorContainer({ children }: PropsWithChildren) {
  return (
    <Flex
      vertical
      align="center"
      justify="center"
      gap={16}
      flex={1}
      css={{
        marginBottom: ERROR_HEADER_HEIGHT, // offset by header height to center content in relation to viewport,
        paddingInline: '32px',
        maxWidth: 720,
        marginInline: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </Flex>
  );
}
