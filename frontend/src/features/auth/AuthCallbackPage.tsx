import { useEffect, useRef, useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/app/ApiContext';
import { keys } from '@/app/queries';
import { ApiError } from '@/api/client';
import { Button, ErrorNote, Panel, Spinner } from '@/components/ui';
import { safeRedirect } from '@/lib/redirect';

/** Landing page after the club login: exchanges the code for tokens and records the sign-in. */
export function AuthCallbackPage() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>(null);
  // The authorization code can be redeemed only once; StrictMode runs effects twice in development.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api.completeSignIn().then(
      ({ user, returnTo }) => {
        qc.setQueryData(keys.me, user);
        void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
        const target = safeRedirect(returnTo);
        if (target) router.history.replace(target);
        else void navigate({ to: '/', replace: true });
      },
      (e: unknown) => {
        setError(e);
        void qc.invalidateQueries({ queryKey: keys.me });
      },
    );
  }, [api, qc, router, navigate]);

  if (!error) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 text-muted">
        <Spinner />
        Dokončuji přihlášení…
      </div>
    );
  }

  const noAccess = error instanceof ApiError && error.status === 403;
  return (
    <div className="mx-auto mt-6 max-w-md">
      <Panel className="grid gap-4 p-5">
        <h1 className="font-display text-2xl font-semibold">{noAccess ? 'Bez přístupu' : 'Přihlášení se nepovedlo'}</h1>
        <ErrorNote error={error} />
        <div className="flex flex-wrap gap-2">
          {noAccess ? (
            <Button onClick={() => void api.logout()}>Odhlásit se a přihlásit jiným účtem</Button>
          ) : (
            <Button variant="primary" onClick={() => void api.signIn({})}>Zkusit znovu</Button>
          )}
          <Button variant="ghost" onClick={() => void navigate({ to: '/' })}>Zpět na zápasy</Button>
        </div>
      </Panel>
    </div>
  );
}
