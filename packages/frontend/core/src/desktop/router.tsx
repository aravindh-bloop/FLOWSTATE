import { wrapCreateBrowserRouterV6 } from '@sentry/react';
import { useEffect, useState } from 'react';
import type { RouteObject } from 'react-router-dom';
import {
  createBrowserRouter as reactRouterCreateBrowserRouter,
  redirect,
  useNavigate,
} from 'react-router-dom';

import { AffineErrorComponent } from '../components/affine/affine-error-boundary/affine-error-fallback';
import { NavigateContext } from '../components/hooks/use-navigate-helper';
// FlowState — role-based routing guards
import {
  RequireAuth,
  RootRedirect,
} from '../modules/flowstate/routing/workspace-router';
import { RootWrapper } from './pages/root';
import {
  CATCH_ALL_ROUTE_PATH,
  getWorkspaceDocPath,
  NOT_FOUND_ROUTE_PATH,
  SHARE_ROUTE_PATH,
  WORKSPACE_ROUTE_PATH,
} from './route-paths';

export function RootRouter() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // a hack to make sure router is ready
    setReady(true);
  }, []);

  return (
    ready && (
      <NavigateContext.Provider value={navigate}>
        <RootWrapper />
      </NavigateContext.Provider>
    )
  );
}

export const topLevelRoutes = [
  {
    element: <RootRouter />,
    errorElement: <AffineErrorComponent />,
    children: [
      {
        // FlowState: root redirects to the correct workspace by role
        path: '/',
        element: <RootRedirect />,
      },
      {
        // FlowState: workspace pages require auth
        path: WORKSPACE_ROUTE_PATH,
        element: <RequireAuth />,
        children: [
          {
            index: true,
            lazy: () => import('./pages/workspace/index'),
          },
          {
            path: '*',
            lazy: () => import('./pages/workspace/index'),
          },
        ],
      },
      // Legacy share redirect — kept for doc-link compatibility
      {
        path: SHARE_ROUTE_PATH,
        loader: ({ params }) => {
          return redirect(
            getWorkspaceDocPath(params.workspaceId ?? '', params.pageId ?? '')
          );
        },
      },
      {
        path: NOT_FOUND_ROUTE_PATH,
        lazy: () => import('./pages/404'),
      },
      {
        // FlowState login — handled by FlowStateAuthProvider's LoginPage
        // Redirect unauthenticated visits at the route level
        path: '/sign-in',
        loader: () => redirect('/'),
      },
      {
        path: '/redirect-proxy',
        lazy: () => import('./pages/redirect'),
      },
      {
        path: CATCH_ALL_ROUTE_PATH,
        lazy: () => import('./pages/404'),
      },
    ],
  },
] satisfies [RouteObject, ...RouteObject[]];

const createBrowserRouter = wrapCreateBrowserRouterV6(
  reactRouterCreateBrowserRouter
);
export const router = (
  window.SENTRY_RELEASE ? createBrowserRouter : reactRouterCreateBrowserRouter
)(topLevelRoutes, {
  basename: environment.subPath,
  future: {
    v7_normalizeFormMethod: true,
  },
});
