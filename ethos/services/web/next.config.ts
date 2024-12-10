import { type SentryBuildOptions, withSentryConfig } from '@sentry/nextjs';
import { type NextConfig } from 'next';

const isCI = Boolean(process.env.CI);
const isSentryEnabled = Boolean(
  isCI && process.env.SENTRY_ENABLED && process.env.SENTRY_AUTH_TOKEN,
);

const nextConfig: NextConfig = {
  compiler: {
    emotion: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
      },
      {
        protocol: 'https',
        hostname: 'abs.twimg.com',
      },
    ],
  },
  experimental: {
    turbo: {
      resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    },
  },
  reactStrictMode: true,
  transpilePackages: [
    '@ant-design/icons',
    '@ant-design/icons-svg',
    '@metamask/sdk',
    'antd',
    'rc-pagination',
    'rc-picker',
    'rc-util',
    'react-tweet',
  ],
};

const ethosEnvironment = process.env.NEXT_PUBLIC_ETHOS_ENV ?? 'local';
const release = `ethos-web@${ethosEnvironment}-${process.env.GITHUB_RUN_NUMBER ?? 'local'}`;

if (isSentryEnabled) {
  // eslint-disable-next-line no-console
  console.log('🕵️  Sentry info:', {
    isCI,
    release,
    hasSentryAuthToken: Boolean(process.env.SENTRY_AUTH_TOKEN),
  });
}

const sentryBuildOptions: SentryBuildOptions = {
  // Suppresses source map uploading logs during build
  silent: true,
  org: 'trust-ethos',
  project: 'ethos-web',
  sourcemaps: {
    disable: !isSentryEnabled,
  },
  release: {
    name: release,
    deploy: {
      env: ethosEnvironment,
    },
  },

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
  tunnelRoute: '/monitoring',

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Disable the automatic instrumentation of API route handlers and server-side data fetching functions
  autoInstrumentServerFunctions: false,
};

export default withSentryConfig(nextConfig, sentryBuildOptions);
