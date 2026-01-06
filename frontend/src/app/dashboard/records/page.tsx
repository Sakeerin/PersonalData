'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';

export default function RecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadRecords();
  }, [page]);

  const loadRecords = async () => {
    try {
      const response = await apiClient.getRecords({ page, limit: 50 });
      setRecords(response.data.records || []);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold text-gray-900">Records</h1>
          <Link
            href="/dashboard/records/new"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Create Record
          </Link>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No records yet. Create your first record to get started.</p>
            <Link
              href="/dashboard/records/new"
              className="mt-4 inline-block px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Create Record
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {records.map((record) => (
                <li key={record.id}>
                  <Link
                    href={`/dashboard/records/${record.id}`}
                    className="block hover:bg-gray-50 px-4 py-4 sm:px-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-medium">
                              {record.type?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{record.type}</div>
                          <div className="text-sm text-gray-500">
                            {record.tags?.join(', ') || 'No tags'}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(record.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
}

