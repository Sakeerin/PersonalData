'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { apiClient } from '@/lib/api/client';

export default function NewSharePage() {
  const router = useRouter();
  const [resourceType, setResourceType] = useState<'record' | 'file'>('record');
  const [resourceId, setResourceId] = useState('');
  const [shareType, setShareType] = useState<'delegate' | 'app' | 'link'>('link');
  const [expiresAt, setExpiresAt] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.createShare({
        resource_type: resourceType,
        resource_id: resourceId,
        share_type: shareType,
        expires_at: expiresAt || undefined,
        purpose,
        permissions: [
          {
            action: 'read',
            conditions: {}
          }
        ]
      });

      alert(`Share created! Token: ${response.data.token}`);
      router.push('/dashboard/sharing');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create share');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Share</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <label htmlFor="resourceType" className="block text-sm font-medium text-gray-700">
              Resource Type
            </label>
            <select
              id="resourceType"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value as 'record' | 'file')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="record">Record</option>
              <option value="file">File</option>
            </select>
          </div>

          <div>
            <label htmlFor="resourceId" className="block text-sm font-medium text-gray-700">
              Resource ID
            </label>
            <input
              id="resourceId"
              type="text"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter resource ID"
              required
            />
          </div>

          <div>
            <label htmlFor="shareType" className="block text-sm font-medium text-gray-700">
              Share Type
            </label>
            <select
              id="shareType"
              value={shareType}
              onChange={(e) => setShareType(e.target.value as 'delegate' | 'app' | 'link')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="link">Link (One-time)</option>
              <option value="delegate">Delegate (Person)</option>
              <option value="app">App (OAuth)</option>
            </select>
          </div>

          <div>
            <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700">
              Expires At (optional)
            </label>
            <input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">
              Purpose
            </label>
            <textarea
              id="purpose"
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Describe the purpose of this share"
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Share'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

