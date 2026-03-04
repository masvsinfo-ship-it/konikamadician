import React from 'react';
import { Transaction } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';

interface AnalyticsProps {
  transactions: Transaction[];
}

export function Analytics({ transactions }: AnalyticsProps) {
  // Chart Data: Last 7 days sales
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const daySales = transactions
      .filter((t) => format(new Date(t.date), 'yyyy-MM-dd') === dateStr && t.type === 'MEDICINE')
      .reduce((sum, t) => sum + t.amount, 0);
    return { name: format(date, 'dd MMM'), sales: daySales };
  }).reverse();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">বিক্রয় বিশ্লেষণ</h2>
      </div>

      <Card className="shadow-md border-slate-100">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-slate-700 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-500" />
            গত ৭ দিনের বিক্রয়
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="sales" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
