import { TypeChain } from '@ethos/contracts';
import { Interface, isError } from 'ethers';
import { ErrorDecoder } from 'ethers-decode-error';

const errorDecoder = ErrorDecoder.create(
  Object.values(TypeChain.factories).map((factory) => new Interface(factory.abi)),
);

export async function parseContractError(err: Error) {
  if (isError(err, 'ACTION_REJECTED')) {
    return 'ACTION_REJECTED';
  }

  const decoded = await errorDecoder.decode(err);

  console.error('Transaction reverted:', decoded ?? err);

  return decoded;
}
