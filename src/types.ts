export type TransactionType = 'MEDICINE' | 'BKASH' | 'FLEXILOAD' | 'DUE_PAYMENT' | 'SALE_PAYMENT';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // Sale Price or Amount Sent
  cost: number;   // Cost Price or Amount Deducted
  profit: number;
  date: string;
  description: string; // Product Name or Mobile Number
  customerId?: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  whatsapp?: string;
  imo?: string;
  address: string;
  totalDue: number;
  promiseDate?: string;
}

export interface ShortItem {
  id: string;
  name: string;
  quantity?: string;
  status: 'PENDING' | 'DONE';
  date: string;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
}

export interface UserProfile {
  name: string;
  shopName?: string;
  address?: string;
  mobile: string;
  profilePic?: string;
}

export interface AppSettings {
  medicineProfitPercent: number;
  bkashCashOutFee: number;
  flexiloadCommission: number;
  password?: string;
  quickActions?: string[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  medicineProfitPercent: 10,
  bkashCashOutFee: 1.85,
  flexiloadCommission: 2.8,
  password: '41048',
  quickActions: ['sales', 'recharge', 'customers', 'expenses'],
};
