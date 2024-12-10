import { BulbOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { Typography, Col, Row, Card, theme, Flex, Badge } from 'antd';

const { useToken } = theme;

type Tip = {
  title: string;
  description: string;
  isHighImpact?: boolean;
  icon?: React.ReactNode;
};

type ScoreTipsProps = {
  tips: Tip[];
};

export function ScoreTips({ tips }: ScoreTipsProps) {
  const { token } = useToken();

  return (
    <Row gutter={[token.margin, token.margin]}>
      {tips.map((tip, index) => (
        <Col key={index} xs={24} sm={12} md={12} lg={8} xl={8}>
          {tip.isHighImpact ? (
            <Badge.Ribbon
              text="High impact"
              color={token.colorPrimary}
              css={css`
                .ant-ribbon-text {
                  font-size: 12px;
                }
              `}
            >
              <TipCard tip={tip} token={token} />
            </Badge.Ribbon>
          ) : (
            <TipCard tip={tip} token={token} />
          )}
        </Col>
      ))}
    </Row>
  );
}

function TipCard({ tip, token }: { tip: Tip; token: any }) {
  return (
    <Card>
      <Row align="top">
        <Col xs={1} sm={2} md={2} lg={2} xl={2}>
          {tip.icon ?? <BulbOutlined css={{ color: token.colorPrimary }} />}
        </Col>
        <Col xs={23} sm={22} md={22} lg={22} xl={22}>
          <Flex vertical gap={4}>
            <Typography.Title level={5}>{tip.title}</Typography.Title>
            <Typography.Text>{tip.description}</Typography.Text>
          </Flex>
        </Col>
      </Row>
    </Card>
  );
}
