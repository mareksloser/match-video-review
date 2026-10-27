import { createMemoryHistory, createRootRoute, createRoute, createRouter, createBrowserHistory } from '@tanstack/react-router';
import { Layout } from './Layout';
import { GalleryPage } from '@/features/gallery/GalleryPage';
import { NewMatchPage } from '@/features/gallery/NewMatchPage';
import { EditMatchPage } from '@/features/gallery/EditMatchPage';
import { PresentPage } from '@/features/present/PresentPage';
import { MatchReviewPage } from '@/features/match/MatchReviewPage';
import { PlaybookPage } from '@/features/playbook/PlaybookPage';
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { UsersPage } from '@/features/users/UsersPage';
import { isDemo } from '@/api';

const root = createRootRoute({ component: Layout });

const routes = [
  createRoute({ getParentRoute: () => root, path: '/', component: GalleryPage }),
  createRoute({ getParentRoute: () => root, path: '/new', component: NewMatchPage }),
  createRoute({ getParentRoute: () => root, path: '/match/$matchId', component: MatchReviewPage }),
  createRoute({ getParentRoute: () => root, path: '/match/$matchId/edit', component: EditMatchPage }),
  createRoute({ getParentRoute: () => root, path: '/match/$matchId/present', component: PresentPage }),
  createRoute({ getParentRoute: () => root, path: '/playbook', component: PlaybookPage }),
  createRoute({ getParentRoute: () => root, path: '/analytics', component: AnalyticsPage }),
  createRoute({ getParentRoute: () => root, path: '/login', component: LoginPage }),
  createRoute({ getParentRoute: () => root, path: '/users', component: UsersPage }),
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
