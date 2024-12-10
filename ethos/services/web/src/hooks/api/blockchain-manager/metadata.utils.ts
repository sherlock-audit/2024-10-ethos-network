import { JsonHelper } from '@ethos/helpers';
import { z } from 'zod';

const reviewMetadataSchema = {
  description: z.string().optional(),
  source: z.string().optional(),
};

const vouchMetadataSchema = {
  description: z.string().optional(),
  source: z.string().optional(),
};

export type ReviewMetadata = z.infer<z.ZodObject<typeof reviewMetadataSchema>>;
export type VouchMetadata = z.infer<z.ZodObject<typeof vouchMetadataSchema>>;

export function parseReviewMetadata(rawMetadata?: string): ReviewMetadata {
  const data = JsonHelper.parseSafe<ReviewMetadata>(rawMetadata ?? null, {
    zodSchema: reviewMetadataSchema,
  });

  return data ?? {};
}

export function parseVouchMetadata(rawMetadata?: string): VouchMetadata {
  const data = JsonHelper.parseSafe<VouchMetadata>(rawMetadata ?? null, {
    zodSchema: vouchMetadataSchema,
  });

  return data ?? {};
}
