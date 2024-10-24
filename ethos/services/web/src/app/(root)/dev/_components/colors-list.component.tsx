'use client';
import { css } from '@emotion/react';
import { Button, Flex, Input, theme, Tooltip } from 'antd';
import { useMemo, useState } from 'react';
import { BasicPageWrapper } from 'components/basic-page-wrapper/basic-page-wrapper.component';
import { useCopyToClipboard } from 'utils/clipboard';

export function ColorsList() {
  const copyToClipboard = useCopyToClipboard();
  const { token } = theme.useToken();

  const themeColors = useMemo(() => {
    return Object.entries(token)
      .filter(([key]) => key.includes('color'))
      .reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key] = value;

        return acc;
      }, {});
  }, [token]);

  const [search, setSearch] = useState('');

  const filteredThemeColors = useMemo(() => {
    return Object.entries(themeColors)
      .filter(([colorName]) => colorName.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [search, themeColors]);

  return (
    <BasicPageWrapper title="Theme Colors">
      <Input
        placeholder="Search colors"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
        }}
      />
      <Flex
        wrap
        gap={4}
        css={css`
          margin-top: 20px;
        `}
      >
        {filteredThemeColors.map(([colorName, colorValue]) => (
          <Tooltip title={colorName} key={colorName}>
            <Button
              onClick={() => {
                copyToClipboard(colorValue, `${colorName} copied`);
              }}
              css={css`
                width: 100px;
                height: 100px;
                background-color: ${colorValue};
              `}
            >
              &nbsp;
            </Button>
          </Tooltip>
        ))}
      </Flex>
    </BasicPageWrapper>
  );
}
