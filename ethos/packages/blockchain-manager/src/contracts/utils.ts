import { isAddressEqualSafe, type UnionOptional } from '@ethos/helpers';
import retry, { type Options } from 'async-retry';
import {
  type ContractRunner,
  type Eip1193Provider,
  type JsonRpcApiProvider,
  type Provider,
  type Signer,
  BrowserProvider,
  JsonRpcProvider,
  Wallet,
  getBytes,
  parseUnits,
  solidityPackedKeccak256,
  getDefaultProvider,
  type AbstractProvider,
  type BaseContract,
  type Log,
  type FetchRequest,
  type Networkish,
  type JsonRpcApiProviderOptions,
  type ContractEventName,
  type Listener,
  ethers,
} from 'ethers';
import { formatUnits, getAddress, zeroAddress, type Address } from 'viem';
import { isAlchemyRateLimitError } from '../providers';
import { type CancelListener } from '../types';
import { ESCROW_TOKEN_ADDRESS, WETH9_TESTNET, WETH9_MAINNET } from './constants';

const RATE_LIMIT_RETRIES = 5;

declare global {
  // eslint-disable-next-line no-var
  var ethereum: Eip1193Provider;
  // eslint-disable-next-line no-var
  var window: Window & typeof globalThis;
}

type Param = ['address', Address] | ['string', string] | ['uint256', number];

type AlchemyRunnerConfig = {
  alchemyConnectionURL?: string;
  walletPrivateKey?: string;
  polling?: boolean;
};

type ExplicitProviderConfig = {
  provider?: AbstractProvider;
  signer?: Signer;
};

export type ContractRunnerConfig = AlchemyRunnerConfig | ExplicitProviderConfig;

export function getContractRunner({
  alchemyConnectionURL,
  provider: providerOverride,
  signer,
  walletPrivateKey,
  polling,
}: UnionOptional<ContractRunnerConfig> = {}): ContractRunner {
  const isBrowser = Boolean(globalThis.window);
  let provider: AbstractProvider | undefined;

  try {
    if (providerOverride) {
      provider = providerOverride;
    } else if (isBrowser && globalThis.ethereum) {
      provider = new BrowserProvider(globalThis.ethereum);
    } else if (alchemyConnectionURL) {
      provider = new JsonRpcApiProviderWithRetry({ retries: 5 }, alchemyConnectionURL, undefined, {
        polling,
      });
    }
  } catch (err) {
    console.error('Error creating contract runner', {
      err,
      isBrowser,
      hasBrowserProvider: Boolean(globalThis.ethereum),
    });
  } finally {
    if (!provider) {
      // TODO: find a better fallback like loading only from a server cache w/out any blockchain support
      provider = getDefaultProvider();
    }
  }

  if (walletPrivateKey) {
    return new Wallet(walletPrivateKey, provider);
  }

  return new AsyncContractRunner(provider, signer);
}

class AsyncContractRunner implements ContractRunner {
  private _signer?: Signer;
  public provider: Provider;

  constructor(underlying: AbstractProvider, signer?: Signer) {
    this.provider = underlying;

    if (signer) {
      this._signer = signer;
    }
  }

  protected async signer(): Promise<Signer> {
    if (!this._signer) {
      const signer = await (this.provider as JsonRpcApiProvider).getSigner();
      this._signer = signer;
    }

    return this._signer;
  }

  async sendTransaction(
    ...args: Parameters<Signer['sendTransaction']>
  ): ReturnType<Signer['sendTransaction']> {
    const signer = await this.signer();

    return await signer.sendTransaction(...args);
  }
}

class JsonRpcApiProviderWithRetry extends JsonRpcProvider {
  retryOptions: Options;

  constructor(
    retryOptions: Options,
    url?: string | FetchRequest,
    network?: Networkish,
    options?: JsonRpcApiProviderOptions,
  ) {
    super(url, network, options);
    this.retryOptions = retryOptions;
  }

  override async send(
    ...args: Parameters<JsonRpcProvider['send']>
  ): ReturnType<JsonRpcProvider['send']> {
    return await retry(async (bail) => {
      return await super.send(...args).catch((err: any) => {
        if (err.error?.code !== 429) {
          bail(err as Error);

          return;
        }

        throw err;
      });
    }, this.retryOptions);
  }
}

export function formatMessageToSign(parameters: Param[]): Uint8Array {
  const messageHash = solidityPackedKeccak256(
    parameters.map(([type]) => type),
    parameters.map(([, value]) => value),
  );

  return getBytes(messageHash);
}

export function parseTokenAmount(value: string, tokenAddress: Address): bigint {
  switch (tokenAddress) {
    // Native token which is ETH
    case zeroAddress:
      return parseUnits(value, 18);
    case ESCROW_TOKEN_ADDRESS:
      return parseUnits(value, 18);
    default:
      throw new Error('Unsupported payment token');
  }
}

export function formatTokenAmount(value: bigint, tokenAddress: Address): string {
  switch (tokenAddress) {
    // Native token which is ETH
    case zeroAddress:
      return formatUnits(value, 18);
    case ESCROW_TOKEN_ADDRESS:
      return formatUnits(value, 18);
    default:
      throw new Error('Unsupported payment token');
  }
}

type EthosBaseContract = {
  address: Address;
  contractRunner: ContractRunner;
  contract: BaseContract;
};

export async function getLogs(
  ethosContract: EthosBaseContract,
  fromBlock: number,
  toBlock?: number,
): Promise<Log[]> {
  if (ethosContract.contractRunner.provider === null) {
    throw Error('contractRunner.provider cannot be null');
  }
  let lastError: unknown;

  for (let attempt = 0; attempt < RATE_LIMIT_RETRIES; attempt++) {
    try {
      const events = await ethosContract.contractRunner.provider.getLogs({
        fromBlock,
        toBlock,
        address: ethosContract.address,
      });

      return events;
    } catch (err) {
      lastError = err;

      if (isAlchemyRateLimitError(err)) {
        // rate limit is per second, so sleep for 1.5
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

const signatures = {
  WETH9: {
    deposit: ethers.id('Deposit(address,uint256)'),
    withdraw: ethers.id('Withdrawal(address,uint256)'),
  },
};

/*
Specifically decode WETH9 interactions, indicating withdrawals and deposits.
*/
export function decodeWETH9Log(log: Log): { deposit?: bigint; withdraw?: bigint } {
  const address = getAddress(log.address);
  const logSignature = log.topics[0];

  // Check if this is a WETH9 transfer event for either testnet or mainnet
  if (isAddressEqualSafe(address, WETH9_TESTNET) || isAddressEqualSafe(address, WETH9_MAINNET)) {
    if (logSignature === signatures.WETH9.deposit) {
      const [deposit] = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], log.data);

      return { deposit };
    } else if (logSignature === signatures.WETH9.withdraw) {
      const [withdraw] = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], log.data);

      return { withdraw };
    }
  }

  return {};
}

/**
 * Registers event listeners for specified events on a contract.
 *
 * @param contract - The BaseContract instance to register listeners on.
 * @param events - An array of TypedContractEvent objects representing the events to listen for.
 * @param callback - A function to be called when any of the specified events are emitted.
 * @returns A function that, when called, will remove all registered listeners.
 */
export async function registerListener(
  contract: BaseContract,
  events: ContractEventName[],
  callback: Listener,
): Promise<CancelListener> {
  // Add listeners for each event
  await Promise.all(events.map(async (event) => await contract.addListener(event, callback)));

  // Return a function that removes all registered listeners
  return async (): Promise<void> => {
    await Promise.all(events.map(async (event) => await contract.removeListener(event, callback)));
  };
}
