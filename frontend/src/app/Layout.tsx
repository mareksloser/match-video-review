import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { BookOpen, ChartColumn, Film, LogIn, LogOut } from 'lucide-react';
import { Crest } from '@/components/Crest';
import { useLogout, useMe } from './queries';
import { isDemo } from '@/api';
import { cn } from '@/lib/cn';

const navLink =
  'relative flex h-14 items-center gap-2 px-1 text-[0.95rem] text-muted transition-colors hover:text-ink data-[status=active]:text-ink data-[status=active]:after:absolute data-[status=active]:after:inset-x-0 data-[status=active]:after:bottom-0 data-[status=active]:after:h-0.5 data-[status=active]:after:bg-pitch';

export function Layout() {
  const { data: me } = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[76px] shrink-0 flex-col items-center border-r border-line bg-panel py-4 md:flex">
        <Link to="/" aria-label="Galerie zápasů">
          <Crest className="h-12 w-11" />
        </Link>
        <div className="mt-auto">
          {me && (
            <button
              onClick={() => logout.mutate(undefined, { onSuccess: () => navigate({ to: '/' }) })}
              className="rounded-md p-2 text-muted hover:bg-raised hover:text-ink"
              aria-label="Odhlásit se"
              title="Odhlásit se"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-line bg-panel/95 backdrop-blur">
          <div className="flex items-center gap-6 px-4 md:px-8">
            <Link to="/" className="md:hidden" aria-label="Galerie zápasů">
              <Crest className="h-9 w-8" />
            </Link>
            <nav className="flex min-w-0 flex-1 items-center gap-6 overflow-x-auto">
              <Link to="/" className={navLink} activeOptions={{ exact: true }}>
                <Film className="h-4 w-4" /> Zápasy
              </Link>
              {me && (
                <Link to="/playbook" className={navLink}>
                  <BookOpen className="h-4 w-4" /> Playbook
                </Link>
              )}
              {me?.role === 'admin' && (
                <Link to="/analytics" className={navLink}>
                  <ChartColumn className="h-4 w-4" /> Zhlédnutí
                </Link>
              )}
            </nav>
            {me ? (
              <div className="flex items-center gap-3">
                <div className="hidden text-right leading-tight sm:block">
                  <div className="text-sm font-medium">{me.name}</div>
                  <div className="text-xs text-muted">{me.role === 'admin' ? 'Trenér' : 'Hráč'}</div>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-full bg-raised font-display text-base font-semibold">
                  {me.name.split(' ').map((p) => p[0]).join('')}
                </div>
                <button
                  onClick={() => logout.mutate(undefined, { onSuccess: () => navigate({ to: '/' }) })}
                  className="rounded-md p-2 text-muted hover:bg-raised hover:text-ink md:hidden"
                  aria-label="Odhlásit se"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <Link to="/login" className={cn(navLink, 'text-ink')}>
                <LogIn className="h-4 w-4" /> Přihlásit
              </Link>
            )}
          </div>
          {isDemo && (
            <div className="border-t border-line bg-raised px-4 py-1.5 text-xs text-muted md:px-8">
              Ukázková verze: data se ukládají jen ve vašem prohlížeči a video je simulovaný záznam.
            </div>
          )}
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
