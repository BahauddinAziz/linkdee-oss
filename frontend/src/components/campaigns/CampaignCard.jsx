import React from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import styles from './CampaignCard.module.css';

/**
 * CampaignCard — Displays a summary of a campaign with actions.
 */
const CampaignCard = ({ campaign, onPause, onResume, onStop, onRefetch }) => {
  const navigate = useNavigate();

  const {
    id,
    name,
    mode,
    status,
    totalLeads = 0,
    sentLeads = 0,
    dailyCap = 0,
    sentToday = 0,
  } = campaign;

  const progress = totalLeads > 0 ? Math.min((sentLeads / totalLeads) * 100, 100) : 0;
  const dailyProgress = dailyCap > 0 ? Math.min((sentToday / dailyCap) * 100, 100) : 0;

  const handleAction = (e, fn) => {
    e.stopPropagation();
    if (fn) fn(id);
  };

  return (
    <div
      className={`glass-card ${styles.card}`}
      onClick={() => navigate(`/campaigns/${id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/campaigns/${id}`)}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.meta}>
          <h3 className={styles.name}>{name}</h3>
          <div className={styles.badges}>
            <Badge status={mode} />
            <Badge status={status} />
          </div>
        </div>
        <span className={styles.arrow}>→</span>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{sentLeads}</span>
          <span className={styles.statLabel}>Sent</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{totalLeads}</span>
          <span className={styles.statLabel}>Total Leads</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{dailyCap}</span>
          <span className={styles.statLabel}>Daily Cap</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{sentToday}</span>
          <span className={styles.statLabel}>Today</span>
        </div>
      </div>

      {/* Progress */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span className={styles.progressLabel}>Overall Progress</span>
          <span className={styles.progressPct}>{Math.round(progress)}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className={styles.progressHeader} style={{ marginTop: 10 }}>
          <span className={styles.progressLabel}>Daily Cap Used</span>
          <span className={styles.progressPct}>{sentToday} / {dailyCap}</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${dailyProgress}%`,
              background: 'linear-gradient(90deg, #10b981, #34d399)',
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
        {status === 'ACTIVE' || status === 'RUNNING' ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => handleAction(e, onPause)}
          >
            ⏸ Pause
          </Button>
        ) : status === 'PAUSED' ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => handleAction(e, onResume)}
          >
            ▶ Resume
          </Button>
        ) : null}
        {status !== 'STOPPED' && status !== 'COMPLETED' && (
          <Button
            variant="danger"
            size="sm"
            onClick={(e) => handleAction(e, onStop)}
          >
            ⏹ Stop
          </Button>
        )}
      </div>
    </div>
  );
};

export default CampaignCard;
