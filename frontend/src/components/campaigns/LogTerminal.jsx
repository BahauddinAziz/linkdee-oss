import React, { useEffect, useRef } from 'react';
import styles from './LogTerminal.module.css';

const LEVEL_STYLES = {
  INFO:    { color: '#94a3b8', prefix: '[INFO ]' },
  SUCCESS: { color: '#10b981', prefix: '[OK   ]' },
  ERROR:   { color: '#ef4444', prefix: '[ERROR]' },
  WARN:    { color: '#f59e0b', prefix: '[WARN ]' },
  DEBUG:   { color: '#6366f1', prefix: '[DEBUG]' },
};

const formatTime = (ts) => {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

/**
 * LogTerminal — Dark terminal-style scrolling log viewer.
 * @prop {Array} logs - Array of { level, message, timestamp } objects
 */
const LogTerminal = ({ logs = [] }) => {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className={styles.terminal}>
      {/* Terminal Header Bar */}
      <div className={styles.header}>
        <div className={styles.dots}>
          <span className={`${styles.dot} ${styles.dotRed}`} />
          <span className={`${styles.dot} ${styles.dotYellow}`} />
          <span className={`${styles.dot} ${styles.dotGreen}`} />
        </div>
        <span className={styles.headerTitle}>linkedreach — campaign logs</span>
        <span className={styles.count}>{logs.length} entries</span>
      </div>

      {/* Log Body */}
      <div className={styles.body}>
        {logs.length === 0 ? (
          <p className={styles.empty}>
            <span style={{ color: '#475569' }}>▌</span> Waiting for log entries...
          </p>
        ) : (
          logs.map((log, index) => {
            const lvl = (log.level || 'INFO').toUpperCase();
            const style = LEVEL_STYLES[lvl] || LEVEL_STYLES.INFO;
            return (
              <div key={index} className={styles.logLine}>
                <span className={styles.timestamp}>{formatTime(log.timestamp || log.createdAt)}</span>
                <span className={styles.level} style={{ color: style.color }}>
                  {style.prefix}
                </span>
                <span className={styles.message} style={{ color: style.color }}>
                  {log.message || log.msg || String(log)}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default LogTerminal;
