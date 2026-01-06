'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
// Simple icon components (since we don't have heroicons)
const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface SecurityStatus {
  mfaEnabled: boolean;
  recoveryCodesSet: boolean;
  trustedDevices: number;
}

export default function SecurityChecklist() {
  const [status, setStatus] = useState<SecurityStatus>({
    mfaEnabled: false,
    recoveryCodesSet: false,
    trustedDevices: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityStatus();
  }, []);

  const loadSecurityStatus = async () => {
    try {
      // In a real implementation, you'd have a /auth/me endpoint
      // For now, we'll check devices
      const devicesRes = await apiClient.getDevices();
      const trustedDevices = devicesRes.data.devices?.filter((d: any) => d.trusted).length || 0;

      setStatus({
        mfaEnabled: false, // Would come from user profile
        recoveryCodesSet: true, // Would check if codes exist
        trustedDevices,
      });
    } catch (error) {
      console.error('Error loading security status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading security status...</div>;
  }

  const items = [
    {
      label: 'Multi-Factor Authentication',
      status: status.mfaEnabled,
      action: status.mfaEnabled ? null : 'Enable MFA',
      href: '/dashboard/settings/mfa',
    },
    {
      label: 'Recovery Codes',
      status: status.recoveryCodesSet,
      action: status.recoveryCodesSet ? null : 'Generate Recovery Codes',
      href: '/dashboard/settings/recovery',
    },
    {
      label: 'Trusted Devices',
      status: status.trustedDevices > 0,
      action: status.trustedDevices === 0 ? 'Review Devices' : null,
      href: '/dashboard/devices',
    },
  ];

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Checklist</h2>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex items-center justify-between">
            <div className="flex items-center">
              {item.status ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
              ) : (
                <XCircleIcon className="h-5 w-5 text-red-500 mr-3" />
              )}
              <span className={item.status ? 'text-gray-900' : 'text-gray-500'}>
                {item.label}
              </span>
            </div>
            {item.action && (
              <a
                href={item.href}
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                {item.action}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

