'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';

export default function FilesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadFiles();
  }, [page]);

  const loadFiles = async () => {
    try {
      const response = await apiClient.getFiles({ page, limit: 50 });
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
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
          <h1 className="text-3xl font-bold text-gray-900">Files</h1>
          <Link
            href="/dashboard/files/upload"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Upload File
          </Link>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No files yet. Upload your first file to get started.</p>
            <Link
              href="/dashboard/files/upload"
              className="mt-4 inline-block px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Upload File
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {files.map((file) => (
                <li key={file.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-600 text-xs">FILE</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {file.mime_type || 'Unknown type'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatFileSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={async () => {
                          try {
                            const response = await apiClient.downloadFile(file.id);
                            const blob = new Blob([response.data]);
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `file_${file.id}`;
                            a.click();
                          } catch (error) {
                            console.error('Error downloading file:', error);
                            alert('Failed to download file');
                          }
                        }}
                        className="text-sm text-primary-600 hover:text-primary-800"
                      >
                        Download
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this file?')) {
                            try {
                              await apiClient.deleteFile(file.id);
                              loadFiles();
                            } catch (error) {
                              console.error('Error deleting file:', error);
                              alert('Failed to delete file');
                            }
                          }
                        }}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
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

