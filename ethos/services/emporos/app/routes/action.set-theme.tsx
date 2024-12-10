import { redirect, type ActionFunction } from '@remix-run/node';
import { setTheme } from '~/theme/theme.server.ts';
import { isThemeValid } from '~/theme/utils.ts';

// eslint-disable-next-line func-style
export const action: ActionFunction = async ({ request }) => {
  const referrer = request.headers.get('Referer') ?? new URL(request.url).origin;
  const formData = await request.formData();
  const theme = formData.get('theme');

  if (!isThemeValid(theme)) {
    return {
      success: false,
      message: `theme value of ${theme?.toString()} is not a valid theme`,
    };
  }

  const url = new URL(referrer);
  // Salt the URL for cache-busting.
  url.searchParams.set('theme_ts', Date.now().toString());

  return redirect(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': await setTheme(theme),
    },
  });
};
