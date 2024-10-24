import { type MetadataRoute } from 'next';
import { getEnvironment } from 'config';

export default function robots(): MetadataRoute.Robots {
  const env = getEnvironment();

  return {
    rules: [
      env === 'testnet'
        ? { userAgent: '*', allow: '/' }
        : {
            userAgent: '*',
            disallow: '/',
          },
      {
        userAgent: 'Twitterbot',
        allow: '/',
      },
    ],
  };
}
