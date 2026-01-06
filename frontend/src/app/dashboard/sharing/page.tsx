'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { apiClient } from '@/lib/api/client';

export default function SharingPage() {
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShares();
  }, []);

  const loadShares = async () => {
    try {
      const response = await apiClient.getShares();
      setShares(response.data.shares || []);
    } catch (error) {
      console.error('Error loading shares:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    if (!confirm('Are you sure you want to revoke this share?')) {
      return;
    }

    try {
      await apiClient.revokeShare(shareId);
      loadShares();
    } catch (error) {
      console.error('Error revoking share:', error);
      alert('Failed to revoke share');
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
          <h1 className="text-3xl font-bold text-gray-900">Sharing</h1>
          <Link
            href="/dashboard/sharing/new"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Create Share
          </Link>
        </div>

        {shares.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No active shares</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {shares.map((share) => (
                <li key={share.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {share.resource_type} • {share.share_type}
                      </div>
                      <div className="text-sm text-gray-500">
                        Purpose: {share.purpose || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Expires: {share.expires_at ? new Date(share.expires_at).toLocaleString() : 'Never'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(share.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                    >
                      Revoke
                    </button>
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

