import { useState } from 'react';
import { useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { useLogin } from '@/app/queries';
import { Button, ErrorNote, Field, Input, Panel } from '@/components/ui';
import { Crest } from '@/components/Crest';
import { isDemo } from '@/api';
import { safeRedirect } from '@/lib/redirect';

export function LoginPage() {
  const login = useLogin();
  const navigate = useNavigate();
  const router = useRouter();
  // Validate again here: non-strict useSearch can return the raw query string value.
  const redirect = safeRedirect((useSearch({ strict: false }) as { redirect?: unknown }).redirect);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Back to where the user came from (e.g. a shared marker link), validated by the route's loginSearch.
  const afterLogin = () => (redirect ? router.history.replace(redirect) : navigate({ to: '/' }));
  const signIn = (e: string, p: string) => login.mutate({ email: e, password: p }, { onSuccess: afterLogin });

  return (
    <div className="mx-auto mt-6 max-w-sm">
      <div className="flex flex-col items-center text-center">
        <Crest className="h-24 w-20" />
        <h1 className="mt-3 font-display text-3xl font-semibold">Přihlášení</h1>
        <p className="mt-1 text-muted">
          {redirect ? 'Pro zobrazení této situace se přihlaste.' : 'Pro hráče a trenéry SK Baník Libušín.'}
        </p>
      </div>
      <Panel className="mt-6 p-5">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            signIn(email, password);
          }}
        >
          <Field label="E-mail">
            <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Heslo">
            <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {login.error && <ErrorNote error={login.error} />}
          <Button type="submit" variant="primary" disabled={login.isPending}>Přihlásit se</Button>
        </form>
      </Panel>
      {isDemo && (
        <div className="mt-4 grid gap-2">
          <p className="text-center text-sm text-muted">Ukázkové účty</p>
          <Button onClick={() => signIn('trener@banik.cz', 'demo')}>Přihlásit jako trenér</Button>
          <Button onClick={() => signIn('hrac@banik.cz', 'demo')}>Přihlásit jako hráč A-týmu</Button>
          <Button onClick={() => signIn('view@banik.cz', 'demo')}>Přihlásit jako náhled (vše, jen ke čtení)</Button>
        </div>
      )}
    </div>
  );
}
