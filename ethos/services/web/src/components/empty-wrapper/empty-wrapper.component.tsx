import { css } from '@emotion/react';
import { Col, Empty, Flex, Row } from 'antd';
import { type ReactNode } from 'react';
import { useThemeMode } from 'contexts/theme-manager.context';

export function EmptyWrapper({
  children,
  isEmpty = false,
  description = 'No data',
}: React.PropsWithChildren<{ isEmpty: boolean; description?: string }>): ReactNode {
  const mode = useThemeMode();
  const imageURL = `/assets/images/illustrations/no_data${mode === 'dark' ? '_dark' : ''}.png`;

  if (isEmpty || !children || (Array.isArray(children) && children?.length === 0)) {
    return (
      <Row>
        <Col span={24}>
          <Flex
            justify="center"
            align="center"
            css={css`
              height: 100%;
            `}
          >
            <Empty
              image={imageURL}
              description={description}
              imageStyle={{
                height: 63,
              }}
            />
          </Flex>
        </Col>
      </Row>
    );
  }

  return children;
}
