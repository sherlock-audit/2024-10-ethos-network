import { type LoaderFunctionArgs, type LinksFunction } from '@remix-run/node';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  type MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
} from '@remix-run/react';
import { Layout as AntLayout } from 'antd';

import { type PropsWithChildren } from 'react';
import { LogoHeaderIcon, LogoHeaderTextIcon } from './components/icons/header-logo.tsx';
import { MobileFooter } from './components/mobile-footer/mobile-footer.tsx';
import { config } from './config/config.server.ts';
import { getAppleTouchIconPath, getFaviconPath } from './config/meta.ts';
import { Providers } from './providers/providers.tsx';
import styles from './tailwind.css?url';
import { ClientHintCheck, getHints } from './theme/client-hints.tsx';
import { getTheme } from './theme/theme.server.ts';
import { useTheme } from './theme/utils.ts';
import theme from './theme.css?url';
import { ANTD_SSR_STYLE_PLACEHOLDER_TOKEN } from './utils/style.ts';
import { AppHeader } from '~/components/header/app-header.component.tsx';

// eslint-disable-next-line func-style
export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'stylesheet', href: styles },
  {
    rel: 'stylesheet',
    precedence: 'high',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap',
  },
  {
    rel: 'stylesheet',
    href: theme,
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'preload',
    as: 'image',
    href: '/assets/layout-background-dark.svg',
  },
  {
    rel: 'manifest',
    href: '/manifest.webmanifest',
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const theme = await getTheme(request);

  return {
    privyAppId: config.EMPOROS_PRIVY_APP_ID,
    environment: config.ETHOS_ENV,
    requestInfo: {
      hints: getHints(request),
      userPrefs: {
        theme,
      },
    },
  };
}

// eslint-disable-next-line func-style
export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const environment = data?.environment;

  if (!environment) return [];

  return [
    {
      tagName: 'link',
      rel: 'apple-touch-icon',
      href: getAppleTouchIconPath(environment, '180x180'),
      sizes: '180x180',
    },
    {
      tagName: 'link',
      rel: 'apple-touch-icon',
      href: getAppleTouchIconPath(environment, '57x57'),
      sizes: '57x57',
    },
    {
      tagName: 'link',
      rel: 'icon',
      type: 'image/svg+xml',
      href: getFaviconPath(environment, 'svg'),
    },
    {
      tagName: 'link',
      rel: 'icon',
      type: 'image/x-icon',
      href: getFaviconPath(environment, 'ico'),
    },
  ];
};

export function Layout({ children }: PropsWithChildren) {
  const theme = useTheme();

  return (
    <html lang="en" className={theme === 'dark' ? 'dark' : ''}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <ClientHintCheck />
        <Meta />
        <Links />
        {/* Placeholder for Ant Design SSR-generated styles */}
        {typeof document === 'undefined' ? ANTD_SSR_STYLE_PLACEHOLDER_TOKEN : null}
      </head>
      <body className="bg-antd-colorBgBase h-full pb-safe">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { privyAppId, environment, requestInfo } = useLoaderData<typeof loader>();
  const theme = requestInfo.userPrefs.theme ?? requestInfo.hints.theme;

  return (
    <Providers environment={environment} privyAppId={privyAppId} theme={theme}>
      <AntLayout className='h-full min-h-dvh bg-[url("/assets/layout-background.svg")] dark:bg-[url("/assets/layout-background-dark.svg")] bg-no-repeat bg-fixed bg-[right_293px]'>
        <AppHeader />
        <AntLayout.Content className="flex justify-center w-full md:w-11/12 lg:w-5/6 xl:w-3/4 md:mx-auto px-4 lg:px-8 mt-8 mb-32">
          <Outlet />
        </AntLayout.Content>
        <MobileFooter />
      </AntLayout>
    </Providers>
  );
}

/**
 * WARNING: Do not use Ant Design elements in our top-level error boundary.
 * Ant components will throw a runtime error if styles cannot be resolved, which results in a render loop, freezing the browser.
 *
 * Q: Why wouldn't styles be resolved?
 * A: In the event of a document mismatch during client hydration, React 18 will throw away the entire document and re-render it client-side.
 *    This potentially throws away the inline styles added by rc-utils, an underlying package that Ant Design uses. When those styles are missing,
 *    Ant Design will throw an error attempting to resolve them, which will trigger a re-render, and the cycle repeats.
 *
 * Q: What's the long-term fix?
 * A: This is a problem the Remix team is expecting to be addressed in React 19. Some developers are using the canary builds.
 *    https://github.com/remix-run/remix/issues/2947#issuecomment-2071160125
 *    A possible React 18 solution could be this: https://github.com/kiliman/remix-hydration-fix?tab=readme-ov-file
 * @returns
 */
export function ErrorBoundary() {
  const error = useRouteError();
  const goBack = (
    <div>
      <a href="/" className="text-antd-colorLink">
        Go Back
      </a>
    </div>
  );

  const errorContent = isRouteErrorResponse(error) ? (
    <div>
      <h1>
        {error.status} {error.statusText}
      </h1>
      <p>{error.data}</p>
      {goBack}
    </div>
  ) : (
    <div>
      <h1>Error</h1>
      <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
      <p>The stack trace is:</p>
      <pre className="text-wrap bg-antd-colorBgBase">
        {error instanceof Error ? error.stack : 'Unknown stack trace'}
      </pre>
      {goBack}
    </div>
  );

  return (
    <div className="text-antd-colorText h-full min-h-dvh bg-[url('/assets/layout-background-dark.svg')] bg-no-repeat bg-fixed bg-[right_293px]">
      <div className="sticky z-10 flex align-middle justify-between my-auto h-16 px-4 md:px-4 lg:px-12 bg-antd-colorBgContainer">
        {/* Purposefully use <a> not <Link> to avoid client-side navigation, which will cause Antd to throw an error given the styles are missing */}
        <a href="/" className="text-antd-colorLink flex items-center gap-4">
          <LogoHeaderIcon />
          <LogoHeaderTextIcon className="hidden md:flex" />
        </a>
      </div>
      <div className="py-8 overflow-none wrap flex justify-center w-full md:w-11/12 lg:w-5/6 xl:w-3/4 md:mx-auto px-4 lg:px-8 mt-8 mb-32 bg-antd-colorBgContainer rounded-lg">
        {errorContent}
      </div>
    </div>
  );
}
