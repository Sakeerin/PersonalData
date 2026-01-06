'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { apiClient } from '@/lib/api/client';

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await apiClient.getDevices();
      setDevices(response.data.devices || []);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke this device? It will no longer be able to access your vault.')) {
      return;
    }

    try {
      await apiClient.revokeDevice(deviceId);
      loadDevices();
    } catch (error) {
      console.error('Error revoking device:', error);
      alert('Failed to revoke device');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Devices</h1>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {devices.map((device) => (
              <li key={device.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{device.device_name}</div>
                    <div className="text-sm text-gray-500">
                      {device.trusted ? (
                        <span className="text-green-600">Trusted</span>
                      ) : (
                        <span className="text-yellow-600">Not Trusted</span>
                      )}
                      {' • '}
                      Last seen: {new Date(device.last_seen).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(device.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
}

