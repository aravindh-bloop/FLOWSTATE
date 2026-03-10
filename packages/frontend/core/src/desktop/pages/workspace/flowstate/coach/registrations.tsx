/**
 * FlowState — Pending Registrations (Coach view)
 */
import { useFlowStateData } from '@affine/core/modules/flowstate';
import { useState } from 'react';

import {
  Btn,
  Card,
  ErrorBanner,
  LoadingSkeleton,
  PageShell,
  Tag,
} from '../shared/page-shell';
import type { Registration } from '../shared/types';
import { useAsync } from '../shared/use-async';

export function Component() {
  const { fetchRegistrations, approveRegistration, rejectRegistration } =
    useFlowStateData();

  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [approving, setApproving] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsync<Registration[]>(
    () =>
      fetchRegistrations(
        statusFilter === 'all' ? undefined : statusFilter
      ) as Promise<Registration[]>,
    [fetchRegistrations, statusFilter]
  );

  const handleApprove = async (id: string, preferredDate: string) => {
    try {
      setApproving(id);
      // Let's prompt for the start date, default to their preferred
      const date = window.prompt(
        'Confirm program start date (YYYY-MM-DD):',
        preferredDate
      );
      if (!date) return; // Cancelled

      await approveRegistration(id, date);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      if (!window.confirm('Are you sure you want to reject this application?'))
        return;
      await rejectRegistration(id);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Rejection failed');
    }
  };

  const registrations = data ?? [];

  return (
    <PageShell
      title="Registrations"
      subtitle={`${registrations.length} applications`}
    >
      {error && <ErrorBanner message={error} />}

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 20,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 12,
                border: '1px solid var(--affine-border-color)',
                cursor: 'pointer',
                background:
                  statusFilter === s
                    ? 'var(--affine-primary-color)'
                    : 'var(--affine-background-secondary-color)',
                color:
                  statusFilter === s
                    ? '#fff'
                    : 'var(--affine-text-secondary-color)',
                fontWeight: statusFilter === s ? 600 : 400,
              }}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <Btn variant="secondary" onClick={reload} small>
          ↻
        </Btn>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {registrations.length === 0 && (
            <div
              style={{
                padding: '48px 0',
                textAlign: 'center',
                color: 'var(--affine-text-secondary-color)',
              }}
            >
              No registrations found.
            </div>
          )}
          {registrations.map(reg => (
            <Card
              key={reg.id}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    {reg.full_name}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--affine-text-secondary-color)',
                      marginTop: 2,
                    }}
                  >
                    {reg.email} {reg.phone ? `· ${reg.phone}` : ''}
                  </div>
                </div>
                <Tag
                  color={
                    reg.status === 'pending'
                      ? 'amber'
                      : reg.status === 'approved'
                        ? 'green'
                        : 'red'
                  }
                >
                  {reg.status}
                </Tag>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
                  gap: 16,
                  fontSize: 13,
                }}
              >
                <div>
                  <strong
                    style={{ color: 'var(--affine-text-secondary-color)' }}
                  >
                    Preferred Start:
                  </strong>
                  <br />
                  {reg.preferred_start_date}
                </div>
                <div>
                  <strong
                    style={{ color: 'var(--affine-text-secondary-color)' }}
                  >
                    Discord ID:
                  </strong>
                  <br />
                  {reg.discord_user_id ?? 'N/A'}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong
                    style={{ color: 'var(--affine-text-secondary-color)' }}
                  >
                    Goals:
                  </strong>
                  <br />
                  {reg.short_term_goals ?? 'Not specified'}
                </div>
              </div>

              {reg.status === 'pending' && (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'flex-end',
                    borderTop: '1px solid var(--affine-border-color)',
                    paddingTop: 16,
                  }}
                >
                  <Btn
                    variant="secondary"
                    small
                    onClick={() => void handleReject(reg.id)}
                    disabled={approving === reg.id}
                  >
                    Reject
                  </Btn>
                  <Btn
                    small
                    onClick={() =>
                      void handleApprove(reg.id, reg.preferred_start_date)
                    }
                    disabled={approving === reg.id}
                  >
                    {approving === reg.id
                      ? 'Approving...'
                      : 'Approve & Provision'}
                  </Btn>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
