import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './Topbar.module.css';

const PAGE_TITLES = {
  '/':          { title: 'Dashboard',         subtitle: 'Overview of your outreach activity' },
  '/campaigns': { title: 'Campaigns',         subtitle: 'Manage your LinkedIn outreach campaigns' },
  '/accounts':  { title: 'LinkedIn Accounts', subtitle: 'Connected LinkedIn accounts via Unipile' },
  '/settings':  { title: 'Settings',          subtitle: 'Configure your account and preferences' },
};

const Topbar = () => {
  const location = useLocation();
  const [apiStatus, setApiStatus] = useState('checking'); // 'online' | 'offline' | 'checking'

  const pathKey = Object.keys(PAGE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find((k) => location.pathname === k || location.pathname.startsWith(k + '/'));

  const pageInfo = PAGE_TITLES[pathKey] || { title: 'LinkedReach', subtitle: '' };

  useEffect(() => {
    let cancelled = false;

    const checkApi = async () => {
      try {
        const res = await fetch('/api/v1/health', { method: 'GET' });
        if (!cancelled) setApiStatus(res.ok ? 'online' : 'offline');
      } catch {
        if (!cancelled) setApiStatus('offline');
      }
    };

    checkApi();
    const interval = setInterval(checkApi, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className={styles.topbar}>
      <div className={styles.titleSection}>
        <h1 className={styles.title}>{pageInfo.title}</h1>
        {pageInfo.subtitle && (
          <p className={styles.subtitle}>{pageInfo.subtitle}</p>
        )}
      </div>

      <div className={styles.right}>
        <div className={styles.statusPill}>
          <span
            className={`${styles.statusDot} ${styles[`statusDot--${apiStatus}`]}`}
            title={`API ${apiStatus}`}
          />
          <span className={styles.statusLabel}>
            {apiStatus === 'online'   && 'API Connected'}
            {apiStatus === 'offline'  && 'API Offline'}
            {apiStatus === 'checking' && 'Connecting...'}
          </span>
        </div>

        <div className={styles.time}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
