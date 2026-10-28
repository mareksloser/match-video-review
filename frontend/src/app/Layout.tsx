import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { BookOpen, ChartColumn, Film, LogIn, Settings, Users, Wrench } from 'lucide-react';
import { Crest } from '@/components/Crest';
import { useMe, useSettingsValues } from './queries';
import { MaintenanceScreen } from './MaintenanceScreen';
import { SettingsEffects } from './SettingsEffects';
import { UserMenu } from './UserMenu';
import { isDemo } from '@/api';
import { cn } from '@/lib/cn';

const navLink =
  'relative flex h-14 items-center gap-2 px-1 text-[0.95rem] text-muted transition-colors hover:text-ink data-[status=active]:text-ink data-[status=active]:after:absolute data-[status=active]:after:inset-x-0 data-[status=active]:after:bottom-0 data-[status=active]:after:h-0.5 data-[status=active]:after:bg-pitch';

export function Layout() {
  const { data: me } = useMe();
  const settings = useSettingsValues();
  const { pathname } = useLocation();
  // Maintenance: everyone except coaches sees the notice; /login stays reachable for coaches.
  const blocked = settings.maintenanceEnabled && me?.role !== 'admin' && pathname !== '/login';

  return (
    <div className="flex min-h-screen">
      <SettingsEffects />
      <aside className="hidden w-[76px] shrink-0 flex-col items-center border-r border-line bg-panel py-4 md:flex">
        <Link to="/" aria-label="Galerie zápasů">
          <Crest className="h-14 w-12" label={settings.clubName} />
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
                <>
                  <Link to="/analytics" className={navLink}>
                    <ChartColumn className="h-4 w-4" /> Zhlédnutí
                  </Link>
                  <Link to="/users" className={navLink}>
                    <Users className="h-4 w-4" /> Uživatelé
                  </Link>
                  <Link to="/settings" className={navLink}>
                    <Settings className="h-4 w-4" /> Nastavení
                  </Link>
                </>
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
          {settings.maintenanceEnabled && me?.role === 'admin' && (
            <div className="flex items-center gap-2 border-t border-card-yellow/40 bg-card-yellow/15 px-4 py-1.5 text-sm md:px-8" role="status">
              <Wrench className="h-4 w-4 text-card-yellow" />
              Režim údržby je zapnutý. Hráči a náhled vidí jen zprávu o údržbě.
              <Link to="/settings" className="ml-auto font-medium underline-offset-2 hover:underline">Nastavení</Link>
            </div>
          )}
          {isDemo && (
            <div className="border-t border-line bg-raised px-4 py-1.5 text-xs text-muted md:px-8">
              Ukázková verze: data se ukládají jen ve vašem prohlížeči a video je simulovaný záznam.
            </div>
          )}
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">
          {blocked ? <MaintenanceScreen signedIn={!!me} /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}
