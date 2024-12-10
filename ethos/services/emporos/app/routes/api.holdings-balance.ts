import { isValidAddress } from '@ethos/helpers';
import { type LoaderFunctionArgs } from '@remix-run/node';
import { getHoldingsTotalByAddress } from '~/services.server/echo.ts';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const address = url.searchParams.get('address');

  if (!isValidAddress(address)) {
    return null;
  }

  const holdings = await getHoldingsTotalByAddress(address);

  return holdings;
}
