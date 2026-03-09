import { NotificationCenter } from '@affine/component';
import { Outlet } from 'react-router-dom';

import { GlobalDialogs } from '../../dialogs';
import { CustomThemeModifier } from './custom-theme';

/**
 * FlowState: stripped of Affine Cloud's DefaultServerService dependency.
 * Session readiness is handled by FlowStateAuthProvider.
 * @see packages/frontend/core/src/modules/flowstate/auth/context.tsx
 */
export const RootWrapper = () => {
  return (
    <>
      <GlobalDialogs />
      <NotificationCenter />
      <Outlet />
      <CustomThemeModifier />
    </>
  );
};
