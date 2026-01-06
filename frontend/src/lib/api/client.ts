/**
 * API client for backend communication
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export class ApiClient {
  private axiosClient: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.axiosClient = axios.create({
      baseURL: `${API_URL}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.axiosClient.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.axiosClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, try refresh
          const refreshToken = this.getRefreshToken();
          if (refreshToken) {
            try {
              const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
                refresh_token: refreshToken,
              });
              this.setTokens(response.data.access_token, response.data.refresh_token);
              // Retry original request
              if (error.config) {
                error.config.headers.Authorization = `Bearer ${response.data.access_token}`;
                return this.axiosClient.request(error.config);
              }
            } catch (refreshError) {
              // Refresh failed, clear tokens
              this.clearTokens();
              if (typeof window !== 'undefined') {
                window.location.href = '/login';
              }
            }
          } else {
            this.clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Getter for axios client
  get client() {
    return this.axiosClient;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  getAccessToken(): string | null {
    if (this.accessToken) return this.accessToken;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  setRefreshToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', token);
    }
  }

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  // Auth endpoints
  async register(data: { email: string; password: string; device_name: string }) {
    const response = await this.axiosClient.post('/auth/register', data);
    if (response.data.access_token) {
      this.setTokens(response.data.access_token, response.data.refresh_token);
    }
    return response.data;
  }

  async login(data: { email: string; password: string; mfa_code?: string; device_name: string }) {
    const response = await this.axiosClient.post('/auth/login', data);
    if (response.data.access_token) {
      this.setTokens(response.data.access_token, response.data.refresh_token);
    }
    return response.data;
  }

  async logout() {
    this.clearTokens();
  }

  // Vault endpoints
  async getRecords(params?: any) {
    return this.axiosClient.get('/vault/records', { params });
  }

  async createRecord(data: any) {
    return this.axiosClient.post('/vault/records', data);
  }

  async getRecord(id: string) {
    return this.axiosClient.get(`/vault/records/${id}`);
  }

  async updateRecord(id: string, data: any) {
    return this.axiosClient.put(`/vault/records/${id}`, data);
  }

  async deleteRecord(id: string) {
    return this.axiosClient.delete(`/vault/records/${id}`);
  }

  async getFiles(params?: any) {
    return this.axiosClient.get('/vault/files', { params });
  }

  async uploadFile(file: File, metadata: any) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('encrypted_metadata', JSON.stringify(metadata));
    formData.append('mime_type', file.type);
    return this.axiosClient.post('/vault/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async downloadFile(id: string) {
    return this.axiosClient.get(`/vault/files/${id}`, { responseType: 'blob' });
  }

  async deleteFile(id: string) {
    return this.axiosClient.delete(`/vault/files/${id}`);
  }

  async search(query: string, params?: any) {
    return this.axiosClient.get('/vault/search', { params: { q: query, ...params } });
  }

  // Sharing endpoints
  async createShare(data: any) {
    return this.axiosClient.post('/sharing/share', data);
  }

  async getShares(params?: any) {
    return this.axiosClient.get('/sharing/shares', { params });
  }

  async revokeShare(id: string) {
    return this.axiosClient.delete(`/sharing/shares/${id}`);
  }

  // Devices & Sessions
  async getDevices() {
    return this.axiosClient.get('/auth/devices');
  }

  async revokeDevice(id: string) {
    return this.axiosClient.delete(`/auth/devices/${id}`);
  }

  async getSessions() {
    return this.axiosClient.get('/auth/sessions');
  }

  async revokeSession(id: string) {
    return this.axiosClient.delete(`/auth/sessions/${id}`);
  }

  // Alerts
  async getAlerts(params?: any) {
    return this.axiosClient.get('/alerts', { params });
  }

  async acknowledgeAlert(id: string) {
    return this.axiosClient.post(`/alerts/${id}/acknowledge`);
  }

  async resolveAlert(id: string) {
    return this.axiosClient.post(`/alerts/${id}/resolve`);
  }

  async triggerPanicMode(reason: string) {
    return this.axiosClient.post('/alerts/panic', { reason });
  }

  // Audit
  async getAuditLogs(params?: any) {
    return this.axiosClient.get('/audit/logs', { params });
  }

  async exportAuditLogs(format: 'json' | 'csv' = 'json') {
    return this.axiosClient.get('/audit/export', { params: { format }, responseType: 'blob' });
  }

  // DSR
  async requestExport(format: 'zip' | 'json' | 'csv' = 'zip') {
    return this.axiosClient.post('/dsr/export', {}, { params: { format } });
  }

  async getExportStatus(jobId: string) {
    return this.axiosClient.get(`/dsr/export/${jobId}`);
  }

  async downloadExport(jobId: string) {
    return this.axiosClient.get(`/dsr/export/${jobId}/download`, { responseType: 'blob' });
  }

  async deleteAccount(password: string) {
    return this.axiosClient.post('/dsr/delete-account', { password, confirmation: 'DELETE' });
  }

  async getRetentionSummary() {
    return this.axiosClient.get('/dsr/retention');
  }

  async setRecordRetention(recordId: string, policy: any) {
    return this.axiosClient.put(`/dsr/retention/records/${recordId}`, policy);
  }

  async setFileRetention(fileId: string, policy: any) {
    return this.axiosClient.put(`/dsr/retention/files/${fileId}`, policy);
  }

  // MFA
  async enableMFA() {
    return this.axiosClient.post('/auth/mfa/enable');
  }

  async verifyMFA(code: string) {
    return this.axiosClient.post('/auth/mfa/verify', { code });
  }
}

// Singleton instance
export const apiClient = new ApiClient();

