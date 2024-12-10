import { PassThrough } from 'node:stream';
import { createCache, extractStyle } from '@ant-design/cssinjs';
import { createReadableStreamFromReadable, type EntryContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import { cookieToInitialState } from 'wagmi';
import { wagmiConfig } from './config/wagmi.ts';
import { ServerProviders } from './providers/providers.server.tsx';
import { getHints } from './theme/client-hints.tsx';
import { getTheme } from './theme/theme.server.ts';
import { ANTD_SSR_STYLE_PLACEHOLDER_TOKEN } from './utils/style.ts';

const ABORT_DELAY = 5_000;

/** Not your typical remix server entrypoint.
 * Because ant design requires a component level css-in-js approach, we need to extract
 * the styles and replace the style placeholder while streaming.
 *
 * https://ant.design/docs/blog/extract-ssr
 * https://github.com/ant-design/ant-design/issues/49521
 * Example: https://github.com/Ranger-Theme/ranger-storefront-antd-remix
 */
export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  const callbackName = isbot(request.headers.get('user-agent')) ? 'onAllReady' : 'onShellReady';
  const theme = await getTheme(request);

  return await new Promise((resolve, reject) => {
    let shellRendered = false;
    let isStyleExtracted = false;

    const cache = createCache();
    const hints = getHints(request);
    const wagmiInitialState = cookieToInitialState(wagmiConfig, request.headers.get('cookie'));

    const { pipe, abort } = renderToPipeableStream(
      <ServerProviders
        styleCache={cache}
        theme={theme ?? hints.theme}
        wagmiInitialState={wagmiInitialState}
      >
        <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />
      </ServerProviders>,
      {
        [callbackName]: () => {
          shellRendered = true;
          const body = new PassThrough({
            transform(chunk, _, callback) {
              if (!isStyleExtracted) {
                const str: string = chunk.toString();
                const styleText = extractStyle(cache);

                if (str.includes(ANTD_SSR_STYLE_PLACEHOLDER_TOKEN)) {
                  chunk = str.replace(ANTD_SSR_STYLE_PLACEHOLDER_TOKEN, styleText);

                  isStyleExtracted = true;
                }
              }

              callback(null, chunk);
            },
          });
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;

          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
