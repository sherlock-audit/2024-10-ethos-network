import { getApi } from '@ethos/echo-client';
import { useMutation } from '@tanstack/react-query';

const webApi = getApi();

export function useCreatePrivyLogin({ onError }: { onError?: () => void } = {}) {
  return useMutation({
    mutationFn: async () => {
      await webApi('/api/privy-logins', { method: 'POST' });
    },
    onError,
  });
}
