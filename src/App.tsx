import React, { useState, useEffect } from 'react';
import { useStore } from './hooks/useStore';
import { Layout, AppNotification } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Sales } from './components/Sales';
import { BkashFlexi } from './components/BkashFlexi';
import { Customers } from './components/Customers';
import { ShortList } from './components/ShortList';
import { Settings } from './components/Settings';
import { LoginPage } from './components/LoginPage';
import { Expenses } from './components/Expenses';
import { Analytics } from './components/Analytics';
import { Transaction } from './types';
import { Bell, X, BookOpen } from 'lucide-react';

// Global to capture prompt if it fires before React mounts
let capturedPrompt: any = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  capturedPrompt = e;
  console.log('PWA Install prompt captured globally');
});

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('is_authenticated') === 'true';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(capturedPrompt);

  useEffect(() => {
    if (capturedPrompt) {
      setDeferredPrompt(capturedPrompt);
    }
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('PWA Install prompt captured in React');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const {
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
  } = useStore();

  // Notification Logic
  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    const storedLoginId = localStorage.getItem('loginId');
    const storedPassword = localStorage.getItem('password');
    
    const initApp = async (retries = 3) => {
      try {
        // Wait for server to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if server is reachable
        const healthRes = await fetch('/api/health').catch(() => null);
        
        if (healthRes && healthRes.ok) {
          const healthData = await healthRes.json();
          if (!healthData.db && retries > 0) {
            console.warn('Server up but DB not ready, retrying...');
            return initApp(retries - 1);
          }

          if (storedLoginId && storedPassword) {
            const res = await fetch('/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ loginId: storedLoginId, password: storedPassword })
            });
            const data = await res.json();
            if (data.success) {
              setAllData(data.data, storedLoginId, data.profile);
              localStorage.setItem('is_authenticated', 'true');
            } else {
              localStorage.removeItem('loginId');
              localStorage.removeItem('password');
              localStorage.removeItem('is_authenticated');
              setIsAuthenticated(false);
            }
          }
        } else if (retries > 0) {
          console.warn('Server not reachable, retrying...', retries);
          return initApp(retries - 1);
        } else {
          console.warn('Server is offline after retries, using local data');
          if (storedLoginId && storedPassword) {
            setIsAuthenticated(true);
            setAllData({}, storedLoginId, userProfile || undefined);
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
        if (storedLoginId && storedPassword) {
          setIsAuthenticated(true);
          setAllData({}, storedLoginId, userProfile || undefined);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initApp();

    const checkNotifications = () => {
      const now = new Date();
      const hours = now.getHours();
      const todayStr = now.toISOString().split('T')[0];
      const newNotifs: AppNotification[] = [];

      // 1. 8 AM Notification
      if (hours >= 8) {
        const key = `notif_8am_${todayStr}`;
        if (!localStorage.getItem(key)) {
          newNotifs.push({
            id: key,
            title: 'শুভ সকাল!',
            message: 'আপনার সকল ব্যবসায়ী লেনদেন এই এপে সংরক্ষন করুন, ডিজিটাল এপ ব্যবহার করে জীবনকে সহজ করুন। 😀',
            type: 'info',
            time: todayStr
          });
        }
      }

      // 2. 9 PM Notification
      if (hours >= 21) {
        const key = `notif_9pm_${todayStr}`;
        if (!localStorage.getItem(key)) {
          newNotifs.push({
            id: key,
            title: 'শুভ রাত্রি!',
            message: 'আজকের বাকি এন্টি দিতে ভুলে গেছেন কি?',
            type: 'info',
            time: todayStr
          });
        }
      }

      // 3. Expense > Income Warning (Monthly)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyTransactions = transactions.filter(t => new Date(t.date) >= monthStart);
      const monthlyExpenses = expenses.filter(e => new Date(e.date) >= monthStart);
      
      const monthlyProfit = monthlyTransactions.reduce((sum, t) => sum + t.profit, 0);
      const monthlyExpenseTotal = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

      if (monthlyExpenseTotal > monthlyProfit) {
        const key = `notif_expense_warning_${now.getFullYear()}_${now.getMonth()}`;
        if (!localStorage.getItem(key)) {
          newNotifs.push({
            id: key,
            title: 'সতর্কতা!',
            message: 'আপনার আয়ের চেয়ে ব্যয় বেশি হচ্ছে! দয়া করে ব্যয় কমানোর দিকে নজর দিন।',
            type: 'warning',
            time: todayStr
          });
        }
      }

      // 4. Promise Date Notification
      const promisedCustomers = customers.filter(c => c.promiseDate === todayStr);
      if (promisedCustomers.length > 0) {
        const key = `notif_promise_${todayStr}`;
        if (!localStorage.getItem(key)) {
          const names = promisedCustomers.map(c => c.name).join(', ');
          newNotifs.push({
            id: key,
            title: 'টাকা আদায়ের তারিখ',
            message: `আজ টাকা দেওয়ার কথা: ${names}`,
            type: 'info',
            time: todayStr
          });
        }
      }

      setNotifications(newNotifs);
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 60000); // Check every minute
    return () => {
      clearTimeout(splashTimer);
      clearInterval(interval);
    };
  }, [customers, transactions, expenses, userProfile]);

  const handleDismissNotification = (id: string) => {
    localStorage.setItem(id, 'dismissed');
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleCompleteSale = (newTransactions: Transaction[], customerId?: string, paidAmount?: number) => {
    const totalAmount = newTransactions.reduce((sum, t) => sum + t.amount, 0);
    const paid = Number(paidAmount) || 0;
    const due = Number((totalAmount - paid).toFixed(2));

    // Add all medicine transactions with clear labels
    const labeledTransactions = newTransactions.map(t => ({
      ...t,
      description: due <= 0 ? `${t.description} (নগদ)` : `${t.description} (বাকি)`
    }));
    
    addTransactions(labeledTransactions);

    // Update customer due if applicable
    if (customerId && due !== 0) {
      updateCustomerDue(customerId, due);
    }

    // Record payment ONLY if it's a partial payment or overpayment on a sale
    // If it's a full cash sale (due === 0), the MEDICINE transaction itself represents the cash sale
    if (customerId && due !== 0 && paid > 0) {
      addTransaction({
        id: (Date.now() + 1).toString(),
        type: 'SALE_PAYMENT',
        amount: paid,
        cost: 0,
        profit: 0,
        date: new Date().toISOString(),
        description: due < 0 ? 'নগদ জমা (অতিরিক্ত)' : 'নগদ জমা (বিক্রয়)',
        customerId: customerId,
      });
    }
  };

  const handleViewCustomer = (id: string) => {
    setViewingCustomerId(id);
    setActiveTab('customers');
  };

  const handleLogin = (data: any, loginId: string, pass: string, profile?: any) => {
    setAllData(data, loginId, profile);
    localStorage.setItem('is_authenticated', 'true');
    localStorage.setItem('loginId', loginId);
    localStorage.setItem('password', pass);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    if (confirm('আপনি কি লগআউট করতে চান?')) {
      clearData();
      localStorage.removeItem('is_authenticated');
      localStorage.removeItem('loginId');
      localStorage.removeItem('password');
      setIsAuthenticated(false);
    }
  };

  if (showSplash || isLoading) {
    return (
      <div className="fixed inset-0 bg-white z-[200] flex flex-col items-center justify-center animate-in fade-in duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-pulse"></div>
          <div className="relative bg-white p-8 rounded-3xl shadow-2xl border border-emerald-50 flex flex-col items-center gap-6">
            <div className="h-24 w-24 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 animate-bounce">
              <BookOpen className="h-14 w-14" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{userProfile?.shopName || 'দোকানের খাতা'}</h1>
              <p className="text-emerald-600 font-bold mt-1 tracking-[0.2em] uppercase text-xs">ডিজিটাল হিসাব খাতা</p>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Loading Data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} deferredPrompt={deferredPrompt} setDeferredPrompt={setDeferredPrompt} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard transactions={transactions} customers={customers} expenses={expenses} settings={settings} onUpdateSettings={setSettings} onViewCustomer={handleViewCustomer} onTabChange={setActiveTab} />;
      case 'sales':
        return (
          <Sales
            customers={customers}
            settings={settings}
            userProfile={userProfile}
            onCompleteSale={handleCompleteSale}
            onAddCustomer={addCustomer}
          />
        );
      case 'recharge':
        return (
          <BkashFlexi
            settings={settings}
            onAddTransaction={(t) => {
              addTransaction(t);
              alert('লেনদেন সফল হয়েছে!');
              setActiveTab('dashboard');
            }}
          />
        );
      case 'customers':
        return (
          <Customers
            customers={customers}
            transactions={transactions}
            userProfile={userProfile}
            initialViewingCustomerId={viewingCustomerId}
            onClearViewingCustomer={() => setViewingCustomerId(null)}
            onAddCustomer={addCustomer}
            onEditCustomer={editCustomer}
            onDeleteCustomer={deleteCustomer}
            onUpdateDue={updateCustomerDue}
            onAddTransaction={addTransaction}
            onDeleteTransaction={deleteTransaction}
            onEditTransaction={editTransaction}
          />
        );
      case 'expenses':
        return (
          <Expenses
            expenses={expenses}
            onAddExpense={addExpense}
            onEditExpense={editExpense}
            onDeleteExpense={deleteExpense}
          />
        );
      case 'analytics':
        return <Analytics transactions={transactions} />;
      case 'shortlist':
        return (
          <ShortList
            items={shortList}
            userProfile={userProfile}
            onAddItem={addShortItem}
            onToggleItem={toggleShortItem}
            onDeleteItem={deleteShortItem}
          />
        );
      case 'settings':
        return (
          <Settings
            settings={settings}
            userProfile={userProfile}
            onUpdateSettings={setSettings}
            onUpdateProfile={setUserProfile}
            onResetData={resetAllData}
          />
        );
      default:
        return <Dashboard transactions={transactions} customers={customers} expenses={expenses} settings={settings} onUpdateSettings={setSettings} onViewCustomer={handleViewCustomer} onTabChange={setActiveTab} />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      onLogout={handleLogout}
      notifications={notifications}
      onDismissNotification={handleDismissNotification}
      userProfile={userProfile}
      deferredPrompt={deferredPrompt}
      setDeferredPrompt={setDeferredPrompt}
    >
      {renderContent()}
    </Layout>
  );
}
