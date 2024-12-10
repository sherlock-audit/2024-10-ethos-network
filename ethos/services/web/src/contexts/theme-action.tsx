'use server';

import { type EthosTheme } from '@ethos/common-ui';
import { cookies } from 'next/headers';

export async function setThemeToCookies(theme: EthosTheme) {
  const cookieStore = await cookies();

  cookieStore.set('theme', theme);
}
