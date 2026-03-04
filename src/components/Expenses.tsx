import React, { useState } from 'react';
import { Expense } from '../types';
import { Plus, Trash2, Receipt, Edit, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { format } from 'date-fns';

interface ExpensesProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onEditExpense: (id: string, updates: Partial<Expense>) => void;
  onDeleteExpense: (id: string) => void;
}

export function Expenses({ expenses, onAddExpense, onEditExpense, onDeleteExpense }: ExpensesProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    onAddExpense({
      id: Date.now().toString(),
      amount: parseFloat(amount),
      description,
      date: new Date().toISOString(),
    });

    setAmount('');
    setDescription('');
  };

  const handleEditSubmit = (id: string) => {
    if (!editAmount || !editDescription) return;
    onEditExpense(id, {
      amount: parseFloat(editAmount),
      description: editDescription
    });
    setEditingId(null);
  };

  const startEditing = (expense: Expense) => {
    setEditingId(expense.id);
    setEditAmount(expense.amount.toString());
    setEditDescription(expense.description);
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayExpenses = expenses.filter(
    (e) => format(new Date(e.date), 'yyyy-MM-dd') === today
  );
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              আজকের খরচ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">৳ {todayTotal.toLocaleString()}</div>
            <p className="text-rose-100 mt-2">মোট {todayExpenses.length} টি খরচ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>নতুন খরচ যোগ করুন</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">খরচের বিবরণ</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="যেমন: চা-নাস্তা, বিদ্যুৎ বিল..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">পরিমাণ (টাকা)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                খরচ যোগ করুন
              </button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>খরচের তালিকা</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-rose-200 transition-colors group gap-4"
              >
                {editingId === expense.id ? (
                  <div className="flex-1 grid gap-3 sm:grid-cols-2 items-start">
                    <div>
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                        placeholder="বিবরণ"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                        placeholder="পরিমাণ"
                      />
                      <button
                        onClick={() => handleEditSubmit(expense.id)}
                        className="p-1.5 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-md transition-colors"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded-md transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h4 className="font-bold text-slate-900">{expense.description}</h4>
                      <p className="text-xs text-slate-500">{format(new Date(expense.date), 'dd MMM yyyy, hh:mm a')}</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      <span className="font-black text-rose-600">৳ {expense.amount.toLocaleString()}</span>
                      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(expense)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('আপনি কি নিশ্চিত এই খরচটি ডিলিট করতে চান?')) {
                              onDeleteExpense(expense.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            {expenses.length === 0 && (
              <div className="text-center py-8 text-slate-500 italic">
                কোন খরচের রেকর্ড নেই
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
