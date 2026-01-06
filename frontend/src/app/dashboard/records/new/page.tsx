'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { apiClient } from '@/lib/api/client';
import { encryptText, generateDEK, wrapDEK } from '@/lib/crypto/vaultCrypto';

export default function NewRecordPage() {
  const router = useRouter();
  const [type, setType] = useState('identity');
  const [data, setData] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Generate DEK
      const dek = await generateDEK();
      
      // Encrypt data
      const encryptedData = await encryptText(data, dek);
      
      // Get KEK from storage (in real implementation, derive from password)
      // For MVP, we'll need to store KEK in sessionStorage or derive on each operation
      // This is a simplified version - in production, KEK management is more complex
      
      // For now, we'll send encrypted data (client-side encryption)
      // The server will store it as-is
      const response = await apiClient.createRecord({
        type,
        encrypted_data: encryptedData,
        encrypted_metadata: {},
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        labels: [],
      });

      router.push(`/dashboard/records/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Record</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="identity">Identity</option>
              <option value="passport">Passport</option>
              <option value="bank_account">Bank Account</option>
              <option value="insurance">Insurance</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="data" className="block text-sm font-medium text-gray-700">
              Data (will be encrypted)
            </label>
            <textarea
              id="data"
              rows={10}
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter your data here..."
            />
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
              Tags (comma-separated)
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="important, personal, etc."
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Record'}
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

