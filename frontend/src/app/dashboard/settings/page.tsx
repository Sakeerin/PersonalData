'use client';

import Layout from '@/components/Layout';
import SecurityChecklist from '@/components/SecurityChecklist';
import { useState } from 'react';
import { apiClient } from '@/lib/api/client';

export default function SettingsPage() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const handleEnableMFA = async () => {
    try {
      const response = await apiClient.enableMFA();
      setMfaSecret(response.data.secret);
      setQrCodeUrl(response.data.qr_code_url);
    } catch (error) {
      console.error('Error enabling MFA:', error);
    }
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>

        <div className="space-y-6">
          <SecurityChecklist />

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Multi-Factor Authentication</h2>
            {!mfaEnabled ? (
              <div>
                <p className="text-gray-600 mb-4">
                  Add an extra layer of security to your account with MFA.
                </p>
                {!mfaSecret ? (
                  <button
                    onClick={handleEnableMFA}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Enable MFA
                  </button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Scan this QR code with your authenticator app:
                    </p>
                    {qrCodeUrl && (
                      <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
                    )}
                    <p className="text-sm font-mono text-gray-900">{mfaSecret}</p>
                    <p className="text-sm text-gray-600">
                      Enter the code from your authenticator app to complete setup.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-green-600 mb-4">✓ MFA is enabled</p>
                <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                  Disable MFA
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

