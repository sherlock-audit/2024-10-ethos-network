import { useSearchParams } from 'next/navigation';
import { z } from 'zod';

const searchParamsSchema = z.object({
  modal: z.union([z.enum(['review', 'vouch']), z.undefined()]),
});

export type ProfilePageOptions = z.infer<typeof searchParamsSchema>;

export function useProfilePageOptions(): ProfilePageOptions {
  const searchParams = useSearchParams();
  const parsedParams = searchParamsSchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (parsedParams.success) {
    return parsedParams.data;
  } else {
    // If parsing fails, return default values
    return { modal: undefined };
  }
}

export function profileRouteWithOptions(url: string, options: ProfilePageOptions) {
  const searchParams = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, value);
    }
  });

  const queryString = searchParams.toString();

  return queryString ? `${url}?${queryString}` : url;
}
