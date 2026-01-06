'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/lib/store/authStore';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [stats, setStats] = useState({
    records: 0,
    files: 0,
    activeShares: 0,
    alerts: 0,
  });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
    }
  }, [isAuthenticated]);

  const loadStats = async () => {
    try {
      const [recordsRes, filesRes, sharesRes, alertsRes] = await Promise.all([
        apiClient.getRecords({ limit: 1 }),
        apiClient.getFiles({ limit: 1 }),
        apiClient.getShares(),
        apiClient.getAlerts({ status: 'active', limit: 1 }),
      ]);

      setStats({
        records: recordsRes.data.pagination?.total || 0,
        files: filesRes.data.pagination?.total || 0,
        activeShares: sharesRes.data.shares?.length || 0,
        alerts: alertsRes.data.pagination?.total || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl font-bold text-gray-900">{stats.records}</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Records</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      <Link href="/dashboard/records" className="text-primary-600 hover:text-primary-500">
                        View all
                      </Link>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl font-bold text-gray-900">{stats.files}</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Files</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      <Link href="/dashboard/files" className="text-primary-600 hover:text-primary-500">
                        View all
                      </Link>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl font-bold text-gray-900">{stats.activeShares}</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Shares</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      <Link href="/dashboard/sharing" className="text-primary-600 hover:text-primary-500">
                        Manage
                      </Link>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl font-bold text-gray-900">{stats.alerts}</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Alerts</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      <Link href="/dashboard/alerts" className="text-primary-600 hover:text-primary-500">
                        View
                      </Link>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/dashboard/records/new"
              className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50"
            >
              <h3 className="font-medium text-gray-900">Create Record</h3>
              <p className="text-sm text-gray-500 mt-1">Add a new data record</p>
            </Link>
            <Link
              href="/dashboard/files/upload"
              className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50"
            >
              <h3 className="font-medium text-gray-900">Upload File</h3>
              <p className="text-sm text-gray-500 mt-1">Upload an encrypted file</p>
            </Link>
            <Link
              href="/dashboard/sharing/new"
              className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50"
            >
              <h3 className="font-medium text-gray-900">Share Data</h3>
              <p className="text-sm text-gray-500 mt-1">Share with delegate or app</p>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

