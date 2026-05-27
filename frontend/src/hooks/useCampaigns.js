import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

/**
 * useCampaigns — Fetch and manage the list of campaigns.
 * Returns: { campaigns, isLoading, error, refetch }
 */
export const useCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get('/api/v1/campaigns');
      setCampaigns(Array.isArray(data) ? data : data?.campaigns || []);
    } catch (err) {
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    isLoading,
    error,
    refetch: fetchCampaigns,
  };
};
