import { getConfig } from '@ethos/config';
import { z } from 'zod';

export const serverConfig = getConfig({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});
