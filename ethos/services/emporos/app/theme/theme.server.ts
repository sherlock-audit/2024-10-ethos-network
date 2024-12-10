import { createCookie } from '@remix-run/node';
import { isThemeValid } from './utils.ts';

const themeCookie = createCookie('theme', {
  path: '/',
});

type Theme = 'light' | 'dark' | undefined;

// Returns the cookie value set by server
export async function getTheme(request: Request): Promise<Theme> {
  const cookieHeader = await themeCookie.parse(request.headers.get('Cookie'));

  if (isThemeValid(cookieHeader)) return cookieHeader;

  return undefined;
}

// Cookie value set by the server
export async function setTheme(theme?: Theme) {
  if (theme) {
    return await themeCookie.serialize(theme);
  } else {
    return await themeCookie.serialize('', { maxAge: 0 });
  }
}
