'use client';
import { Button, Flex, Input, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { BasicPageWrapper } from 'components/basic-page-wrapper/basic-page-wrapper.component';
import * as icons from 'components/icons';
import { useCopyToClipboard } from 'utils/clipboard';

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
      <Flex gap={100} wrap css={{ marginTop: 50 }}>
        {filteredIcons.map(([iconName, Icon]) => (
          <Flex key={iconName} vertical gap={10} align="center">
            <Button
              onClick={() => {
                copyToClipboard(iconName, `${iconName} copied`);
              }}
              size="large"
              icon={<Icon />}
            />
            <Typography.Text>{iconName}</Typography.Text>
          </Flex>
        ))}
      </Flex>
    </BasicPageWrapper>
  );
}
