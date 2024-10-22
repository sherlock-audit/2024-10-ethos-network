'use server';

import { cookies } from 'next/headers';
import { type Theme } from 'config';

export async function setThemeToCookies(theme: Theme) {
  cookies().set('theme', theme);
}
