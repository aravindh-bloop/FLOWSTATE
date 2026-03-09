import type { RouteObject } from 'react-router-dom';

export const workbenchRoutes = [
  // ── FlowState Coach Admin routes ────────────────────────────────────────────
  // All routes below are coach-only (workspace ID = "coach-admin").
  // They must appear before the generic /:pageId catch-all.
  {
    path: '/admin-dashboard',
    lazy: () =>
      import('./pages/workspace/flowstate/coach/dashboard').then(m => ({
        Component: m.Component,
      })),
  },
  {
    path: '/intervention-queue',
    lazy: () =>
      import('./pages/workspace/flowstate/coach/intervention-queue').then(
        m => ({ Component: m.Component })
      ),
  },
  {
    path: '/registrations',
    lazy: () =>
      import('./pages/workspace/flowstate/coach/registrations').then(m => ({
        Component: m.Component,
      })),
  },
  {
    path: '/clients',
    lazy: () =>
      import('./pages/workspace/flowstate/coach/clients').then(m => ({
        Component: m.Component,
      })),
  },
  {
    path: '/clients/:clientId',
    lazy: () =>
      import('./pages/workspace/flowstate/coach/clients').then(m => ({
        Component: m.Component,
      })),
  },
  {
    path: '/templates',
    lazy: () =>
      import('./pages/workspace/flowstate/coach/templates').then(m => ({
        Component: m.Component,
      })),
  },
  {
    path: '/reports',
    lazy: () =>
      import('./pages/workspace/flowstate/coach/reports').then(m => ({
        Component: m.Component,
      })),
  },
  {
    path: '/onboard',
    lazy: () =>
      import('./pages/workspace/flowstate/coach/onboard').then(m => ({
        Component: m.Component,
      })),
  },

  // ── FlowState Client Portal routes ──────────────────────────────────────────
  // All routes below are client-facing (workspace ID = affine_workspace_id).
  {
    path: '/home',
    lazy: () =>
      import('./pages/workspace/flowstate/client/home').then(m => ({
        Component: m.Component,
      })),
  },
  {
    path: '/calendar',
    lazy: () =>
      import('./pages/workspace/flowstate/client/calendar').then(m => ({
        Component: m.Component,
      })),
  },
  {
    path: '/progress',
    lazy: () =>
      import('./pages/workspace/flowstate/client/progress').then(m => ({
        Component: m.Component,
      })),
  },
  {
    path: '/checkins',
    lazy: () =>
      import('./pages/workspace/flowstate/client/checkins').then(m => ({
        Component: m.Component,
      })),
  },
  {
    path: '/month-:monthNum',
    lazy: () =>
      import('./pages/workspace/flowstate/client/program').then(m => ({
        Component: m.Component,
      })),
  },
  {
    path: '/tools',
    lazy: () =>
      import('./pages/workspace/flowstate/client/tools').then(m => ({
        Component: m.Component,
      })),
  },

  // ── Original Affine routes ───────────────────────────────────────────────────
  {
    path: '/chat',
    lazy: () => import('./pages/workspace/chat/index'),
  },
  {
    path: '/all',
    lazy: () => import('./pages/workspace/all-page/all-page'),
  },
  {
    path: '/collection',
    lazy: () => import('./pages/workspace/all-collection'),
  },
  {
    path: '/collection/:collectionId',
    lazy: () => import('./pages/workspace/collection/index'),
  },
  {
    path: '/tag',
    lazy: () => import('./pages/workspace/all-tag'),
  },
  {
    path: '/tag/:tagId',
    lazy: () => import('./pages/workspace/tag'),
  },
  {
    path: '/trash',
    lazy: () => import('./pages/workspace/trash-page'),
  },
  {
    path: '/:pageId',
    lazy: () => import('./pages/workspace/detail-page/detail-page'),
  },
  {
    path: '/:pageId/attachments/:attachmentId',
    lazy: () => import('./pages/workspace/attachment/index'),
  },
  {
    path: '/journals',
    lazy: () => import('./pages/workspace/journals'),
  },
  {
    path: '/settings',
    lazy: () => import('./pages/workspace/settings'),
  },
  {
    path: '*',
    lazy: () => import('./pages/404'),
  },
] satisfies RouteObject[];
