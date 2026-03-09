/**
 * FlowState — Data Bridge Layer.
 *
 * Intercepts Affine page/database read-write calls and routes them
 * to our FlowState backend API instead of Affine's own backend.
 *
 * Pattern: wrap the React tree with <FlowStateDataBridge>.
 * Children use the `useFlowStateData` hook to read data instead
 * of calling Affine's internal services directly.
 *
 * All mutations go through the api-client module which injects
 * the BetterAuth JWT automatically.
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from 'react';

import {
  calendarApi,
  checkInsApi,
  clientsApi,
  dashboardApi,
  interventionsApi,
  notificationsApi,
  registrationsApi,
  summariesApi,
  templatesApi,
} from './api-client';

// ─── Context shape ────────────────────────────────────────────────────────────

interface DataBridgeContextValue {
  // Dashboard
  fetchCoachDashboard: () => Promise<unknown>;
  fetchClientDashboard: () => Promise<unknown>;

  // Clients
  fetchClients: () => Promise<unknown>;
  fetchClient: (id: string) => Promise<unknown>;
  onboardClient: (data: unknown) => Promise<unknown>;
  updateClient: (id: string, data: unknown) => Promise<unknown>;
  setClientStatus: (id: string, status: string) => Promise<unknown>;

  // Check-ins
  fetchCheckIns: (clientId: string, page?: number) => Promise<unknown>;
  fetchCheckInStats: (clientId: string) => Promise<unknown>;

  // Calendar
  fetchCalendar: (clientId: string) => Promise<unknown>;
  rescheduleEvent: (eventId: string, scheduledAt: string) => Promise<unknown>;

  // Interventions
  fetchAllInterventions: () => Promise<unknown>;
  fetchClientInterventions: (clientId: string) => Promise<unknown>;
  createManualIntervention: (data: unknown) => Promise<unknown>;
  approveIntervention: (id: string) => Promise<unknown>;
  editIntervention: (id: string, finalMessage: string) => Promise<unknown>;
  dismissIntervention: (id: string) => Promise<unknown>;

  // Templates
  fetchTemplates: () => Promise<unknown>;
  createTemplate: (data: unknown) => Promise<unknown>;
  updateTemplate: (id: string, data: unknown) => Promise<unknown>;
  deleteTemplate: (id: string) => Promise<unknown>;

  // Summaries
  fetchSummaries: (clientId: string) => Promise<unknown>;
  addSummaryNotes: (summaryId: string, notes: string) => Promise<unknown>;

  // Notifications
  fetchNotifications: () => Promise<unknown>;
  markNotificationRead: (id: string) => Promise<unknown>;
  markAllNotificationsRead: () => Promise<unknown>;

  // Registrations
  submitRegistration: (data: unknown) => Promise<unknown>;
  fetchRegistrations: (status?: string) => Promise<unknown>;
  fetchRegistration: (id: string) => Promise<unknown>;
  approveRegistration: (id: string, programStartDate?: string) => Promise<unknown>;
  rejectRegistration: (id: string, reason?: string) => Promise<unknown>;
}

const DataBridgeContext = createContext<DataBridgeContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Wrap your app (or sub-tree) with this provider to give children
 * access to the FlowState data bridge. Place it inside
 * <FlowStateAuthProvider> so auth tokens are available.
 */
