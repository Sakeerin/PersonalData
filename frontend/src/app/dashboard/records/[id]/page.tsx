'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { apiClient } from '@/lib/api/client';
import { decryptText, deserializeEncrypted } from '@/lib/crypto/vaultCrypto';

export default function RecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const recordId = params.id as string;
  const [record, setRecord] = useState<any>(null);
  const [decryptedData, setDecryptedData] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRecord();
  }, [recordId]);

  const loadRecord = async () => {
    try {
      const response = await apiClient.getRecord(recordId);
      setRecord(response.data);

      // Note: In a real implementation, you would:
      // 1. Get the wrapped DEK from the server
      // 2. Unwrap it with your KEK (derived from password)
      // 3. Decrypt the data
      // For MVP, we'll show encrypted data indicator
      setDecryptedData('[Encrypted - Decryption requires KEK]');
    } catch (error: any) {
      setError(error.response?.data?.error?.message || 'Failed to load record');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      await apiClient.deleteRecord(recordId);
      router.push('/dashboard/records');
    } catch (error: any) {
      setError(error.response?.data?.error?.message || 'Failed to delete record');
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

  if (error && !record) {
    return (
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Record Details</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => router.push(`/dashboard/records/${recordId}/edit`)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <p className="mt-1 text-sm text-gray-900">{record.type}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tags</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {record.tags?.map((tag: string, i: number) => (
                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Data</label>
            <div className="mt-1 p-4 bg-gray-50 rounded border">
              <p className="text-sm text-gray-600 font-mono break-all">{decryptedData}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Created</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(record.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Updated</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(record.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

