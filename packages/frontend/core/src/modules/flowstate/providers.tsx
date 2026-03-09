/**
 * FlowState — Combined provider tree.
 *
 * Wraps all FlowState providers in the correct order:
 *   1. FlowStateAuthProvider  (BetterAuth session)
 *   2. FlowStateDataBridge    (API client routing)
 *
 * Mount this inside the Affine FrameworkRoot / I18nProvider so
 * framework services are available before FlowState runs.
 *
 * Usage (in app.tsx):
 *   <FlowStateProviders>
 *     <RouterProvider router={router} />
 *   </FlowStateProviders>
 */

import { type ReactNode } from 'react';

import { FlowStateAuthProvider } from './auth/context';
import { FlowStateDataBridge } from './bridge/data-bridge';

export function FlowStateProviders({ children }: { children: ReactNode }) {
  return (
    <FlowStateAuthProvider>
      <FlowStateDataBridge>{children}</FlowStateDataBridge>
    </FlowStateAuthProvider>
  );
}
