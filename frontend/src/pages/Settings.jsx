import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import { api } from '../api/client';
import styles from './Settings.module.css';

const APP_VERSION = '1.0.0';
const GITHUB_URL = 'https://github.com/your-org/linkedreach';

const Settings = () => {
  const { user } = useAuth();

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSuccess, setPwSuccess] = useState(false);
  const [isPwLoading, setIsPwLoading] = useState(false);

  const validatePw = () => {
    const errs = {};
    if (!pwForm.currentPassword)         errs.currentPassword = 'Current password is required';
    if (!pwForm.newPassword)             errs.newPassword = 'New password is required';
    else if (pwForm.newPassword.length < 8) errs.newPassword = 'Min. 8 characters';
    if (pwForm.newPassword !== pwForm.confirmPassword)
      errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    const errs = validatePw();
    if (Object.keys(errs).length > 0) { setPwErrors(errs); return; }
    setIsPwLoading(true);
    setPwErrors({});
    setPwSuccess(false);
    try {
      await api.patch('/api/v1/auth/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwSuccess(true);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwErrors({ submit: err.message });
    } finally {
      setIsPwLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* ---- Account Section ---- */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Account</h2>
          <p className={styles.sectionDesc}>Manage your account credentials and security</p>
        </div>

        {/* Email Info */}
        <div className={`glass-card ${styles.infoCard}`}>
          <div className={styles.infoRow}>
            <div className={styles.infoIcon}>✉️</div>
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>Email Address</span>
              <span className={styles.infoValue}>{user?.email || '—'}</span>
            </div>
            <div className={styles.infoBadge}>Verified</div>
          </div>
          <div className={styles.infoRow}>
            <div className={styles.infoIcon}>🪪</div>
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>User ID</span>
              <span className={`${styles.infoValue} ${styles.infoMono}`}>{user?.id || '—'}</span>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className={`glass-card ${styles.pwCard}`}>
          <h3 className={styles.cardTitle}>Change Password</h3>
          <form className={styles.pwForm} onSubmit={handlePwSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                className={`form-input ${pwErrors.currentPassword ? 'error' : ''}`}
                type="password"
                placeholder="••••••••"
                value={pwForm.currentPassword}
                autoComplete="current-password"
                onChange={(e) => { setPwForm((p) => ({ ...p, currentPassword: e.target.value })); setPwErrors((p) => ({ ...p, currentPassword: null })); }}
              />
              {pwErrors.currentPassword && <span className="form-error">⚠ {pwErrors.currentPassword}</span>}
            </div>

            <div className={styles.pwGrid}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  className={`form-input ${pwErrors.newPassword ? 'error' : ''}`}
                  type="password"
                  placeholder="Min. 8 characters"
                  value={pwForm.newPassword}
                  autoComplete="new-password"
                  onChange={(e) => { setPwForm((p) => ({ ...p, newPassword: e.target.value })); setPwErrors((p) => ({ ...p, newPassword: null })); }}
                />
                {pwErrors.newPassword && <span className="form-error">⚠ {pwErrors.newPassword}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  className={`form-input ${pwErrors.confirmPassword ? 'error' : ''}`}
                  type="password"
                  placeholder="Re-enter new password"
                  value={pwForm.confirmPassword}
                  autoComplete="new-password"
                  onChange={(e) => { setPwForm((p) => ({ ...p, confirmPassword: e.target.value })); setPwErrors((p) => ({ ...p, confirmPassword: null })); }}
                />
                {pwErrors.confirmPassword && <span className="form-error">⚠ {pwErrors.confirmPassword}</span>}
              </div>
            </div>

            {pwErrors.submit && (
              <div className={styles.errorBanner}>⚠ {pwErrors.submit}</div>
            )}

            {pwSuccess && (
              <div className={styles.successBanner}>✓ Password updated successfully!</div>
            )}

            <div className={styles.formActions}>
              <Button variant="primary" type="submit" loading={isPwLoading}>
                Update Password
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* ---- About Section ---- */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>About LinkedReach</h2>
          <p className={styles.sectionDesc}>Open-source LinkedIn outreach automation platform</p>
        </div>

        <div className={`glass-card ${styles.aboutCard}`}>
          <div className={styles.aboutLogo}>
            <div className={styles.aboutLogoIcon}>⚡</div>
            <div>
              <h3 className={styles.aboutName}>LinkedReach</h3>
              <span className={styles.aboutVersion}>v{APP_VERSION}</span>
            </div>
          </div>

          <p className={styles.aboutDesc}>
            LinkedReach is an open-source platform for running smart, safe, and scalable LinkedIn outreach campaigns.
            Built with Node.js, React, and Unipile — designed to respect LinkedIn rate limits while maximizing your outreach impact.
          </p>

          <div className={styles.aboutLinks}>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.githubBtn}
            >
              <span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              </span>
              <span>View on GitHub</span>
            </a>

            <div className={styles.metaRow}>
              <span className={styles.metaItem}>
                <span className={styles.metaDot} style={{ background: '#10b981' }} />
                MIT License
              </span>
              <span className={styles.metaItem}>
                <span className={styles.metaDot} style={{ background: '#6366f1' }} />
                React 18 + Vite
              </span>
              <span className={styles.metaItem}>
                <span className={styles.metaDot} style={{ background: '#8b5cf6' }} />
                Node.js Backend
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
