import React, { useState, useEffect } from 'react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { api } from '../api/client';
import styles from './Accounts.module.css';

const INITIAL_FORM = { label: '', dsn: '', accessToken: '' };

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hostedAuthUrl, setHostedAuthUrl] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const fetchAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get('/api/v1/accounts');
      setAccounts(Array.isArray(data) ? data : data?.accounts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const validateForm = () => {
    const errs = {};
    if (!form.label.trim())       errs.label = 'Label is required';
    if (!form.dsn.trim())         errs.dsn   = 'Unipile DSN is required';
    if (!form.accessToken.trim()) errs.accessToken = 'Access Token is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    setIsSubmitting(true);
    setFormErrors({});
    setHostedAuthUrl(null);
    try {
      const result = await api.post('/api/v1/accounts', {
        label: form.label,
        dsn: form.dsn,
        accessToken: form.accessToken,
      });
      if (result?.hostedAuthUrl || result?.authUrl) {
        setHostedAuthUrl(result.hostedAuthUrl || result.authUrl);
      }
      setForm(INITIAL_FORM);
      fetchAccounts();
    } catch (err) {
      setFormErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this LinkedIn account? All associated data will be removed.')) return;
    setDeletingId(id);
    setActionError(null);
    try {
      await api.delete(`/api/v1/accounts/${id}`);
      fetchAccounts();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setHostedAuthUrl(null);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>LinkedIn Accounts</h1>
          <p className={styles.subtitle}>Connect accounts via Unipile to run campaigns</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          + Connect Account
        </Button>
      </div>

      {/* Global Error */}
      {(error || actionError) && (
        <div className={styles.errorBanner}>
          <span>⚠</span> {error || actionError}
        </div>
      )}

      {/* Account List */}
      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.skeletonCard}`} />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className={`glass-card ${styles.emptyState}`}>
          <span className={styles.emptyIcon}>🔗</span>
          <p className={styles.emptyTitle}>No accounts connected</p>
          <p className={styles.emptyDesc}>
            Connect a LinkedIn account through Unipile to start running campaigns.
          </p>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            Connect Your First Account
          </Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {accounts.map((acc) => (
            <div key={acc.id} className={`glass-card ${styles.accountCard}`}>
              <div className={styles.accountHeader}>
                <div className={styles.accountAvatar}>
                  {(acc.label || acc.email || 'A')[0].toUpperCase()}
                </div>
                <div className={styles.accountInfo}>
                  <span className={styles.accountLabel}>{acc.label || 'Unnamed Account'}</span>
                  {acc.email && <span className={styles.accountEmail}>{acc.email}</span>}
                </div>
                <Badge status={acc.status || 'ACTIVE'} />
              </div>

              <div className={styles.accountDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailKey}>Account ID</span>
                  <span className={styles.detailVal}>{acc.id}</span>
                </div>
                {acc.dsn && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>DSN</span>
                    <span className={styles.detailVal}>{acc.dsn.substring(0, 32)}…</span>
                  </div>
                )}
                {acc.createdAt && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailKey}>Connected</span>
                    <span className={styles.detailVal}>
                      {new Date(acc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.accountFooter}>
                <Button
                  variant="danger"
                  size="sm"
                  loading={deletingId === acc.id}
                  onClick={() => handleDelete(acc.id)}
                >
                  🗑 Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Connect LinkedIn Account"
        size="md"
      >
        {hostedAuthUrl ? (
          <div className={styles.authUrlSection}>
            <div className={styles.authUrlIcon}>✅</div>
            <h3 className={styles.authUrlTitle}>Account Connected!</h3>
            <p className={styles.authUrlDesc}>
              Complete authentication by visiting the Unipile hosted auth URL:
            </p>
            <a
              href={hostedAuthUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.authUrlLink}
            >
              <span>🔐 Open Authentication Page</span>
              <span className={styles.authUrlArrow}>↗</span>
            </a>
            <p className={styles.authUrlNote}>
              Complete the LinkedIn login in the new tab, then come back here.
            </p>
            <Button variant="primary" onClick={handleCloseModal}>
              Done
            </Button>
          </div>
        ) : (
          <form className={styles.connectForm} onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Account Label *</label>
              <input
                className={`form-input ${formErrors.label ? 'error' : ''}`}
                type="text"
                placeholder="e.g. My Primary LinkedIn"
                value={form.label}
                onChange={(e) => { setForm((p) => ({ ...p, label: e.target.value })); setFormErrors((p) => ({ ...p, label: null })); }}
              />
              {formErrors.label && <span className="form-error">⚠ {formErrors.label}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Unipile DSN *</label>
              <input
                className={`form-input ${formErrors.dsn ? 'error' : ''}`}
                type="text"
                placeholder="YOUR_DSN_HERE"
                value={form.dsn}
                onChange={(e) => { setForm((p) => ({ ...p, dsn: e.target.value })); setFormErrors((p) => ({ ...p, dsn: null })); }}
                autoComplete="off"
              />
              {formErrors.dsn && <span className="form-error">⚠ {formErrors.dsn}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Unipile Access Token *</label>
              <input
                className={`form-input ${formErrors.accessToken ? 'error' : ''}`}
                type="password"
                placeholder="••••••••••••••••"
                value={form.accessToken}
                onChange={(e) => { setForm((p) => ({ ...p, accessToken: e.target.value })); setFormErrors((p) => ({ ...p, accessToken: null })); }}
                autoComplete="new-password"
              />
              {formErrors.accessToken && <span className="form-error">⚠ {formErrors.accessToken}</span>}
            </div>

            {formErrors.submit && (
              <div className={styles.submitError}>⚠ {formErrors.submit}</div>
            )}

            <div className={styles.formActions}>
              <Button variant="ghost" type="button" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={isSubmitting}>
                Connect Account
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Accounts;
