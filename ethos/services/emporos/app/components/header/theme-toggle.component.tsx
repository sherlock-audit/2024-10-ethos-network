import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useFetcher } from '@remix-run/react';
import { Button, Tooltip } from 'antd';
import { useCallback } from 'react';
import { useTheme } from '~/theme/utils.ts';

export function ThemeToggle() {
  const fetcher = useFetcher();
  const currentTheme = useTheme();

  const nextTheme = currentTheme === 'light' ? 'dark' : 'light';

  return (
    <fetcher.Form method="post" action="/action/set-theme" className="flex items-center">
      <Tooltip title={`Switch to ${nextTheme} mode`}>
        <Button
          type="text"
          htmlType="submit"
          name="theme"
          value={nextTheme}
          icon={currentTheme === 'light' ? <SunOutlined /> : <MoonOutlined />}
        />
      </Tooltip>
    </fetcher.Form>
  );
}

export function useThemeToggle() {
  const fetcher = useFetcher();
  const currentTheme = useTheme();
  const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
  const themeIcon = currentTheme === 'light' ? <SunOutlined /> : <MoonOutlined />;

  const toggleTheme = useCallback(() => {
    fetcher.submit({ theme: nextTheme }, { method: 'post', action: '/action/set-theme' });
  }, [fetcher, nextTheme]);

  return { toggleTheme, currentTheme, nextTheme, themeIcon };
}
