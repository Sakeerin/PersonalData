'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { apiClient } from '@/lib/api/client';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    try {
      const response = await apiClient.getAuditLogs({ page, limit: 50 });
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiClient.exportAuditLogs('json');
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${Date.now()}.json`;
      a.click();
    } catch (error) {
      console.error('Error exporting audit logs:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Export
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {logs.map((log) => (
              <li key={log.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{log.event_type}</div>
                    <div className="text-sm text-gray-500">
                      {log.action} • {log.resource_type || 'N/A'} • {log.ip_address || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
}

