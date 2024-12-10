// TODO: uncomment this line once
// https://github.com/ant-design/cssinjs/issues/195 is resolved and remove our
// custom override.
// import { AntdRegistry } from '@ant-design/nextjs-registry';
import '@rainbow-me/rainbowkit/styles.css';
import { type Metadata } from 'next';
import { cookies } from 'next/headers';
import '../styles/global.css';
import { Providers } from './_providers';
import { StatuspageScript } from './_scripts/statuspage.script';
import { fonts } from 'config/fonts';
import { getAppleTouchIconPath, getFaviconPath } from 'config/misc';
import { darkTheme, lightTheme } from 'config/theme';
import { generateRootMetadata } from 'constant/metadata/metadata.generator';
import { AntdRegistry } from 'contexts/antd-registry.context';

const favicon = getFaviconPath();

export const metadata: Metadata = generateRootMetadata();

export default async function RootLayout({ children }: React.PropsWithChildren) {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value;

  return (
    <html lang="en" className={`${fonts.inter.variable} ${fonts.queens.variable}`}>
      <head>
        <link rel="shortcut icon" href={favicon} type="image/svg+xml" />
        <link rel="apple-touch-icon" sizes="57x57" href={getAppleTouchIconPath('57x57')} />
        <link rel="apple-touch-icon" sizes="180x180" href={getAppleTouchIconPath('180x180')} />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </head>
      <body
        // Add bg color to body to prevent flash of white on page load
        // eslint-disable-next-line react/forbid-dom-props
        style={{
          backgroundColor: (theme === 'dark' ? darkTheme : lightTheme).components.Layout.bodyBg,
        }}
      >
        <StatuspageScript />
        <AntdRegistry layer>
          <Providers userTheme={theme}>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
