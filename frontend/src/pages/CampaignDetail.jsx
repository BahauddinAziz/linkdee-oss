import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import CampaignForm from '../components/campaigns/CampaignForm';
import LogTerminal from '../components/campaigns/LogTerminal';
import LeadTable from '../components/leads/LeadTable';
import CSVUploader from '../components/leads/CSVUploader';
import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';
import styles from './CampaignDetail.module.css';

const TABS = ['Overview', 'Leads', 'Logs'];

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState('Overview');
  const [campaign, setCampaign] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeadsLoading, setIsLeadsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [csvResult, setCsvResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [addLeadForm, setAddLeadForm] = useState({ profileUrl: '', firstName: '', lastName: '', company: '' });
  const [addLeadError, setAddLeadError] = useState(null);
  const [isAddingLead, setIsAddingLead] = useState(false);

  // Fetch campaign
  const fetchCampaign = useCallback(async () => {
    try {
      const data = await api.get(`/api/v1/campaigns/${id}`);
      setCampaign(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    setIsLeadsLoading(true);
    try {
      const data = await api.get(`/api/v1/campaigns/${id}/leads`);
      setLeads(Array.isArray(data) ? data : data?.leads || []);
    } catch {
      setLeads([]);
    } finally {
      setIsLeadsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setIsLoading(true);
    fetchCampaign();
    api.get('/api/v1/accounts')
      .then((data) => setAccounts(Array.isArray(data) ? data : data?.accounts || []))
      .catch(() => setAccounts([]));
  }, [fetchCampaign]);

  useEffect(() => {
    if (tab === 'Leads') fetchLeads();
  }, [tab, fetchLeads]);

  // Polled logs
  const fetchLogs = useCallback(
    () => api.get(`/api/v1/campaigns/${id}/logs`),
    [id]
  );
  const { data: logsData } = usePolling(
    fetchLogs,
    tab === 'Logs' ? 3000 : 999999
  );
  const logs = Array.isArray(logsData) ? logsData : logsData?.logs || [];

  // Actions
  const handleAction = async (action) => {
    setActionError(null);
    setActionLoading(action);
    try {
      if (action === 'start')  await api.patch(`/api/v1/campaigns/${id}/start`, {});
      if (action === 'pause')  await api.patch(`/api/v1/campaigns/${id}/pause`, {});
      if (action === 'resume') await api.patch(`/api/v1/campaigns/${id}/resume`, {});
      if (action === 'stop') {
        if (!window.confirm('Stop this campaign? This action cannot be undone.')) {
          setActionLoading(null);
          return;
        }
        await api.patch(`/api/v1/campaigns/${id}/stop`, {});
      }
      await fetchCampaign();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Update campaign
  const handleUpdate = async (formData) => {
    await api.patch(`/api/v1/campaigns/${id}`, formData);
    await fetchCampaign();
  };

  // CSV Upload
  const handleCsvUpload = async (file) => {
    setIsUploading(true);
    setCsvResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await api.upload(`/api/v1/campaigns/${id}/leads/import`, fd);
      setCsvResult({ imported: result.imported ?? result.count ?? 0, skipped: result.skipped ?? 0 });
      fetchLeads();
    } catch (err) {
      setCsvResult({ error: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  // Add Single Lead
  const handleAddLead = async (e) => {
    e.preventDefault();
    if (!addLeadForm.profileUrl.trim()) {
      setAddLeadError('Profile URL is required');
      return;
    }
    setIsAddingLead(true);
    setAddLeadError(null);
    try {
      await api.post(`/api/v1/campaigns/${id}/leads`, addLeadForm);
      setAddLeadForm({ profileUrl: '', firstName: '', lastName: '', company: '' });
      fetchLeads();
    } catch (err) {
      setAddLeadError(err.message);
    } finally {
      setIsAddingLead(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={`skeleton ${styles.skeletonHeader}`} />
        <div className={styles.statsGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.skeletonStat}`} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className={styles.page}>
        <Button variant="ghost" onClick={() => navigate('/campaigns')}>← Back</Button>
        <div className={styles.errorBanner}>⚠ {error || 'Campaign not found'}</div>
      </div>
    );
  }

  const progress = campaign.totalLeads > 0
    ? Math.round((campaign.sentLeads / campaign.totalLeads) * 100)
    : 0;

  return (
    <div className={styles.page}>
      {/* Back */}
      <button className={styles.backBtn} onClick={() => navigate('/campaigns')}>
        ← All Campaigns
      </button>

      {/* Campaign Header */}
      <div className={styles.campaignHeader}>
        <div className={styles.campaignMeta}>
          <h1 className={styles.campaignName}>{campaign.name}</h1>
          <div className={styles.campaignBadges}>
            <Badge status={`${campaign.steps?.length || 1}-Step Sequence`} />
            <Badge status={campaign.status} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionRow}>
          {actionError && <span className={styles.actionErr}>⚠ {actionError}</span>}
          {(campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED') && (
            <Button
              variant="primary"
              size="sm"
              loading={actionLoading === 'start'}
              onClick={() => handleAction('start')}
            >
              ▶ Start
            </Button>
          )}
          {(campaign.status === 'ACTIVE' || campaign.status === 'RUNNING') && (
            <Button
              variant="secondary"
              size="sm"
              loading={actionLoading === 'pause'}
              onClick={() => handleAction('pause')}
            >
              ⏸ Pause
            </Button>
          )}
          {campaign.status === 'PAUSED' && (
            <Button
              variant="secondary"
              size="sm"
              loading={actionLoading === 'resume'}
              onClick={() => handleAction('resume')}
            >
              ▶ Resume
            </Button>
          )}
          {campaign.status !== 'STOPPED' && campaign.status !== 'COMPLETED' && (
            <Button
              variant="danger"
              size="sm"
              loading={actionLoading === 'stop'}
              onClick={() => handleAction('stop')}
            >
              ⏹ Stop
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <StatCard icon="📤" label="Sent" value={campaign.sentLeads ?? 0} color="#6366f1" />
        <StatCard icon="👥" label="Total Leads" value={campaign.totalLeads ?? 0} color="#8b5cf6" />
        <StatCard icon="📅" label="Today" value={campaign.sentToday ?? 0} color="#10b981" />
        <StatCard icon="🎯" label="Progress" value={`${progress}%`} color="#f59e0b" />
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        {TABS.map((t) => (
          <button
            key={t}
            className={`${styles.tabBtn} ${tab === t ? styles.tabBtnActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* ===== OVERVIEW ===== */}
        {tab === 'Overview' && (
          <div className={`glass-card ${styles.formWrap}`}>
            <h3 className={styles.sectionTitle}>Campaign Settings</h3>
            <CampaignForm
              initialData={campaign}
              accounts={accounts}
              onSubmit={handleUpdate}
            />
          </div>
        )}

        {/* ===== LEADS ===== */}
        {tab === 'Leads' && (
          <div className={styles.leadsSection}>
            {/* Add Single Lead */}
            <div className={`glass-card ${styles.addLeadCard}`}>
              <h3 className={styles.sectionTitle}>Add Single Lead</h3>
              <form className={styles.addLeadForm} onSubmit={handleAddLead}>
                <input
                  className="form-input"
                  type="url"
                  placeholder="LinkedIn Profile URL *"
                  value={addLeadForm.profileUrl}
                  onChange={(e) => setAddLeadForm((p) => ({ ...p, profileUrl: e.target.value }))}
                />
                <input
                  className="form-input"
                  type="text"
                  placeholder="First Name"
                  value={addLeadForm.firstName}
                  onChange={(e) => setAddLeadForm((p) => ({ ...p, firstName: e.target.value }))}
                />
                <input
                  className="form-input"
                  type="text"
                  placeholder="Last Name"
                  value={addLeadForm.lastName}
                  onChange={(e) => setAddLeadForm((p) => ({ ...p, lastName: e.target.value }))}
                />
                <input
                  className="form-input"
                  type="text"
                  placeholder="Company"
                  value={addLeadForm.company}
                  onChange={(e) => setAddLeadForm((p) => ({ ...p, company: e.target.value }))}
                />
                <Button variant="primary" size="sm" type="submit" loading={isAddingLead}>
                  Add Lead
                </Button>
              </form>
              {addLeadError && <span className="form-error">⚠ {addLeadError}</span>}
            </div>

            {/* CSV Uploader */}
            <div className={`glass-card ${styles.csvCard}`}>
              <h3 className={styles.sectionTitle}>Import CSV</h3>
              <CSVUploader
                onUpload={handleCsvUpload}
                result={csvResult}
                isUploading={isUploading}
              />
            </div>

            {/* Lead Table */}
            <div className={`glass-card ${styles.tableCard}`}>
              <div className={styles.tableHeader}>
                <h3 className={styles.sectionTitle}>Leads ({leads.length})</h3>
                <Button variant="ghost" size="sm" onClick={fetchLeads}>↻ Refresh</Button>
              </div>
              <LeadTable leads={leads} isLoading={isLeadsLoading} />
            </div>
          </div>
        )}

        {/* ===== LOGS ===== */}
        {tab === 'Logs' && (
          <div className={styles.logsSection}>
            <div className={styles.logsHeader}>
              <p className={styles.logsNote}>
                <span className={styles.pulsingDot} /> Live — refreshing every 3 seconds
              </p>
            </div>
            <LogTerminal logs={logs} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignDetail;
