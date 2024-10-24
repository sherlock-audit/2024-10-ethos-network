import { fromUserKey } from '@ethos/domain';
import { isValidAddress } from '@ethos/helpers';
import { type Address } from 'viem';
import { z } from 'zod';

/**
 * An ECDSA signature comprises two 32-byte integers (r, s) and an extra byte
 * for recovery (v), totaling 65 bytes. In hexadecimal string format, each byte
 * is represented by two characters. Hence, a 65-byte Ethereum signature will be
 * 130 characters long. Including the 0x prefix commonly used with signatures,
 * the total character count for such a signature would be 132.
 */
const ETHEREUM_ECDSA_SIGNATURE_LENGTH = 132;

const ETHEREUM_TRANSACTION_HASH_LENGTH = 66;

const DEFAULT_MAX_PAGINATION_LIMIT = 50;

export const validators = {
  address: z.custom<Address>((v) => typeof v === 'string' && isValidAddress(v), {
    message: 'Invalid address',
  }),
  ecdsaSignature: z.string().length(ETHEREUM_ECDSA_SIGNATURE_LENGTH).startsWith('0x'),
  transactionHash: z.string().length(ETHEREUM_TRANSACTION_HASH_LENGTH).startsWith('0x'),
  paginationSchema({ maxLimit }: { maxLimit?: number } = {}) {
    return z.object({
      pagination: z
        .object({
          limit: z
            .number()
            .max(maxLimit ?? DEFAULT_MAX_PAGINATION_LIMIT)
            .optional()
            .default(50),
          offset: z.number().optional().default(0),
        })
        .optional()
        .default({ limit: 50, offset: 0 }),
    });
  },
  ethosUserKey(allowTwitterUsername = false) {
    return z.string().refine(
      (value) => {
        try {
          allowTwitterUsername ? fromUserKey(value, allowTwitterUsername) : fromUserKey(value);

          return true;
        } catch (error) {
          return false;
        }
      },
      {
        message: 'Invalid Ethos target user',
      },
    );
  },
};
