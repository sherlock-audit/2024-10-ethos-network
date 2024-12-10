import { blockExplorerUrlMap } from '@ethos/env';
import { shortenHash, delay } from '@ethos/helpers';
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets';
import { useChainModal } from '@rainbow-me/rainbowkit';
import * as Sentry from '@sentry/nextjs';
import {
  useMutation,
  type DefaultError,
  type QueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { App, Button, Typography } from 'antd';
import { type ContractTransactionResponse } from 'ethers';
import Link from 'next/link';
import { useCallback } from 'react';
import { type SetRequired } from 'type-fest';
import { type Hash } from 'viem';
import { waitForTransactionReceipt } from 'viem/actions';
import { useAccount, useClient } from 'wagmi';
import { parseContractError } from '../../../utils/parse-contract-error';
import { getEnvironment } from 'config/environment';
import { useCurrentUser } from 'contexts/current-user.context';

const { Text } = Typography;

const KEEP_OPEN_DURATION = null;
const SUCCESS_NOTIFICATION_DURATION = 5;
const TX_INIT_KEY = 'init-tx';

function isHash(value: string): value is Hash {
  return value.startsWith('0x') && value.length === 66;
}

/**
 * Wrapper over useMutation that starts a transaction and shows a notification on success or error.
 */
export function useWithTxMutation<
  TData extends ContractTransactionResponse,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
>(
  options: SetRequired<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'>,
  queryClient?: QueryClient,
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { status } = useCurrentUser();
  const { chain } = useAccount();
  const { openChainModal } = useChainModal();
  const { notification } = App.useApp();

  const mutationFn = useCallback<
    NonNullable<UseMutationOptions<TData, TError, TVariables, TContext>['mutationFn']>
  >(
    async (variables) => {
      try {
        if (status === 'connected' && !chain) {
          notification.info({
            message: 'Wrong network detected',
            description: <Button onClick={openChainModal}>Switch Networks</Button>,
            duration: KEEP_OPEN_DURATION,
          });

          throw new Error('Wrong network');
        }

        notification.info({
          message: 'Transaction pending',
          duration: KEEP_OPEN_DURATION,
          key: TX_INIT_KEY,
        });

        const tx = await options.mutationFn(variables);

        // Hide previous notification
        notification.destroy(TX_INIT_KEY);

        const key = `pending-${tx.hash}`;

        const startTime = Date.now();

        const timer = setTimeout(() => {
          notification.info({
            message: 'Transaction pending',
            description: <TransactionLink hash={tx.hash} />,
            duration: KEEP_OPEN_DURATION,
            key,
          });
        }, 500);

        await tx.wait();

        // Cancel showing the pending notification if the transaction is confirmed too fast
        if (Date.now() - startTime < 500) {
          clearTimeout(timer);
          notification.destroy(TX_INIT_KEY);
        } else {
          // Hide previous notification
          notification.destroy(key);
        }

        // Delay showing the success notification to prevent flickering
        await delay(500);

        notification.success({
          message: 'Transaction confirmed',
          description: <TransactionLink hash={tx.hash} />,
          duration: SUCCESS_NOTIFICATION_DURATION,
        });

        return tx;
      } catch (error) {
        // Hide previous notification
        notification.destroy(TX_INIT_KEY);

        await delay(500);

        if (!(error instanceof Error)) {
          notification.error({
            message: 'Transaction failed',
            description: String(error),
            duration: KEEP_OPEN_DURATION,
          });
          Sentry.captureException(error);

          throw error; // Propagate the error to the caller
        }

        const decodedError = await parseContractError(error);

        // Action is cancelled by the user
        if (decodedError === 'ACTION_REJECTED') {
          throw error; // Propagate the error to the caller
        }

        notification.error({
          message: 'Transaction failed',
          description:
            decodedError.name === decodedError.reason ? (
              <span>
                Error code: <Text code>{decodedError.name}</Text>
              </span>
            ) : (
              `${decodedError.name}: ${decodedError.reason}`
            ),
          duration: KEEP_OPEN_DURATION,
        });
        Sentry.captureException(error);

        throw error;
      }
    },
    [options, status, chain, openChainModal, notification],
  );

  return useMutation({ ...options, mutationFn }, queryClient);
}

/**
 * Wrapper over useMutation that starts a transaction and shows a notification on success or error.
 * The same as useWithTxMutation but for viem client.
 */
export function useWithViemTxMutation<
  TData extends Pick<ContractTransactionResponse, 'hash'>,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
>(
  options: SetRequired<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'>,
  queryClient?: QueryClient,
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { status } = useCurrentUser();
  const { chain } = useAccount();
  const { openChainModal } = useChainModal();
  const { notification } = App.useApp();
  const { client } = useSmartWallets();
  const clientWagmi = useClient();

  const mutationFn = useCallback<
    NonNullable<UseMutationOptions<TData, TError, TVariables, TContext>['mutationFn']>
  >(
    // @ts-expect-error TODO: [CORE-1273] fix type error
    async (variables) => {
      try {
        if (status === 'connected' && !chain) {
          notification.info({
            message: 'Wrong network detected',
            description: <Button onClick={openChainModal}>Switch Networks</Button>,
            duration: KEEP_OPEN_DURATION,
          });

          throw new Error('Wrong network');
        }

        if (!client) {
          notification.error({
            message: 'Missing smart wallet',
            duration: KEEP_OPEN_DURATION,
          });

          throw new Error('Missing smart wallet');
        }

        notification.info({
          message: 'Transaction pending',
          duration: KEEP_OPEN_DURATION,
          key: TX_INIT_KEY,
        });

        const tx = await options.mutationFn(variables);

        // Hide previous notification
        notification.destroy(TX_INIT_KEY);

        if (!client || !tx || !isHash(tx.hash)) {
          notification.error({
            message: 'Missing smart wallet',
            duration: KEEP_OPEN_DURATION,
          });

          throw new Error('Missing smart wallet');
        }

        const key = `pending-${tx.hash}`;

        const startTime = Date.now();

        const timer = setTimeout(() => {
          notification.info({
            message: 'Transaction pending',
            description: <TransactionLink hash={tx.hash} />,
            duration: KEEP_OPEN_DURATION,
            key,
          });
        }, 500);

        await waitForTransactionReceipt(clientWagmi, { hash: tx.hash });

        // Cancel showing the pending notification if the transaction is confirmed too fast
        if (Date.now() - startTime < 500) {
          clearTimeout(timer);
          notification.destroy(TX_INIT_KEY);
        } else {
          // Hide previous notification
          notification.destroy(key);
        }

        // Delay showing the success notification to prevent flickering
        await delay(500);

        notification.success({
          message: 'Transaction confirmed',
          description: <TransactionLink hash={tx.hash} />,
          duration: SUCCESS_NOTIFICATION_DURATION,
        });

        return { hash: tx.hash };
      } catch (error) {
        // Hide previous notification
        notification.destroy(TX_INIT_KEY);

        await delay(500);

        if (!(error instanceof Error)) {
          notification.error({
            message: 'Transaction failed',
            description: String(error),
            duration: KEEP_OPEN_DURATION,
          });
          Sentry.captureException(error);

          throw error; // Propagate the error to the caller
        }

        const decodedError = await parseContractError(error);

        // Action is cancelled by the user
        if (decodedError === 'ACTION_REJECTED') {
          throw error; // Propagate the error to the caller
        }

        notification.error({
          message: 'Transaction failed',
          description:
            decodedError.name === decodedError.reason ? (
              <span>
                Error code: <Text code>{decodedError.name}</Text>
              </span>
            ) : (
              `${decodedError.name}: ${decodedError.reason}`
            ),
          duration: KEEP_OPEN_DURATION,
        });
        Sentry.captureException(error);

        throw error;
      }
    },
    [status, chain, client, notification, options, clientWagmi, openChainModal],
  );

  return useMutation({ ...options, mutationFn }, queryClient);
}

function TransactionLink({ hash }: { hash: string }) {
  const environment = getEnvironment();
  const baseScanUrl = blockExplorerUrlMap[environment];

  return (
    <div>
      Transaction:{' '}
      <Link
        href={`${baseScanUrl}/tx/${hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500"
      >
        {shortenHash(hash)}
      </Link>
    </div>
  );
}
