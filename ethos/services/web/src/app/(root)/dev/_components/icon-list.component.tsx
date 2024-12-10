'use client';
import { useCopyToClipboard } from '@ethos/common-ui';
import { Button, Col, Flex, Input, Row, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { BasicPageWrapper } from 'components/basic-page-wrapper/basic-page-wrapper.component';
import * as icons from 'components/icons';

export function IconList() {
  const copyToClipboard = useCopyToClipboard();
  const [search, setSearch] = useState('');

  const filteredIcons = useMemo(() => {
    return Object.entries(icons)
      .filter(([iconName]) => iconName.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [search]);

  return (
    <BasicPageWrapper title={`Icons in "components/icons"`}>
      <Input
        placeholder="Search icons"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
        }}
      />
      <Row css={{ marginTop: 50 }} gutter={[32, 32]}>
        {filteredIcons.map(([iconName, Icon]) => (
          <Col key={iconName} lg={4} md={6} sm={8} xs={12}>
            <Flex vertical align="center" gap={16}>
              <Button
                onClick={() => {
                  copyToClipboard(iconName, `${iconName} copied`);
                }}
                size="large"
                icon={<Icon />}
              />
              <Typography.Text>{iconName}</Typography.Text>
            </Flex>
          </Col>
        ))}
      </Row>
    </BasicPageWrapper>
  );
}
