import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { path: '/',          label: 'Dashboard',          icon: '◈' },
  { path: '/campaigns', label: 'Campaigns',          icon: '⚡' },
  { path: '/inbox',     label: 'Unified Inbox',      icon: '💬' },
  { path: '/accounts',  label: 'LinkedIn Accounts',  icon: '🔗' },
  { path: '/settings',  label: 'Settings',           icon: '⚙' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>⚡</div>
        <div className={styles.logoText}>
          <span className={styles.logoName}>LinkedReach</span>
          <span className={styles.logoTagline}>outreach platform</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Navigation */}
      <nav className={styles.nav}>
        <p className={styles.navLabel}>Navigation</p>
        {NAV_ITEMS.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}>{icon}</span>
            <span className={styles.navText}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className={styles.footer}>
        <div className={styles.divider} />
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userEmail}>{user?.email || 'user@example.com'}</span>
            <span className={styles.userRole}>Administrator</span>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span>↪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
