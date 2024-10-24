import 'dotenv/config';
import { z } from 'zod';
import { generateErrorMessage } from 'zod-error';

export function getConfig<T extends z.ZodRawShape>(envSchema: T): z.infer<z.ZodObject<T>> {
  const result = z.object(envSchema).safeParse(process.env);

  if (result.success) return result.data;

  console.error('❌ Invalid environment variables, check the errors below!');
  console.error(
    generateErrorMessage(result.error.issues, {
      delimiter: { error: '\n' },

      transform: ({ errorMessage, index }) => `👉 Error #${index + 1}: ${errorMessage}`,
    }),
  );
  process.exit(-1);
}
