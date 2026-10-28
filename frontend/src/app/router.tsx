import { createMemoryHistory, createRootRoute, createRoute, createRouter, createBrowserHistory } from '@tanstack/react-router';
import { Layout } from './Layout';
import { GalleryPage } from '@/features/gallery/GalleryPage';
import { NewMatchPage } from '@/features/gallery/NewMatchPage';
import { EditMatchPage } from '@/features/gallery/EditMatchPage';
import { PresentPage } from '@/features/present/PresentPage';
import { MarkerTextsPage } from '@/features/texts/MarkerTextsPage';
import { MatchReviewPage } from '@/features/match/MatchReviewPage';
import { PlaybookPage } from '@/features/playbook/PlaybookPage';
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { UsersPage } from '@/features/users/UsersPage';
import { AuthLogPage } from '@/features/authlog/AuthLogPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { isDemo } from '@/api';
import { safeRedirect } from '@/lib/redirect';

const root = createRootRoute({ component: Layout });

/** ?m=12 opens the match on marker 12 (shareable link to one situation). */
const matchSearch = (s: Record<string, unknown>): { m?: number } => {
  const m = Number(s.m);
  return Number.isInteger(m) && m > 0 ? { m } : {};
};

/** ?redirect=/match/2?m=12 brings the user back after login. Only same-site paths (no open redirect). */
const loginSearch = (s: Record<string, unknown>): { redirect?: string } => {
  const redirect = safeRedirect(s.redirect);
  return redirect ? { redirect } : {};
};

const routes = [
  createRoute({ getParentRoute: () => root, path: '/', component: GalleryPage }),
  createRoute({ getParentRoute: () => root, path: '/new', component: NewMatchPage }),
  createRoute({ getParentRoute: () => root, path: '/match/$matchId', component: MatchReviewPage, validateSearch: matchSearch }),
  createRoute({ getParentRoute: () => root, path: '/match/$matchId/edit', component: EditMatchPage }),
  createRoute({ getParentRoute: () => root, path: '/match/$matchId/present', component: PresentPage }),
  createRoute({ getParentRoute: () => root, path: '/match/$matchId/texts', component: MarkerTextsPage }),
  createRoute({ getParentRoute: () => root, path: '/playbook', component: PlaybookPage }),
  createRoute({ getParentRoute: () => root, path: '/analytics', component: AnalyticsPage }),
  createRoute({ getParentRoute: () => root, path: '/login', component: LoginPage, validateSearch: loginSearch }),
  createRoute({ getParentRoute: () => root, path: '/users', component: UsersPage }),
  createRoute({ getParentRoute: () => root, path: '/users/log', component: AuthLogPage }),
  createRoute({ getParentRoute: () => root, path: '/settings', component: SettingsPage }),
];

export const router = createRouter({
  routeTree: root.addChildren(routes),
  // The single-file demo runs inside a hosted viewer, where path URLs don't belong to us.
  history: isDemo ? createMemoryHistory({ initialEntries: ['/match/1'] }) : createBrowserHistory(),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
