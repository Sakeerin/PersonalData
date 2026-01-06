'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { apiClient } from '@/lib/api/client';

export default function DSRPage() {
  const [exportJobs, setExportJobs] = useState<any[]>([]);
  const [retentionSummary, setRetentionSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryRes] = await Promise.all([
        apiClient.getRetentionSummary(),
      ]);
      setRetentionSummary(summaryRes.data);
    } catch (error) {
      console.error('Error loading DSR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestExport = async (format: 'zip' | 'json' | 'csv') => {
    try {
      const response = await apiClient.requestExport(format);
      alert(`Export job created. Job ID: ${response.data.job_id}`);
      // Poll for status
      checkExportStatus(response.data.job_id);
    } catch (error) {
      console.error('Error requesting export:', error);
      alert('Failed to request export');
    }
  };

  const checkExportStatus = async (jobId: string) => {
    try {
      const response = await apiClient.getExportStatus(jobId);
      if (response.data.status === 'completed') {
        // Download file
        const downloadRes = await apiClient.downloadExport(jobId);
        const blob = new Blob([downloadRes.data], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data_export_${jobId}.zip`;
        a.click();
      }
    } catch (error) {
      console.error('Error checking export status:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    if (!deletePassword) {
      alert('Password required');
      return;
    }

    if (!confirm('Are you absolutely sure? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.deleteAccount(deletePassword);
      alert('Account deletion initiated. You will be logged out.');
      await apiClient.logout();
      window.location.href = '/login';
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to delete account');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Data Subject Rights</h1>

        <div className="space-y-6">
          {/* Data Export */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Export Your Data</h2>
            <p className="text-sm text-gray-600 mb-4">
              Download all your data in a portable format (Right to Access & Portability)
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => handleRequestExport('zip')}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Export as ZIP
              </button>
              <button
                onClick={() => handleRequestExport('json')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Export as JSON
              </button>
              <button
                onClick={() => handleRequestExport('csv')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Export as CSV
              </button>
            </div>
          </div>

          {/* Retention Summary */}
          {retentionSummary && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Retention Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900">Records</h3>
                  <p className="text-sm text-gray-600">
                    Total: {retentionSummary.records?.total || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    With Policy: {retentionSummary.records?.with_policy || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    Expiring Soon: {retentionSummary.records?.expiring_soon || 0}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Files</h3>
                  <p className="text-sm text-gray-600">
                    Total: {retentionSummary.files?.total || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    With Policy: {retentionSummary.files?.with_policy || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    Expiring Soon: {retentionSummary.files?.expiring_soon || 0}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Account Deletion */}
          <div className="bg-white shadow rounded-lg p-6 border-2 border-red-200">
            <h2 className="text-xl font-semibold text-red-900 mb-4">Delete Account</h2>
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete your account and all data (Right to Erasure). This action cannot be undone.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type DELETE to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="DELETE"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter your password"
                />
              </div>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

