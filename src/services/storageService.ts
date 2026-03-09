// Storage Service for Client-Side Only Mode
// This uses localStorage to store all user data and transactions.

const USERS_KEY = 'dokaner_khata_users';
const CURRENT_USER_KEY = 'dokaner_khata_current_user';

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

export const storageService = {
  // Get all users from localStorage
  getUsers: (): Record<string, UserAccount> => {
    const usersJson = localStorage.getItem(USERS_KEY);
    return usersJson ? JSON.parse(usersJson) : {};
  },

  // Save all users to localStorage
  saveUsers: (users: Record<string, UserAccount>) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  // Register a new user
  register: (account: Omit<UserAccount, 'data'>): { success: boolean; error?: string } => {
    const users = storageService.getUsers();
    if (users[account.loginId]) {
      return { success: false, error: 'এই নাম্বারটি ইতিমধ্যে নিবন্ধিত' };
    }
    users[account.loginId] = { ...account, data: {} };
    storageService.saveUsers(users);
    return { success: true };
  },

  // Login a user
  login: (loginId: string, password: string): { success: boolean; data?: any; profile?: UserProfile; error?: string } => {
    const users = storageService.getUsers();
    const user = users[loginId];
    if (!user) return { success: false, error: 'ইউজার পাওয়া যায়নি' };
    if (user.password !== password) return { success: false, error: 'ভুল পাসওয়ার্ড' };
    
    return { 
      success: true, 
      data: user.data || {}, 
      profile: user.profile 
    };
  },

  // Sync/Save user data
  syncData: (loginId: string, data: any): { success: boolean; error?: string } => {
    const users = storageService.getUsers();
    if (!users[loginId]) return { success: false, error: 'User not found' };
    users[loginId].data = data;
    storageService.saveUsers(users);
    return { success: true };
  },

  // Update profile
  updateProfile: (currentLoginId: string, profileData: Partial<UserAccount>): { success: boolean; error?: string } => {
    const users = storageService.getUsers();
    const user = users[currentLoginId];
    if (!user) return { success: false, error: 'User not found' };

    const newLoginId = profileData.loginId || currentLoginId;
    
    // If loginId is changing, check if new one is taken
    if (newLoginId !== currentLoginId && users[newLoginId]) {
      return { success: false, error: 'নতুন নাম্বারটি ইতিমধ্যে ব্যবহৃত হচ্ছে' };
    }

    const updatedUser = {
      ...user,
      loginId: newLoginId,
      password: profileData.password || user.password,
      profile: {
        ...user.profile,
        ...(profileData.profile || {})
      }
    };

    if (newLoginId !== currentLoginId) {
      delete users[currentLoginId];
    }
    users[newLoginId] = updatedUser;
    storageService.saveUsers(users);
    return { success: true };
  },

  // Recover password
  recoverPassword: (loginId: string, lastTransactionAmount: string): { success: boolean; password?: string; error?: string } => {
    const users = storageService.getUsers();
    const user = users[loginId];
    if (!user) return { success: false, error: 'ইউজার পাওয়া যায়নি' };
    
    const transactions = user.data.transactions || [];
    if (transactions.length > 0 && transactions[0].amount.toString() === lastTransactionAmount.toString()) {
      return { success: true, password: user.password };
    }
    return { success: false, error: 'তথ্য মেলেনি' };
  }
};
