import Script from 'next/script';

type Config = {
  channelId: string;
};

export type Released = {
  initialize: (config?: Config) => void;
};

export function ReleasedScript() {
  return <Script src="https://embed.released.so/1/embed.js" strategy="lazyOnload" />;
}
