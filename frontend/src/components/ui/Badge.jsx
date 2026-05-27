import React from 'react';

/**
 * Badge — Status indicator pill.
 * Maps status strings to appropriate colors.
 */
const STATUS_MAP = {
  // Success variants
  ACTIVE:     { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
  SENT:       { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
  CONNECTED:  { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
  connected:  { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
  SUCCESS:    { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
  COMPLETED:  { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },

  // Indigo — in-progress
  PENDING:    { bg: 'rgba(99,102,241,0.15)', color: '#6366f1', border: 'rgba(99,102,241,0.3)' },
  RUNNING:    { bg: 'rgba(99,102,241,0.15)', color: '#6366f1', border: 'rgba(99,102,241,0.3)' },
  PROCESSING: { bg: 'rgba(99,102,241,0.15)', color: '#6366f1', border: 'rgba(99,102,241,0.3)' },

  // Warning / amber
  PAUSED:     { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  SCHEDULED:  { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  QUEUED:     { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },

  // Error / red
  FAILED:     { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  ERROR:      { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  EXPIRED:    { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },

  // Muted — draft/stopped
  DRAFT:      { bg: 'rgba(100,116,139,0.15)', color: '#64748b', border: 'rgba(100,116,139,0.3)' },
  STOPPED:    { bg: 'rgba(100,116,139,0.15)', color: '#64748b', border: 'rgba(100,116,139,0.3)' },
  INACTIVE:   { bg: 'rgba(100,116,139,0.15)', color: '#64748b', border: 'rgba(100,116,139,0.3)' },

  // Connection request mode
  CONNECTION_REQUEST: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
  DIRECT_MESSAGE:     { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: 'rgba(139,92,246,0.3)' },
};

const DEFAULT_STYLE = { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)' };

const Badge = ({ status = '', className = '' }) => {
  const key = (status || '').toUpperCase().trim();
  const style = STATUS_MAP[key] || STATUS_MAP[status] || DEFAULT_STYLE;

  const label = (status || '').replace(/_/g, ' ');

  return (
    <span
      className={`badge ${className}`}
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {label}
    </span>
  );
};

export default Badge;
