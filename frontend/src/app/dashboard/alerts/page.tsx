'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { apiClient } from '@/lib/api/client';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  const loadAlerts = async () => {
    try {
      const params: any = { limit: 50 };
      if (filter !== 'all') {
        params.status = filter;
      }
      const response = await apiClient.getAlerts(params);
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await apiClient.acknowledgeAlert(alertId);
      loadAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await apiClient.resolveAlert(alertId);
      loadAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'warn':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 rounded ${filter === 'active' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('acknowledged')}
              className={`px-3 py-1 rounded ${filter === 'acknowledged' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
            >
              Acknowledged
            </button>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No alerts</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {alerts.map((alert) => (
                <li key={alert.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className="ml-3 text-sm text-gray-500">{alert.status}</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-900">{alert.message}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {alert.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="px-3 py-1 text-sm text-primary-600 hover:text-primary-800"
                          >
                            Acknowledge
                          </button>
                          <button
                            onClick={() => handleResolve(alert.id)}
                            className="px-3 py-1 text-sm text-green-600 hover:text-green-800"
                          >
                            Resolve
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
}

