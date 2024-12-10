import { fromUserKey } from '@ethos/domain';
import { isValidAddress } from '@ethos/helpers';
import {
  type Hex,
  type Address,
  parseSignature,
  type ParseErc6492SignatureParameters,
  parseErc6492Signature,
} from 'viem';
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
  profileId: z.coerce.number().positive().int(),
  ecdsaSignature: z.custom<Hex>((v) => {
    if (typeof v !== 'string' || v.length !== ETHEREUM_ECDSA_SIGNATURE_LENGTH) {
      return false;
    }

    try {
      parseSignature(v as Hex);

      return true;
    } catch {
      return false;
    }
  }, 'Invalid ECDSA signature'),
  erc6492Signature: z.custom<ParseErc6492SignatureParameters>((v) => {
    if (typeof v !== 'string') {
      return false;
    }

    try {
      parseErc6492Signature(v as ParseErc6492SignatureParameters);

      return true;
    } catch {
      return false;
    }
  }, 'Invalid ERC-6492 signature'),
  transactionHash: z.string().length(ETHEREUM_TRANSACTION_HASH_LENGTH).startsWith('0x'),
  paginationSchema({ maxLimit }: { maxLimit?: number } = {}) {
    return z.object({
      pagination: z
        .object({
          limit: z.coerce
            .number()
            .int()
            .max(maxLimit ?? DEFAULT_MAX_PAGINATION_LIMIT)
            .optional()
            .default(50),
          offset: z.coerce.number().optional().default(0),
        })
        .optional()
        .default({ limit: 50, offset: 0 }),
    });
  },
  batchPaginationSchema<T extends readonly [string, ...string[]]>(
    keys: T,
    { maxLimit }: { maxLimit?: number } = {},
  ) {
    return z.object({
      limit: z
        .number()
        .int()
        .max(maxLimit ?? DEFAULT_MAX_PAGINATION_LIMIT)
        .default(50),
      offsets: z.record(z.enum(keys), z.number()).optional(),
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
