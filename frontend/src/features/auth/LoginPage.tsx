import { useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { LogIn } from 'lucide-react';
import { useSignIn, useSettingsValues } from '@/app/queries';
import { Button, ErrorNote, Panel } from '@/components/ui';
import { Crest } from '@/components/Crest';
import { isDemo } from '@/api';
import { safeRedirect } from '@/lib/redirect';

export function LoginPage() {
  const signIn = useSignIn();
  const { clubName } = useSettingsValues();
  const navigate = useNavigate();
  const router = useRouter();
  // Validate again here: non-strict useSearch can return the raw query string value.
  const redirect = safeRedirect((useSearch({ strict: false }) as { redirect?: unknown }).redirect);

  // Demo only: the HTTP client leaves the page for the club login and comes back via /auth/callback.
  const afterDemoLogin = () => (redirect ? router.history.replace(redirect) : navigate({ to: '/' }));
  const signInAsDemo = (demoEmail: string) => signIn.mutate({ demoEmail }, { onSuccess: afterDemoLogin });

  return (
    <div className="mx-auto mt-6 max-w-sm">
      <div className="flex flex-col items-center text-center">
        <Crest className="h-24 w-20" />
        <h1 className="mt-3 font-display text-3xl font-semibold">Přihlášení</h1>
        <p className="mt-1 text-muted">
          {redirect ? 'Pro zobrazení této situace se přihlaste.' : `Pro hráče a trenéry ${clubName}.`}
        </p>
      </div>
      {isDemo ? (
        <div className="mt-6 grid gap-2">
          <p className="text-center text-sm text-muted">Ukázkové účty</p>
          <Button onClick={() => signInAsDemo('trener@banik.cz')}>Přihlásit jako trenér</Button>
          <Button onClick={() => signInAsDemo('hrac@banik.cz')}>Přihlásit jako hráč A-týmu</Button>
          <Button onClick={() => signInAsDemo('view@banik.cz')}>Přihlásit jako náhled (vše, jen ke čtení)</Button>
        </div>
      ) : (
        <Panel className="mt-6 grid gap-4 p-5">
          <p className="text-sm text-muted">
            Přihlašujete se jedním klubovým účtem pro všechny klubové aplikace. Účet vám založí trenér.
          </p>
          {signIn.error && <ErrorNote error={signIn.error} />}
          <Button variant="primary" disabled={signIn.isPending} onClick={() => signIn.mutate({ returnTo: redirect ?? undefined })}>
            <LogIn className="h-4 w-4" /> Přihlásit se klubovým účtem
          </Button>
        </Panel>
      )}
      {isDemo && signIn.error && <div className="mt-4"><ErrorNote error={signIn.error} /></div>}
    </div>
  );
}
