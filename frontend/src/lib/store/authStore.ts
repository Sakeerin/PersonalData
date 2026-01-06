/**
 * Authentication state management
 */

import { create } from 'zustand';
import { apiClient } from '../api/client';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  register: (email: string, password: string, deviceName: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string, mfaCode?: string) => {
    const deviceName = navigator.userAgent;
    const response = await apiClient.login({ email, password, mfa_code: mfaCode, device_name: deviceName });
    set({ user: { id: response.user_id, email }, isAuthenticated: true, isLoading: false });
  },

  register: async (email: string, password: string, deviceName: string) => {
    const response = await apiClient.register({ email, password, device_name: deviceName });
    set({ user: { id: response.user_id, email }, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await apiClient.logout();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    const token = apiClient.getAccessToken();
    if (token) {
      // Verify token is valid by making a test request
      try {
        // You could add a /auth/me endpoint to verify token
        set({ isAuthenticated: true, isLoading: false });
      } catch {
        set({ isAuthenticated: false, isLoading: false });
      }
    } else {
      set({ isAuthenticated: false, isLoading: false });
    }
  },
}));

