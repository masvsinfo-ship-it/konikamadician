import React, { useState } from 'react';
import { Transaction, AppSettings } from '../types';
import { Smartphone, ArrowUpRight, ArrowDownLeft, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface BkashFlexiProps {
  settings: AppSettings;
  onAddTransaction: (transaction: Transaction) => void;
}

export function BkashFlexi({ settings, onAddTransaction }: BkashFlexiProps) {
  const [activeTab, setActiveTab] = useState<'BKASH' | 'FLEXILOAD'>('BKASH');
  const [number, setNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'CASH_IN' | 'CASH_OUT' | 'SEND_MONEY'>('CASH_OUT');
  const [profit, setProfit] = useState('');

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const amt = parseFloat(val);
    if (!amt) {
      setProfit('');
      return;
    }

    if (activeTab === 'BKASH') {
      if (type === 'CASH_OUT') {
        // Example: 1.85% fee means we earn that? Or customer pays that?
        // Usually shop earns ~4.10 tk per 1000 on Cash In? No, Cash Out is where profit is.
        // Let's assume user enters the fee they collected or we calculate commission.
        // Simple: (Amount * Rate / 100)
        setProfit((amt * settings.bkashCashOutFee / 100).toFixed(2));
      } else {
        setProfit('0'); // Usually no profit on Cash In unless volume commission
      }
    } else {
      // Flexiload commission
      setProfit((amt * settings.flexiloadCommission / 100).toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number || !amount) return;

    const transaction: Transaction = {
      id: Date.now().toString(),
      type: activeTab,
      amount: parseFloat(amount),
      cost: parseFloat(amount) - (parseFloat(profit) || 0), // Cost is Amount - Profit
      profit: parseFloat(profit) || 0,
      date: new Date().toISOString(),
      description: `${activeTab} - ${number} (${type === 'CASH_OUT' ? 'Cash Out' : type === 'CASH_IN' ? 'Cash In' : 'Send'})`,
    };

    onAddTransaction(transaction);
    setNumber('');
    setAmount('');
    setProfit('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex space-x-4 justify-center">
        <button
          onClick={() => setActiveTab('BKASH')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'BKASH'
              ? 'bg-pink-600 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Smartphone className="h-5 w-5" />
          বিকাশ
        </button>
        <button
          onClick={() => setActiveTab('FLEXILOAD')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'FLEXILOAD'
              ? 'bg-orange-500 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Smartphone className="h-5 w-5" />
          ফ্লেক্সিলোড
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            {activeTab === 'BKASH' ? 'বিকাশ লেনদেন' : 'ফ্লেক্সিলোড করুন'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'BKASH' && (
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setType('CASH_OUT')}
                  className={`flex flex-col items-center justify-center p-3 rounded-md border ${
                    type === 'CASH_OUT'
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ArrowDownLeft className="h-5 w-5 mb-1" />
                  <span className="text-xs">ক্যাশ আউট</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('CASH_IN')}
                  className={`flex flex-col items-center justify-center p-3 rounded-md border ${
                    type === 'CASH_IN'
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ArrowUpRight className="h-5 w-5 mb-1" />
                  <span className="text-xs">ক্যাশ ইন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('SEND_MONEY')}
                  className={`flex flex-col items-center justify-center p-3 rounded-md border ${
                    type === 'SEND_MONEY'
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Send className="h-5 w-5 mb-1" />
                  <span className="text-xs">সেন্ড মানি</span>
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">মোবাইল নাম্বার</label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="017..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">টাকার পরিমাণ</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">লাভ / কমিশন</label>
              <input
                type="number"
                value={profit}
                onChange={(e) => setProfit(e.target.value)}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="0.00"
              />
              <p className="text-xs text-slate-500 mt-1">
                অটোমেটিক হিসাব: {activeTab === 'BKASH' ? `${settings.bkashCashOutFee}% (ক্যাশ আউট)` : `${settings.flexiloadCommission}%`}
              </p>
            </div>

            <button
              type="submit"
              className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                activeTab === 'BKASH'
                  ? 'bg-pink-600 hover:bg-pink-700 focus:ring-pink-500'
                  : 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-500'
              }`}
            >
              লেনদেন সম্পন্ন করুন
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
