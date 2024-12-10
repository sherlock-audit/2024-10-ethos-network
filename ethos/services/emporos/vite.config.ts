import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import { cjsInterop } from 'vite-plugin-cjs-interop';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://remix.run/docs/en/main/guides/single-fetch#enable-single-fetch-types
// Necessary for v3_singleFetch type interference.
// Can be removed once we upgrade Remix or move to React Router v7 with generated route types.
declare module '@remix-run/server-runtime' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig(({ isSsrBuild }) => ({
  server: {
    port: 8084,
  },
  plugins: [
    // Node polyfills for the coinbase wallet sdk.
    // https://docs.privy.io/guide/troubleshooting/frameworks/vite#process-is-not-defined
    !isSsrBuild &&
      nodePolyfills({
        include: ['buffer', 'util'],
        protocolImports: false,
      }),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    cjsInterop({
      // List of CJS dependencies that require interop
      dependencies: [
        // https://publint.dev/@ant-design/icons@5.5.1
        '@ant-design/icons/lib/components/Icon',
        '@ant-design/icons/lib/components/IconFont',
      ],
    }),
    tsconfigPaths(),
  ],
}));
