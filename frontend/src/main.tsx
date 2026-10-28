import React from 'react';
import ReactDOM from 'react-dom/client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from './api/client';
import { RouterProvider } from '@tanstack/react-router';
import { ApiProvider } from './app/ApiContext';
import { createApiClient } from './api';
import { router } from './app/router';
import './index.css';

// Any 503 from the API means maintenance mode was switched on: refresh settings so the app shows it.
const onError = (error: unknown) => {
  if (error instanceof ApiError && error.status === 503) void queryClient.invalidateQueries({ queryKey: ['settings', 'public'] });
};
const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApiProvider client={createApiClient()}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ApiProvider>
  </React.StrictMode>,
);
