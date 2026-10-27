import { Link, Outlet } from '@tanstack/react-router';
import { BookOpen, ChartColumn, Film, LogIn } from 'lucide-react';
import { Crest } from '@/components/Crest';
import { useMe } from './queries';
import { UserMenu } from './UserMenu';
import { isDemo } from '@/api';
import { cn } from '@/lib/cn';

const navLink =
  'relative flex h-14 items-center gap-2 px-1 text-[0.95rem] text-muted transition-colors hover:text-ink data-[status=active]:text-ink data-[status=active]:after:absolute data-[status=active]:after:inset-x-0 data-[status=active]:after:bottom-0 data-[status=active]:after:h-0.5 data-[status=active]:after:bg-pitch';

export function Layout() {
  const { data: me } = useMe();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[76px] shrink-0 flex-col items-center border-r border-line bg-panel py-4 md:flex">
        <Link to="/" aria-label="Galerie zápasů">
          <Crest className="h-14 w-12" />
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-line bg-panel/95 backdrop-blur">
          <div className="flex items-center gap-6 px-4 md:px-8">
            <Link to="/" className="md:hidden" aria-label="Galerie zápasů">
              <Crest className="h-10 w-9" />
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
              <UserMenu user={me} />
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
