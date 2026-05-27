import React, { useState, useEffect, useCallback } from 'react';
import CampaignCard from '../components/campaigns/CampaignCard';
import CampaignForm from '../components/campaigns/CampaignForm';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { useCampaigns } from '../hooks/useCampaigns';
import { api } from '../api/client';
import styles from './Campaigns.module.css';

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'PAUSED', 'COMPLETED', 'STOPPED', 'DRAFT'];

const Campaigns = () => {
  const { campaigns, isLoading, error, refetch } = useCampaigns();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [accounts, setAccounts] = useState([]);
  const [actionError, setActionError] = useState(null);

  // Fetch accounts for the form dropdown
  useEffect(() => {
    api.get('/api/v1/accounts')
      .then((data) => setAccounts(Array.isArray(data) ? data : data?.accounts || []))
      .catch(() => setAccounts([]));
  }, []);

  const handleCreate = async (formData) => {
    await api.post('/api/v1/campaigns', formData);
    setShowModal(false);
    refetch();
  };

  const handlePause = useCallback(async (id) => {
    setActionError(null);
    try {
      await api.patch(`/api/v1/campaigns/${id}/pause`, {});
      refetch();
    } catch (err) {
      setActionError(err.message);
    }
  }, [refetch]);

  const handleResume = useCallback(async (id) => {
    setActionError(null);
    try {
      await api.patch(`/api/v1/campaigns/${id}/resume`, {});
      refetch();
    } catch (err) {
      setActionError(err.message);
    }
  }, [refetch]);

  const handleStop = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to stop this campaign? This cannot be undone.')) return;
    setActionError(null);
    try {
      await api.patch(`/api/v1/campaigns/${id}/stop`, {});
      refetch();
    } catch (err) {
      setActionError(err.message);
    }
  }, [refetch]);

  // Filtering
  const filtered = campaigns.filter((c) => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={`skeleton ${styles.skeletonTitle}`} />
          <div className={`skeleton ${styles.skeletonBtn}`} />
        </div>
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.skeletonCard}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Campaigns</h1>
          <p className={styles.subtitle}>{campaigns.length} total · {campaigns.filter(c => c.status === 'ACTIVE').length} active</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          + New Campaign
        </Button>
      </div>

      {/* Error Banner */}
      {(error || actionError) && (
        <div className={styles.errorBanner}>
          <span>⚠</span> {error || actionError}
        </div>
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearBtn} onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className={styles.statusFilters}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              className={`${styles.filterPill} ${statusFilter === s ? styles.filterPillActive : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign Grid */}
      {filtered.length === 0 ? (
        <div className={`glass-card ${styles.emptyState}`}>
          <span className={styles.emptyIcon}>{campaigns.length === 0 ? '🚀' : '🔍'}</span>
          <p className={styles.emptyTitle}>
            {campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns match your filters'}
          </p>
          <p className={styles.emptyDesc}>
            {campaigns.length === 0
              ? 'Create your first campaign to start reaching LinkedIn prospects.'
              : 'Try changing the search query or status filter.'}
          </p>
          {campaigns.length === 0 && (
            <Button variant="primary" onClick={() => setShowModal(true)}>
              Create First Campaign
            </Button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Campaign"
        size="lg"
      >
        <CampaignForm
          accounts={accounts}
          onSubmit={handleCreate}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
};

export default Campaigns;
