import React from 'react';
import ReactDOM from 'react-dom/client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from './api/client';
import { RouterProvider } from '@tanstack/react-router';
import { ApiProvider } from './app/ApiContext';
import { createApiClient } from './api';
import { router } from './app/router';
import { keys } from './app/queries';
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

const api = createApiClient();

// Signed out elsewhere (another device, an admin) or the session expired: drop everything the
// signed-in user saw and send them to the login, instead of a half signed-in app.
api.onSessionEnded(() => {
  queryClient.clear();
  queryClient.setQueryData(keys.me, null);
  const { pathname, href } = router.state.location;
  if (pathname !== '/login' && pathname !== '/auth/callback') {
    void router.navigate({ to: '/login', search: { redirect: href }, replace: true });
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApiProvider client={api}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ApiProvider>
  </React.StrictMode>,
);
