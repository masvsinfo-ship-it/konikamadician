// Storage Service using MongoDB Backend API
// This calls the Express server which interacts with MongoDB.

export interface UserProfile {
  name: string;
  shopName: string;
  address: string;
  mobile: string;
  profilePic?: string;
}

export interface UserAccount {
  loginId: string;
  password: string;
  profile: UserProfile;
  data: any;
}

const API_URL = '/api';

export const storageService = {
  // Register a new user
  register: async (account: Omit<UserAccount, 'data'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'সার্ভার সংযোগে সমস্যা' };
    }
  },

  // Login a user
  login: async (loginId: string, password: string): Promise<{ success: boolean; data?: any; profile?: UserProfile; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'সার্ভার সংযোগে সমস্যা' };
    }
  },

  // Sync/Save user data
  syncData: async (loginId: string, data: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/user/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, data }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'সার্ভার সংযোগে সমস্যা' };
    }
  },

  // Update profile
  updateProfile: async (currentLoginId: string, profileData: Partial<UserAccount>): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/user/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentLoginId, profileData }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'সার্ভার সংযোগে সমস্যা' };
    }
  },

  // Recover password
  recoverPassword: async (loginId: string, lastTransactionAmount: string): Promise<{ success: boolean; password?: string; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/auth/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, lastTransactionAmount }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'সার্ভার সংযোগে সমস্যা' };
    }
  }
};
