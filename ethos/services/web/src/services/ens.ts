import { isValidEnsName } from '@ethos/helpers';
import { getDefaultProvider } from 'ethers';

export async function resolveAddressFromEnsName(name: string): Promise<string> {
  if (isValidEnsName(name)) {
    return (await getDefaultProvider().resolveName(name)) ?? name;
  } else {
    return name;
  }
}
