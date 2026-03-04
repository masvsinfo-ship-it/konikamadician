import { useState, useEffect } from 'react';
import { Transaction, Customer, ShortItem, AppSettings, DEFAULT_SETTINGS, Expense, UserProfile } from '../types';

export function useStore() {
  const [loginId, setLoginId] = useState<string | null>(() => sessionStorage.getItem('loginId'));
  const [isInitialized, setIsInitialized] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('customers');
    return saved ? JSON.parse(saved) : [];
  });
  const [shortList, setShortList] = useState<ShortItem[]>(() => {
    const saved = localStorage.getItem('shortList');
    return saved ? JSON.parse(saved) : [];
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const setAllData = (data: any, id: string, profile?: UserProfile) => {
    if (data.transactions) {
      setTransactions(data.transactions);
      localStorage.setItem('transactions', JSON.stringify(data.transactions));
    }
    if (data.customers) {
      setCustomers(data.customers);
      localStorage.setItem('customers', JSON.stringify(data.customers));
    }
    if (data.shortList) {
      setShortList(data.shortList);
      localStorage.setItem('shortList', JSON.stringify(data.shortList));
    }
    if (data.expenses) {
      setExpenses(data.expenses);
      localStorage.setItem('expenses', JSON.stringify(data.expenses));
    }
    if (data.settings) {
      const newSettings = { ...DEFAULT_SETTINGS, ...data.settings };
      setSettings(newSettings);
      localStorage.setItem('settings', JSON.stringify(newSettings));
    }
    if (profile) {
      setUserProfile(profile);
      localStorage.setItem('user_profile', JSON.stringify(profile));
    }
    setLoginId(id);
    setIsInitialized(true);
  };

  const clearData = () => {
    setTransactions([]);
    setCustomers([]);
    setShortList([]);
    setExpenses([]);
    setSettings(DEFAULT_SETTINGS);
    setUserProfile(null);
    setLoginId(null);
    setIsInitialized(false);
    localStorage.removeItem('transactions');
    localStorage.removeItem('customers');
    localStorage.removeItem('shortList');
    localStorage.removeItem('expenses');
    localStorage.removeItem('settings');
    localStorage.removeItem('user_profile');
  };

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('customers', JSON.stringify(customers));
    localStorage.setItem('shortList', JSON.stringify(shortList));
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('settings', JSON.stringify(settings));
    if (userProfile) localStorage.setItem('user_profile', JSON.stringify(userProfile));

    if (!loginId) return;

    const syncData = async () => {
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            loginId,
            data: { transactions, customers, shortList, expenses, settings }
          })
        });
      } catch (error) {
        console.error('Failed to sync data to server:', error);
      }
    };

    const timer = setTimeout(syncData, 2000);
    return () => clearTimeout(timer);
  }, [transactions, customers, shortList, expenses, settings, isInitialized, loginId, userProfile]);

  const addTransaction = (transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev]);
  };

  const addTransactions = (newTransactions: Transaction[]) => {
    setTransactions(prev => [...newTransactions, ...prev]);
  };

  const addCustomer = (customer: Customer) => {
    setCustomers(prev => [...prev, customer]);
  };

  const editCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const updateCustomerDue = (id: string, amount: number) => {
    setCustomers(prev => prev.map(c => 
      c.id === id ? { ...c, totalDue: Number((Number(c.totalDue) + Number(amount)).toFixed(2)) } : c
    ));
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (tx && tx.customerId) {
      let adjustment = 0;
      if (tx.type === 'MEDICINE') {
        // Only adjust due if it was a due sale (not cash sale)
        if (!tx.description.includes('(নগদ)')) {
          adjustment = -tx.amount; // Removing a debit reduces due
        }
      } else if (tx.type === 'DUE_PAYMENT' || tx.type === 'SALE_PAYMENT') {
        adjustment = tx.amount; // Removing a credit increases due
      }
      
      if (adjustment !== 0) {
        setCustomers(prev => prev.map(c => 
          c.id === tx.customerId ? { ...c, totalDue: Number((Number(c.totalDue) + Number(adjustment)).toFixed(2)) } : c
        ));
      }
    }
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const editTransaction = (id: string, updates: Partial<Transaction>) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    if (tx.customerId && (updates.amount !== undefined || updates.type !== undefined || updates.description !== undefined)) {
      const oldAmount = tx.amount;
      const newAmount = updates.amount !== undefined ? updates.amount : oldAmount;
      const oldType = tx.type;
      const newType = updates.type !== undefined ? updates.type : oldType;
      const oldDesc = tx.description;
      const newDesc = updates.description !== undefined ? updates.description : oldDesc;
      
      let oldEffect = 0;
      if (oldType === 'MEDICINE') {
        if (!oldDesc.includes('(নগদ)')) oldEffect = oldAmount;
      } else if (oldType === 'DUE_PAYMENT' || oldType === 'SALE_PAYMENT') {
        oldEffect = -oldAmount;
      }
      
      let newEffect = 0;
      if (newType === 'MEDICINE') {
        if (!newDesc.includes('(নগদ)')) newEffect = newAmount;
      } else if (newType === 'DUE_PAYMENT' || newType === 'SALE_PAYMENT') {
        newEffect = -newAmount;
      }
      
      const adjustment = newEffect - oldEffect;
      
      if (adjustment !== 0) {
        setCustomers(prev => prev.map(c => 
          c.id === tx.customerId ? { ...c, totalDue: Number((Number(c.totalDue) + Number(adjustment)).toFixed(2)) } : c
        ));
      }
    }

    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ));
  };

  const addShortItem = (item: ShortItem) => {
    setShortList(prev => [item, ...prev]);
  };

  const toggleShortItem = (id: string) => {
    setShortList(prev => prev.map(item => 
      item.id === id ? { ...item, status: item.status === 'PENDING' ? 'DONE' : 'PENDING' } : item
    ));
  };

  const deleteShortItem = (id: string) => {
    setShortList(prev => prev.filter(item => item.id !== id));
  };

  const addExpense = (expense: Expense) => {
    setExpenses(prev => [expense, ...prev]);
  };

  const editExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => 
      e.id === id ? { ...e, ...updates } : e
    ));
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const resetAllData = () => {
    if (confirm('আপনি কি নিশ্চিত যে আপনি সকল তথ্য মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।')) {
      setTransactions([]);
      setCustomers([]);
      setShortList([]);
      setExpenses([]);
      alert('সকল তথ্য সফলভাবে মুছে ফেলা হয়েছে।');
    }
  };

  return {
    transactions,
    customers,
    shortList,
    expenses,
    settings,
    userProfile,
    setSettings,
    setUserProfile,
    setAllData,
    clearData,
    addTransaction,
    addTransactions,
    addCustomer,
    editCustomer,
    deleteCustomer,
    updateCustomerDue,
    deleteTransaction,
    editTransaction,
    addShortItem,
    toggleShortItem,
    deleteShortItem,
    addExpense,
    editExpense,
    deleteExpense,
    resetAllData,
  };
}
