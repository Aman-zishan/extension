import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

import { PERSISTENCE_CACHE_TIME } from '@leather-wallet/constants';

import { IS_TEST_ENV } from '@shared/environment';
import { analytics } from '@shared/utils/analytics';

const storage = {
  getItem: async (key: string) => {
    const storageVal = await chrome.storage.local.get(key);
    return storageVal[key];
  },
  setItem: (key: string, value: string) => chrome.storage.local.set({ [key]: value }),
  removeItem: (key: string) => chrome.storage.local.remove([key]),
};

const chromeStorageLocalPersister = createAsyncStoragePersister({ storage });

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    async onError(_error, query) {
      const queryKey = query.queryKey[0] ?? '';
      void analytics.track('query_error', { queryKey });
    },
  }),
  mutationCache: new MutationCache({
    async onError(_error, _variables, _context, mutation) {
      const mutationPrefix = mutation?.options.mutationKey?.[0] ?? '';
      void analytics.track('mutation_error', { mutationPrefix });
    },
  }),
  defaultOptions: {
    queries: {
      cacheTime: PERSISTENCE_CACHE_TIME,
      // https://tanstack.com/query/v4/docs/guides/testing#turn-off-retries
      retry: IS_TEST_ENV ? false : 3,
    },
  },
});

export async function persistAndRenderApp(renderApp: () => void) {
  if (!IS_TEST_ENV)
    void persistQueryClient({
      queryClient,
      persister: chromeStorageLocalPersister,
      buster: VERSION,
    });
  renderApp();
}