export function FlowStateDataBridge({ children }: { children: ReactNode }) {
  // Use refs for the API functions so the context value is stable
  const _dashboardApi = useRef(dashboardApi);
  const _clientsApi = useRef(clientsApi);
  const _checkInsApi = useRef(checkInsApi);
  const _calendarApi = useRef(calendarApi);
  const _interventionsApi = useRef(interventionsApi);
  const _templatesApi = useRef(templatesApi);
  const _summariesApi = useRef(summariesApi);
  const _notificationsApi = useRef(notificationsApi);
  const _registrationsApi = useRef(registrationsApi);

  const fetchCoachDashboard = useCallback(
    () => _dashboardApi.current.coach(),
    []
  );
  const fetchClientDashboard = useCallback(
    () => _dashboardApi.current.client(),
    []
  );

  const fetchClients = useCallback(() => _clientsApi.current.list(), []);
  const fetchClient = useCallback(
    (id: string) => _clientsApi.current.get(id),
    []
  );
  const onboardClient = useCallback(
    (data: unknown) => _clientsApi.current.onboard(data),
    []
  );
  const updateClient = useCallback(
    (id: string, data: unknown) => _clientsApi.current.update(id, data),
    []
  );
  const setClientStatus = useCallback(
    (id: string, status: string) => _clientsApi.current.setStatus(id, status),
    []
  );

  const fetchCheckIns = useCallback(
    (clientId: string, page = 1) => _checkInsApi.current.list(clientId, page),
    []
  );
  const fetchCheckInStats = useCallback(
    (clientId: string) => _checkInsApi.current.stats(clientId),
    []
  );

  const fetchCalendar = useCallback(
    (clientId: string) => _calendarApi.current.list(clientId),
    []
  );
  const rescheduleEvent = useCallback(
    (eventId: string, scheduledAt: string) =>
      _calendarApi.current.reschedule(eventId, scheduledAt),
    []
  );

  const fetchAllInterventions = useCallback(
    () => _interventionsApi.current.listAll(),
    []
  );
  const fetchClientInterventions = useCallback(
    (clientId: string) => _interventionsApi.current.listForClient(clientId),
    []
  );
  const createManualIntervention = useCallback(
    (data: unknown) => _interventionsApi.current.createManual(data),
    []
  );
  const approveIntervention = useCallback(
    (id: string) => _interventionsApi.current.approve(id),
    []
  );
  const editIntervention = useCallback(
    (id: string, msg: string) => _interventionsApi.current.edit(id, msg),
    []
  );
  const dismissIntervention = useCallback(
    (id: string) => _interventionsApi.current.dismiss(id),
    []
  );

  const fetchTemplates = useCallback(
    () => _templatesApi.current.list(),
    []
  );
  const createTemplate = useCallback(
    (data: unknown) => _templatesApi.current.create(data),
    []
  );
  const updateTemplate = useCallback(
    (id: string, data: unknown) => _templatesApi.current.update(id, data),
    []
  );
  const deleteTemplate = useCallback(
    (id: string) => _templatesApi.current.remove(id),
    []
  );

  const fetchSummaries = useCallback(
    (clientId: string) => _summariesApi.current.listForClient(clientId),
    []
  );
  const addSummaryNotes = useCallback(
    (summaryId: string, notes: string) =>
      _summariesApi.current.addNotes(summaryId, notes),
    []
  );

  const fetchNotifications = useCallback(
    () => _notificationsApi.current.list(),
    []
  );
  const markNotificationRead = useCallback(
    (id: string) => _notificationsApi.current.markRead(id),
    []
  );
  const markAllNotificationsRead = useCallback(
    () => _notificationsApi.current.markAllRead(),
    []
  );

  const submitRegistration = useCallback(
    (data: unknown) => _registrationsApi.current.create(data),
    []
  );
  const fetchRegistrations = useCallback(
    (status?: string) => _registrationsApi.current.list(status),
    []
  );
  const fetchRegistration = useCallback(
    (id: string) => _registrationsApi.current.get(id),
    []
  );
  const approveRegistration = useCallback(
    (id: string, programStartDate?: string) =>
      _registrationsApi.current.approve(id, programStartDate),
    []
  );
  const rejectRegistration = useCallback(
    (id: string, reason?: string) =>
      _registrationsApi.current.reject(id, reason),
    []
  );

  return (
    <DataBridgeContext.Provider
      value={{
        fetchCoachDashboard,
        fetchClientDashboard,
        fetchClients,
        fetchClient,
        onboardClient,
        updateClient,
        setClientStatus,
        fetchCheckIns,
        fetchCheckInStats,
        fetchCalendar,
        rescheduleEvent,
        fetchAllInterventions,
        fetchClientInterventions,
        createManualIntervention,
        approveIntervention,
        editIntervention,
        dismissIntervention,
        fetchTemplates,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        fetchSummaries,
        addSummaryNotes,
        fetchNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        submitRegistration,
        fetchRegistrations,
        fetchRegistration,
        approveRegistration,
        rejectRegistration,
      }}
    >
      {children}
    </DataBridgeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFlowStateData(): DataBridgeContextValue {
  const ctx = useContext(DataBridgeContext);
  if (!ctx) {
    throw new Error(
      'useFlowStateData must be used inside <FlowStateDataBridge>'
    );
  }
  return ctx;
}
