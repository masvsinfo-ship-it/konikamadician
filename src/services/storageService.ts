// Storage Service using Browser Local Storage
// This stores all data directly on the user's device.

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

const STORAGE_KEY = 'baki_khata_users';
const API_URL = '/api';

const getUsers = (): UserAccount[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveUsers = (users: UserAccount[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
};

export const storageService = {
  // Register a new user
  register: async (account: Omit<UserAccount, 'data'>): Promise<{ success: boolean; error?: string }> => {
    try {
      const users = getUsers();
      const existingUser = users.find(u => u.loginId === account.loginId);
      if (existingUser) {
        return { success: false, error: 'এই নাম্বারটি ইতিমধ্যে নিবন্ধিত' };
      }
      
      const newUser: UserAccount = {
        ...account,
        data: {
          customers: [],
          transactions: [],
          settings: {
            currency: '৳',
            language: 'bn'
          }
        }
      };
      
      users.push(newUser);
      saveUsers(users);

      // Initial sync to Vercel Blob
      await fetch(`${API_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: account.loginId, data: newUser.data }),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: 'স্টোরেজ ত্রুটি' };
    }
  },

  // Login a user
  login: async (loginId: string, password: string): Promise<{ success: boolean; data?: any; profile?: UserProfile; error?: string }> => {
    try {
      const users = getUsers();
      let user = users.find(u => u.loginId === loginId);
      
      // Try to load from Vercel Blob if not in local storage or to sync
      try {
        const response = await fetch(`${API_URL}/load/${loginId}`);
        const result = await response.json();
        if (result.success && result.data) {
          if (user) {
            user.data = result.data;
          } else {
            // If user exists in blob but not local, we might need more info (password/profile)
            // For now, we assume local storage has the account info or we handle it
            // In a real app, you'd store the whole account object in the blob
          }
        }
      } catch (e) {
        console.warn('Cloud load failed, using local data');
      }

      if (!user) return { success: false, error: 'ইউজার পাওয়া যায়নি' };
      if (user.password !== password) return { success: false, error: 'ভুল পাসওয়ার্ড' };
      
      return { 
        success: true, 
        data: user.data || {}, 
        profile: user.profile 
      };
    } catch (error) {
      return { success: false, error: 'স্টোরেজ ত্রুটি' };
    }
  },

  // Sync/Save user data
  syncData: async (loginId: string, data: any): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Save to Local Storage (Instant)
      const users = getUsers();
      const index = users.findIndex(u => u.loginId === loginId);
      if (index !== -1) {
        users[index].data = data;
        saveUsers(users);
      }
      
      // 2. Sync to Vercel Blob (Background)
      fetch(`${API_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, data }),
      }).catch(err => console.error('Cloud sync failed:', err));

      return { success: true };
    } catch (error) {
      return { success: false, error: 'সেভ করতে সমস্যা হয়েছে' };
    }
  },

  // Update profile
  updateProfile: async (currentLoginId: string, profileData: Partial<UserAccount>): Promise<{ success: boolean; error?: string }> => {
    try {
      const users = getUsers();
      const index = users.findIndex(u => u.loginId === currentLoginId);
      
      if (index === -1) return { success: false, error: 'User not found' };

      const newLoginId = profileData.loginId || currentLoginId;
      
      if (newLoginId !== currentLoginId) {
        const existingUser = users.find(u => u.loginId === newLoginId);
        if (existingUser) {
          return { success: false, error: 'নতুন নাম্বারটি ইতিমধ্যে ব্যবহৃত হচ্ছে' };
        }
      }

      users[index].loginId = newLoginId;
      if (profileData.password) users[index].password = profileData.password;
      if (profileData.profile) {
        users[index].profile = { ...users[index].profile, ...profileData.profile };
      }
      
      saveUsers(users);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে' };
    }
  },

  // Recover password
  recoverPassword: async (loginId: string, lastTransactionAmount: string): Promise<{ success: boolean; password?: string; error?: string }> => {
    try {
      const users = getUsers();
      const user = users.find(u => u.loginId === loginId);
      
      if (!user) return { success: false, error: 'ইউজার পাওয়া যায়নি' };
      
      const transactions = user.data.transactions || [];
      if (transactions.length > 0 && transactions[0].amount.toString() === lastTransactionAmount.toString()) {
        return { success: true, password: user.password };
      }
      return { success: false, error: 'তথ্য মেলেনি' };
    } catch (error) {
      return { success: false, error: 'স্টোরেজ ত্রুটি' };
    }
  }
};
