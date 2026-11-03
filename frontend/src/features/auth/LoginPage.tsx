import { useEffect, useRef } from 'react';
import { useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { LogIn } from 'lucide-react';
import { useMe, useSignIn, useSettingsValues } from '@/app/queries';
import { Button, ErrorNote, Panel, Spinner } from '@/components/ui';
import { Crest } from '@/components/Crest';
import { ApiError } from '@/api/client';
import { isDemo } from '@/api';
import { safeRedirect } from '@/lib/redirect';

export function LoginPage() {
  // Validate again here: non-strict useSearch can return the raw query string value.
  const redirect = safeRedirect((useSearch({ strict: false }) as { redirect?: unknown }).redirect);
  return isDemo ? <DemoLogin redirect={redirect} /> : <ClubLogin redirect={redirect} />;
}

/**
 * Goes straight to the club login: there is nothing to fill in here. The page only shows
 * a spinner, or a button when starting the sign-in failed (e.g. the API is unreachable).
 */
function ClubLogin({ redirect }: { redirect: string | null }) {
  const signIn = useSignIn();
  const me = useMe();
  const navigate = useNavigate();
  const router = useRouter();
  const started = useRef(false);
  // A club account without an MVR role would just come back here: show the reason instead.
  const noAccess = me.error instanceof ApiError && me.error.status === 403;

  useEffect(() => {
    if (started.current || me.isPending || noAccess) return;
    started.current = true;
    if (me.data) {
      // Already signed in (e.g. an old link to /login): continue where the user wanted to go.
      if (redirect) router.history.replace(redirect);
      else void navigate({ to: '/', replace: true });
      return;
    }
    signIn.mutate({ returnTo: redirect ?? undefined });
  }, [me.isPending, me.data, noAccess, redirect, signIn, router, navigate]);

  if (noAccess) {
    return (
      <div className="mx-auto mt-6 max-w-sm">
        <Panel className="grid gap-4 p-5">
          <ErrorNote error={me.error} />
        </Panel>
      </div>
    );
  }

  if (signIn.error) {
    return (
      <div className="mx-auto mt-6 max-w-sm">
        <Panel className="grid gap-4 p-5">
          <ErrorNote error={signIn.error} />
          <Button variant="primary" disabled={signIn.isPending} onClick={() => signIn.mutate({ returnTo: redirect ?? undefined })}>
            <LogIn className="h-4 w-4" /> Zkusit znovu
          </Button>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mt-16 flex flex-col items-center gap-3 text-muted">
      <Spinner />
      Přesměrovávám na přihlášení klubovým účtem…
    </div>
  );
}

function DemoLogin({ redirect }: { redirect: string | null }) {
  const signIn = useSignIn();
  const { clubName } = useSettingsValues();
  const navigate = useNavigate();
  const router = useRouter();

  const afterLogin = () => (redirect ? router.history.replace(redirect) : navigate({ to: '/' }));
  const signInAs = (demoEmail: string) => signIn.mutate({ demoEmail }, { onSuccess: afterLogin });

  return (
    <div className="mx-auto mt-6 max-w-sm">
      <div className="flex flex-col items-center text-center">
        <Crest className="h-24 w-20" />
        <h1 className="mt-3 font-display text-3xl font-semibold">Přihlášení</h1>
        <p className="mt-1 text-muted">
          {redirect ? 'Pro zobrazení této situace se přihlaste.' : `Pro hráče a trenéry ${clubName}.`}
        </p>
      </div>
      <div className="mt-6 grid gap-2">
        <p className="text-center text-sm text-muted">Ukázkové účty</p>
        <Button onClick={() => signInAs('trener@banik.cz')}>Přihlásit jako trenér</Button>
        <Button onClick={() => signInAs('hrac@banik.cz')}>Přihlásit jako hráč A-týmu</Button>
        <Button onClick={() => signInAs('view@banik.cz')}>Přihlásit jako náhled (vše, jen ke čtení)</Button>
      </div>
      {signIn.error && <div className="mt-4"><ErrorNote error={signIn.error} /></div>}
    </div>
  );
}
