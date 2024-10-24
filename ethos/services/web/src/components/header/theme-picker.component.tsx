import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { css } from '@emotion/react';
import { Button, Tooltip } from 'antd';
import { useThemeMode, useThemeSetter } from '../../contexts/theme-manager.context';
import { tokenCssVars } from 'config';

export function ThemePicker() {
  const mode = useThemeMode();
  const setTheme = useThemeSetter();

  return (
    <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
      <Button
        type="text"
        icon={mode === 'light' ? <SunOutlined /> : <MoonOutlined />}
        onClick={() => {
          setTheme(mode === 'light' ? 'dark' : 'light');
        }}
        css={css`
          &:hover {
            ${mode === 'light' && `background-color: ${tokenCssVars.colorBgContainer};`}
          }
        `}
      />
    </Tooltip>
  );
}
