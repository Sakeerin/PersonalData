'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { apiClient } from '@/lib/api/client';
import { encryptData, generateDEK, serializeEncrypted } from '@/lib/crypto/vaultCrypto';

export default function UploadFilePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      // Generate DEK and encrypt file
      const dek = await generateDEK();
      const encrypted = await encryptData(fileData, dek);
      const encryptedBuffer = Buffer.from(serializeEncrypted(encrypted));

      // Create a Blob from encrypted data
      const encryptedBlob = new Blob([encryptedBuffer], { type: 'application/octet-stream' });
      const encryptedFile = new File([encryptedBlob], file.name + '.encrypted', { type: 'application/octet-stream' });

      // Upload encrypted file
      await apiClient.uploadFile(encryptedFile, {
        original_name: file.name,
        original_size: file.size,
        original_type: file.type,
      });

      router.push('/dashboard/files');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Upload File</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700">
              Select File
            </label>
            <input
              id="file"
              type="file"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Your file will be encrypted client-side before upload. The server cannot read your file contents.
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading || !file}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload File'}
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

