import React, { useState } from 'react';
import { Transaction, Customer, Expense, AppSettings } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { BookOpen, TrendingUp, Wallet, Users, ArrowDownLeft, Activity, Phone, Receipt, Calendar, Settings as SettingsIcon, X, Check, ListTodo } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  customers: Customer[];
  expenses: Expense[];
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onViewCustomer: (id: string) => void;
  onTabChange: (tab: string) => void;
}

export function Dashboard({ transactions, customers, expenses, settings, onUpdateSettings, onViewCustomer, onTabChange }: DashboardProps) {
  const [summaryMonth, setSummaryMonth] = useState(new Date());
  const [overviewTab, setOverviewTab] = useState<'today' | 'month'>('today');
  const [isEditingQuickActions, setIsEditingQuickActions] = useState(false);

  const ALL_QUICK_ACTIONS = [
    { id: 'sales', label: 'বিক্রয়', icon: BookOpen, colorClass: 'bg-emerald-50 text-emerald-600', hoverClass: 'hover:border-emerald-200' },
    { id: 'recharge', label: 'বিকাশ/ফ্লেক্সি', icon: Wallet, colorClass: 'bg-blue-50 text-blue-600', hoverClass: 'hover:border-blue-200' },
    { id: 'customers', label: 'কাস্টমার', icon: Users, colorClass: 'bg-purple-50 text-purple-600', hoverClass: 'hover:border-purple-200' },
    { id: 'expenses', label: 'খরচ', icon: Receipt, colorClass: 'bg-rose-50 text-rose-600', hoverClass: 'hover:border-rose-200' },
    { id: 'analytics', label: 'বিশ্লেষণ', icon: TrendingUp, colorClass: 'bg-indigo-50 text-indigo-600', hoverClass: 'hover:border-indigo-200' },
    { id: 'shortlist', label: 'শর্ট লিস্ট', icon: ListTodo, colorClass: 'bg-amber-50 text-amber-600', hoverClass: 'hover:border-amber-200' },
  ];

  const activeQuickActions = settings.quickActions || ['sales', 'recharge', 'customers', 'expenses'];

  const toggleQuickAction = (id: string) => {
    let newActions;
    if (activeQuickActions.includes(id)) {
      newActions = activeQuickActions.filter(a => a !== id);
    } else {
      newActions = [...activeQuickActions, id];
    }
    onUpdateSettings({ ...settings, quickActions: newActions });
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  const todayTransactions = transactions.filter(
    (t) => format(new Date(t.date), 'yyyy-MM-dd') === today
  );

  const todayTotalSales = todayTransactions
    .filter((t) => t.type === 'MEDICINE' || t.type === 'BKASH' || t.type === 'FLEXILOAD')
    .reduce((sum, t) => sum + t.amount, 0);

  const todayTotalProfit = todayTransactions
    .reduce((sum, t) => sum + t.profit, 0);

  const totalDue = customers.reduce((sum, c) => sum + c.totalDue, 0);

  // Monthly Summary Calculations
  const monthStart = startOfMonth(summaryMonth);
  const monthEnd = endOfMonth(summaryMonth);

  const monthlyTransactions = transactions.filter(t => 
    isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd })
  );

  const monthlyExpenses = expenses.filter(e => 
    isWithinInterval(new Date(e.date), { start: monthStart, end: monthEnd })
  );

  const monthlySales = monthlyTransactions
    .filter((t) => t.type === 'MEDICINE' || t.type === 'BKASH' || t.type === 'FLEXILOAD')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyProfit = monthlyTransactions.reduce((sum, t) => sum + t.profit, 0);
  const monthlyExpenseTotal = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const monthlyNetProfit = monthlyProfit - monthlyExpenseTotal;

  const monthlyNewDue = monthlyTransactions
    .filter(t => t.type === 'MEDICINE' && !t.description.includes('(নগদ)'))
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyDueCollected = monthlyTransactions
    .filter(t => t.type === 'DUE_PAYMENT' || t.type === 'SALE_PAYMENT')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">ড্যাশবোর্ড</h2>
        <div className="text-xs text-slate-500 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
          {format(new Date(), 'EEEE, dd MMM yyyy')}
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-700">কুইক অ্যাকশন</h3>
        <button 
          onClick={() => setIsEditingQuickActions(true)} 
          className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm"
        >
          <SettingsIcon className="h-3 w-3" />
          সাজান
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 md:gap-4">
        {ALL_QUICK_ACTIONS.filter(a => activeQuickActions.includes(a.id)).map(action => (
          <button 
            key={action.id}
            onClick={() => onTabChange(action.id)}
            className={`flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm ${action.hoverClass} hover:shadow-md transition-all group`}
          >
            <div className={`p-2.5 rounded-full mb-2 group-hover:scale-110 transition-transform ${action.colorClass}`}>
              <action.icon className="h-5 w-5" />
            </div>
            <span className="text-[10px] md:text-xs font-bold text-slate-700 text-center leading-tight">{action.label}</span>
          </button>
        ))}
        {activeQuickActions.length === 0 && (
          <div className="col-span-4 text-center py-6 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
            কোনো কুইক অ্যাকশন নির্বাচন করা হয়নি। <button onClick={() => setIsEditingQuickActions(true)} className="text-emerald-600 font-bold underline">এখানে ক্লিক করে</button> যোগ করুন।
          </div>
        )}
      </div>

      <div className="bg-slate-100/50 p-1.5 rounded-xl w-fit flex gap-1">
        <button 
          onClick={() => setOverviewTab('today')} 
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${overviewTab === 'today' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          আজকের হিসাব
        </button>
        <button 
          onClick={() => setOverviewTab('month')} 
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${overviewTab === 'month' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          মাসিক হিসাব
        </button>
      </div>
      
      {overviewTab === 'today' && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-2">
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">আজকের মোট বিক্রি</CardTitle>
              <BookOpen className="h-3 w-3 text-emerald-100" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black">৳ {todayTotalSales.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-[10px] font-bold text-blue-100 uppercase tracking-wider">আজকের মোট লাভ</CardTitle>
              <TrendingUp className="h-3 w-3 text-blue-100" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black">৳ {todayTotalProfit.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-[10px] font-bold text-purple-100 uppercase tracking-wider">আজকের লেনদেন</CardTitle>
              <Activity className="h-3 w-3 text-purple-100" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black">{todayTransactions.length} টি</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white border-none shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-[10px] font-bold text-rose-100 uppercase tracking-wider">মোট বাকি</CardTitle>
              <Users className="h-3 w-3 text-rose-100" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black">৳ {totalDue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Summary Section */}
      {overviewTab === 'month' && (
        <Card className="shadow-md border-slate-100 bg-slate-800 text-white overflow-hidden relative animate-in fade-in slide-in-from-bottom-2">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Calendar className="h-48 w-48" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between relative z-10 pb-2">
            <CardTitle className="text-slate-100 flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-emerald-400" />
              {format(summaryMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex gap-1">
              <button 
                onClick={() => {
                  const prev = new Date(summaryMonth);
                  prev.setMonth(prev.getMonth() - 1);
                  setSummaryMonth(prev);
                }}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded-md text-[10px] transition-colors"
              >
                পূর্বের মাস
              </button>
              <button 
                onClick={() => {
                  const next = new Date(summaryMonth);
                  next.setMonth(next.getMonth() + 1);
                  setSummaryMonth(next);
                }}
                disabled={summaryMonth.getMonth() === new Date().getMonth() && summaryMonth.getFullYear() === new Date().getFullYear()}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded-md text-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                পরের মাস
              </button>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-600">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">মোট বিক্রয়</p>
                <p className="text-lg font-black text-emerald-400">৳ {monthlySales.toLocaleString()}</p>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-600">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">মোট লাভ</p>
                <p className="text-lg font-black text-blue-400">৳ {monthlyProfit.toLocaleString()}</p>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-600">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">মোট খরচ</p>
                <p className="text-lg font-black text-rose-400">৳ {monthlyExpenseTotal.toLocaleString()}</p>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-600">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">নিট মুনাফা</p>
                <p className={`text-lg font-black ${monthlyNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ৳ {monthlyNetProfit.toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-600">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">নতুন বাকি</p>
                <p className="text-lg font-black text-amber-400">৳ {monthlyNewDue.toLocaleString()}</p>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-600">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">বাকি আদায়</p>
                <p className="text-lg font-black text-teal-400">৳ {monthlyDueCollected.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3 shadow-md border-slate-100">
          <CardHeader>
            <CardTitle className="text-slate-700">কাস্টমার তালিকা (বাকি আছে)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {customers
                .filter(c => c.totalDue > 0)
                .sort((a, b) => b.totalDue - a.totalDue)
                .map((customer) => (
                  <div 
                    key={customer.id} 
                    onClick={() => onViewCustomer(customer.id)}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 hover:border-emerald-200 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold group-hover:bg-emerald-200 transition-colors">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{customer.name}</h3>
                        <div className="flex items-center text-xs text-slate-500 gap-2">
                          <a 
                            href={`tel:${customer.mobile}`} 
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 hover:text-emerald-600 transition-colors"
                          >
                            <Phone className="h-3 w-3" /> {customer.mobile}
                          </a>
                          {customer.promiseDate && (
                            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px]">
                              {format(new Date(customer.promiseDate), 'dd MMM')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-red-600">৳ {customer.totalDue}</p>
                        <p className="text-xs text-slate-400">বাকি</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewCustomer(customer.id);
                        }}
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 transition-colors"
                        title="টাকা জমা নিন"
                      >
                        <Wallet className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              {customers.filter(c => c.totalDue > 0).length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  কোন বাকি কাস্টমার নেই
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-4 shadow-md border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-700">সাম্প্রতিক লেনদেন</CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {transactions.slice(0, 10).map((t) => {
                const isCashSale = t.type === 'MEDICINE' && t.description.includes('(নগদ)');
                const isDueSale = t.type === 'MEDICINE' && !t.description.includes('(নগদ)');
                const isCredit = t.type === 'DUE_PAYMENT' || t.type === 'SALE_PAYMENT';
                const customer = customers.find(c => c.id === t.customerId);
                
                return (
                  <div 
                    key={t.id} 
                    onClick={() => t.customerId && onViewCustomer(t.customerId)}
                    className={`flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200 group ${t.customerId ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-2 rounded-full flex-shrink-0 ${
                        t.type === 'MEDICINE' ? 'bg-blue-100 text-blue-600' :
                        t.type === 'BKASH' ? 'bg-pink-100 text-pink-600' :
                        t.type === 'FLEXILOAD' ? 'bg-orange-100 text-orange-600' :
                        'bg-emerald-100 text-emerald-600'
                      }`}>
                        {t.type === 'MEDICINE' ? <BookOpen className="h-4 w-4" /> :
                         t.type === 'BKASH' || t.type === 'FLEXILOAD' ? <Wallet className="h-4 w-4" /> :
                         <ArrowDownLeft className="h-4 w-4" />}
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {t.type === 'MEDICINE' ? (t.description.includes('(নগদ)') ? 'নগদ বিক্রয়' : 'বাকি বিক্রয়') : 
                             t.type === 'BKASH' ? 'বিকাশ' : 
                             t.type === 'FLEXILOAD' ? 'ফ্লেক্সিলোড' : 'জমা'}
                          </p>
                          {customer && (
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold truncate">
                              {customer.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{t.description}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className={`font-black text-sm ${
                        isDueSale ? 'text-slate-900' : 
                        isCashSale ? 'text-blue-600' :
                        isCredit ? 'text-emerald-600' : 'text-slate-900'
                      }`}>
                        {isCredit ? '-' : '+'}৳ {t.amount.toLocaleString()}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">{format(new Date(t.date), 'hh:mm a')}</p>
                    </div>
                  </div>
                );
              })}
              {transactions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <Activity className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">কোন লেনদেন পাওয়া যায়নি</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Edit Modal */}
      {isEditingQuickActions && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">কুইক অ্যাকশন সাজান</h3>
              <button onClick={() => setIsEditingQuickActions(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {ALL_QUICK_ACTIONS.map(action => {
                const isActive = activeQuickActions.includes(action.id);
                return (
                  <div
                    key={action.id}
                    onClick={() => toggleQuickAction(action.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isActive ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-200'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${action.colorClass}`}>
                        <action.icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-slate-700">{action.label}</span>
                    </div>
                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${isActive ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                      {isActive && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={() => setIsEditingQuickActions(false)} 
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
              >
                সেভ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
