import React, { useState } from 'react';
import Badge from '../ui/Badge';
import styles from './LeadTable.module.css';

const PAGE_SIZE = 15;

const truncate = (url, max = 40) => {
  if (!url) return '—';
  try {
    const u = new URL(url);
    const path = u.pathname;
    return path.length > max ? path.substring(0, max) + '…' : path;
  } catch {
    return url.length > max ? url.substring(0, max) + '…' : url;
  }
};

const formatDate = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * LeadTable — Paginated table of leads.
 * @prop {Array} leads - Array of lead objects
 * @prop {boolean} isLoading
 */
const LeadTable = ({ leads = [], isLoading = false }) => {
  const [page, setPage] = useState(1);
  const [tooltipId, setTooltipId] = useState(null);

  const totalPages = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));
  const currentLeads = leads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className={styles.loadingWrap}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`skeleton ${styles.skeletonRow}`} />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">📭</span>
        <p className="empty-state-title">No leads yet</p>
        <p className="empty-state-desc">Upload a CSV or add a lead manually to get started.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Profile URL</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Status</th>
              <th>Executed At</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {currentLeads.map((lead, idx) => (
              <tr key={lead.id || idx} className={styles.row}>
                <td className={styles.num}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                <td>
                  {lead.profileUrl ? (
                    <a
                      href={lead.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.profileLink}
                      title={lead.profileUrl}
                    >
                      🔗 {truncate(lead.profileUrl)}
                    </a>
                  ) : '—'}
                </td>
                <td className={styles.name}>{lead.firstName || '—'}</td>
                <td className={styles.name}>{lead.lastName || '—'}</td>
                <td>
                  <Badge status={lead.status || 'PENDING'} />
                </td>
                <td className={styles.date}>{formatDate(lead.executedAt)}</td>
                <td>
                  {lead.errorMessage ? (
                    <div
                      className={styles.errorCell}
                      onMouseEnter={() => setTooltipId(lead.id || idx)}
                      onMouseLeave={() => setTooltipId(null)}
                    >
                      <span className={styles.errorIcon}>⚠</span>
                      {tooltipId === (lead.id || idx) && (
                        <div className={styles.tooltip}>{lead.errorMessage}</div>
                      )}
                    </div>
                  ) : (
                    <span className={styles.okIcon}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, leads.length)} of {leads.length} leads
          </span>
          <div className={styles.pageControls}>
            <button
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            })}
            <button
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadTable;
