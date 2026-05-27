import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { api } from '../api/client';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [campaignsData] = await Promise.all([
          api.get('/api/v1/campaigns'),
        ]);

        const campaigns = Array.isArray(campaignsData)
          ? campaignsData
          : campaignsData?.campaigns || [];

        const totalLeadsSent = campaigns.reduce((sum, c) => sum + (c.sentLeads || 0), 0);
        const totalLeads = campaigns.reduce((sum, c) => sum + (c.totalLeads || 0), 0);
        const successRate = totalLeads > 0
          ? Math.round((totalLeadsSent / totalLeads) * 100)
          : 0;

        setStats({
          total: campaigns.length,
          active: campaigns.filter((c) => c.status === 'ACTIVE' || c.status === 'RUNNING').length,
          totalLeadsSent,
          successRate,
        });
        setRecentCampaigns(campaigns.slice(0, 5));
      } catch (err) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.statsGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.statSkeleton}`} />
          ))}
        </div>
        <div className={`skeleton ${styles.tableSkeleton}`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBanner}>
          <span>⚠</span> {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Greeting */}
      <div className={styles.greeting}>
        <div>
          <h2 className={styles.greetTitle}>Good {getTimeOfDay()} 👋</h2>
          <p className={styles.greetSub}>Here's what's happening with your campaigns today.</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/campaigns')}>
          + New Campaign
        </Button>
      </div>

      {/* Stat Cards */}
      <div className={styles.statsGrid}>
        <StatCard
          icon="📋"
          label="Total Campaigns"
          value={stats?.total ?? 0}
          color="#6366f1"
        />
        <StatCard
          icon="⚡"
          label="Active Campaigns"
          value={stats?.active ?? 0}
          color="#10b981"
        />
        <StatCard
          icon="📤"
          label="Total Leads Sent"
          value={(stats?.totalLeadsSent ?? 0).toLocaleString()}
          color="#8b5cf6"
        />
        <StatCard
          icon="🎯"
          label="Success Rate"
          value={`${stats?.successRate ?? 0}%`}
          color="#f59e0b"
        />
      </div>

      {/* Recent Campaigns */}
      <div className={`glass-card ${styles.recentCard}`}>
        <div className={styles.recentHeader}>
          <h3 className={styles.recentTitle}>Recent Campaigns</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
            View all →
          </Button>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <span className="empty-state-icon">🚀</span>
            <p className="empty-state-title">No campaigns yet</p>
            <p className="empty-state-desc">Create your first campaign to start reaching prospects.</p>
            <Button variant="primary" size="sm" onClick={() => navigate('/campaigns')}>
              Create Campaign
            </Button>
          </div>
        ) : (
          <div className={styles.recentTable}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Sent / Total</th>
                  <th>Daily Cap</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map((c) => (
                  <tr
                    key={c.id}
                    className={styles.recentRow}
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                  >
                    <td className={styles.recentName}>{c.name}</td>
                    <td><Badge status={c.mode} /></td>
                    <td><Badge status={c.status} /></td>
                    <td className={styles.recentCount}>{c.sentLeads ?? 0} / {c.totalLeads ?? 0}</td>
                    <td className={styles.recentCount}>{c.dailyCap ?? '—'}</td>
                    <td className={styles.recentArrow}>→</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

export default Dashboard;
