import React, { useState, useEffect } from 'react';
import { LayoutDashboard, BookOpen, Smartphone, Users, ListTodo, Settings as SettingsIcon, LogOut, Receipt, Menu, TrendingUp, Bell, X, User, CloudOff, Cloud } from 'lucide-react';
import { UserProfile } from '../types';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning';
  time: string;
}

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  notifications: AppNotification[];
  onDismissNotification: (id: string) => void;
  userProfile: UserProfile | null;
}

export function Layout({ children, activeTab, setActiveTab, onLogout, notifications, onDismissNotification, userProfile }: LayoutProps) {
  const [showMore, setShowMore] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/health').catch(() => null);
        setIsOnline(!!(res && res.ok));
      } catch {
        setIsOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setShowMore(false);
  }, [activeTab]);

  const mainNavItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'sales', label: 'বিক্রয়', icon: BookOpen },
    { id: 'recharge', label: 'বিকাশ', icon: Smartphone },
    { id: 'customers', label: 'কাস্টমার', icon: Users },
  ];

  const moreNavItems = [
    { id: 'expenses', label: 'খরচ', icon: Receipt },
    { id: 'analytics', label: 'বিশ্লেষণ', icon: TrendingUp },
    { id: 'shortlist', label: 'শর্ট লিস্ট', icon: ListTodo },
    { id: 'settings', label: 'সেটিংস', icon: SettingsIcon },
  ];

  const allNavItems = [...mainNavItems, ...moreNavItems];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 relative overflow-hidden">
      {/* Global Background Image */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'url("https://img.icons8.com/color/512/notebook.png")',
          backgroundRepeat: 'repeat',
          backgroundSize: '100px',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white/80 backdrop-blur-md relative z-10">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <h1 className="text-lg font-bold text-emerald-600 truncate max-w-[180px]">{userProfile?.shopName || 'দোকানের খাতা'}</h1>
          <div title={isOnline ? 'সার্ভার অনলাইন' : 'অফলাইন মোড (লোকাল স্টোরেজ)'}>
            {isOnline ? (
              <Cloud className="h-4 w-4 text-emerald-500" />
            ) : (
              <CloudOff className="h-4 w-4 text-amber-500" />
            )}
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {allNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200 space-y-2">
          <button
            onClick={() => setActiveTab('settings')}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <div className="h-6 w-6 rounded-full overflow-hidden border border-emerald-500 bg-emerald-50 flex items-center justify-center text-emerald-600">
              {userProfile?.profilePic ? (
                <img src={userProfile.profilePic} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            প্রোফাইল
          </button>
          <button
            onClick={() => setShowNotifications(true)}
            className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors relative"
          >
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5" />
              নোটিফিকেশন
            </div>
            {notifications.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </button>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            লগআউট
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="md:hidden flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-emerald-600 truncate max-w-[160px]">{userProfile?.shopName || 'কনিকা মেডিসিন কর্ণার'}</h1>
            {!isOnline && <CloudOff className="h-3 w-3 text-amber-500" />}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowNotifications(true)}
              className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full"
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 border-2 border-white" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className="h-8 w-8 rounded-full overflow-hidden border-2 border-emerald-500 bg-emerald-50 flex items-center justify-center text-emerald-600"
            >
              {userProfile?.profilePic ? (
                <img src={userProfile.profilePic} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </button>
            <button 
              onClick={onLogout}
              className="p-2 text-red-600 hover:bg-red-50 rounded-full"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
        {/* Bottom Nav for Mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/90 backdrop-blur-lg pb-safe z-50">
          {/* Dropdown Menu */}
          {showMore && (
            <>
              <div 
                className="fixed inset-0 bg-black/20 z-40" 
                onClick={() => setShowMore(false)}
              />
              <div className="absolute bottom-full right-4 mb-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-2 z-50">
                {moreNavItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === item.id ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <nav className="flex justify-around p-2 relative z-50 bg-white/90 backdrop-blur-lg">
            {mainNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 p-2 text-[10px] font-medium ${
                  activeTab === item.id
                    ? 'text-emerald-600'
                    : 'text-slate-500'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate max-w-[60px]">{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => setShowMore(!showMore)}
              className={`flex flex-col items-center gap-1 p-2 text-[10px] font-medium ${
                showMore || moreNavItems.some(m => m.id === activeTab) ? 'text-emerald-600' : 'text-slate-500'
              }`}
            >
              <Menu className="h-5 w-5" />
              <span>আরও</span>
            </button>
          </nav>
        </div>
        <div className="h-20 md:hidden" /> {/* Spacer for bottom nav */}
      </main>

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-0 sm:items-start sm:justify-end sm:pt-16 sm:pr-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 sm:slide-in-from-top-2">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Bell className="h-4 w-4" /> নোটিফিকেশন
              </h3>
              <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  কোনো নতুন নোটিফিকেশন নেই
                </div>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} className={`p-3 rounded-xl border relative pr-8 ${notif.type === 'warning' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                    <h4 className={`text-sm font-bold mb-1 ${notif.type === 'warning' ? 'text-red-700' : 'text-blue-700'}`}>{notif.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                    <button 
                      onClick={() => onDismissNotification(notif.id)}
                      className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
