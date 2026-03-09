/**
 * FlowState module — public exports.
 *
 * Import from here in the app shell and page components.
 *
 * @example
 *   import { FlowStateProviders, useFlowStateAuth, useFlowStateData } from '@affine/core/modules/flowstate';
 */

// Combined provider wrapper
export { FlowStateProviders } from './providers';

// Auth
export { FlowStateAuthProvider, useFlowStateAuth } from './auth/context';
export { LoginPage } from './auth/login-page';
export {
  fetchSession,
  loginWithCredentials,
  logout,
  getStoredToken,
} from './auth/session';
export type { FlowStateUser, FlowStateSession } from './auth/session';

// Data bridge
export { FlowStateDataBridge, useFlowStateData } from './bridge/data-bridge';
export * as flowstateApi from './bridge/api-client';

// Routing
export {
  RequireAuth,
  RequireCoach,
  RootRedirect,
} from './routing/workspace-router';

// Branding
export { FlowStateLogo, FlowStateIcon } from './branding/logo';
