import React, { useState } from 'react';
import { ShortItem } from '../types';
import { Plus, Check, X, Trash2, ListTodo, FileDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { toPng } from 'html-to-image';

interface ShortListProps {
  items: ShortItem[];
  userProfile: any;
  onAddItem: (item: ShortItem) => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
}

export function ShortList({ items, userProfile, onAddItem, onToggleItem, onDeleteItem }: ShortListProps) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    onAddItem({
      id: Date.now().toString(),
      name: newItemName,
      quantity: newItemQuantity,
      status: 'PENDING',
      date: new Date().toISOString(),
    });
    setNewItemName('');
    setNewItemQuantity('');
  };

  const pendingItems = items.filter(i => i.status === 'PENDING');
  const doneItems = items.filter(i => i.status === 'DONE');

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showShortListPreview, setShowShortListPreview] = useState(false);

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    setShowShortListPreview(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));

    const itemsPerPage = 25;
    const totalPages = Math.ceil(pendingItems.length / itemsPerPage) || 1;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    try {
      for (let i = 0; i < totalPages; i++) {
        const pageElement = document.getElementById(`shortlist-page-${i}`);
        if (!pageElement) continue;

        const dataUrl = await toPng(pageElement, { 
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          skipFonts: false,
        });

        if (i > 0) pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      
      pdf.save(`ShortList_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('PDF তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setIsGeneratingPDF(false);
      setShowShortListPreview(false);
    }
  };

  const itemsPerPage = 25;
  const chunks = [];
  for (let i = 0; i < pendingItems.length; i += itemsPerPage) {
    chunks.push(pendingItems.slice(i, i + itemsPerPage));
  }
  if (chunks.length === 0) chunks.push([]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {showShortListPreview && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="flex flex-col gap-8 py-10">
            <p className="text-white text-center font-black text-xl animate-pulse">PDF তৈরি হচ্ছে...</p>
            {chunks.map((chunk, pageIndex) => (
              <div 
                key={pageIndex}
                id={`shortlist-page-${pageIndex}`}
                className="bg-white p-[20mm] shadow-2xl flex flex-col"
                style={{ 
                  width: '210mm', 
                  height: '297mm', 
                  minHeight: '297mm',
                  boxSizing: 'border-box',
                  position: 'relative' 
                }}
              >
                <div className="text-center mb-10">
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight">{userProfile?.shopName || 'দোকানের খাতা'}</h1>
                  <p className="text-sm text-slate-500 uppercase tracking-[0.3em] mt-2 font-bold">বাকি | নগদ | হিসাব</p>
                  <div className="mt-4 text-xs text-slate-400">
                    <p className="font-bold text-slate-600">{userProfile?.name || 'প্রোঃ মোঃ সাজ্জাতুল ইসলাম'}</p>
                    <p>{userProfile?.address || 'বাজিতেরপাড়া বাজার, মাদারগঞ্জ, জামালপুর।'} মোবাইলঃ {userProfile?.mobile || '০১৭১৬-০৪১০৪৮'}</p>
                  </div>
                  <p className="text-lg text-slate-900 mt-6 font-black border-y-2 border-slate-900 py-2 uppercase tracking-widest">প্রয়োজনীয় আইটেমের তালিকা (Short List)</p>
                  <div className="mt-4 text-right">
                    <p className="text-xs text-slate-400 font-bold">তারিখ: {format(new Date(), 'dd/MM/yyyy')}</p>
                  </div>
                </div>

                <div className="flex-1">
                  <table className="w-full text-base">
                    <thead>
                      <tr className="border-b-2 border-slate-900 text-left text-xs text-slate-500 uppercase">
                        <th className="py-4 font-black w-16">ক্র.নং</th>
                        <th className="py-4 font-black">আইটেমের নাম</th>
                        <th className="py-4 font-black w-32">পরিমাণ</th>
                        <th className="py-4 font-black text-right">অবস্থা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {chunk.map((item, i) => (
                        <tr key={item.id}>
                          <td className="py-4 text-slate-400 font-bold">{pageIndex * itemsPerPage + i + 1}.</td>
                          <td className="py-4 font-black text-slate-800 text-lg">{item.name}</td>
                          <td className="py-4 font-bold text-slate-600">{item.quantity || '-'}</td>
                          <td className="py-4 text-right">
                            <div className="inline-block w-6 h-6 border-2 border-slate-200 rounded"></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-10 pt-10 border-t-2 border-slate-100 text-center">
                  <div className="text-[9px] text-slate-300 uppercase tracking-[0.2em] space-y-1 font-medium">
                    <p>Developed by: fb.com/billal8795 | WhatsApp: +8801735308795</p>
                  </div>
                </div>

                <div className="absolute bottom-6 right-[20mm] text-[10px] text-slate-400 font-bold">
                  Page {pageIndex + 1} of {chunks.length} | {userProfile?.shopName || 'দোকানের খাতা'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-xl" id="short-list-view">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-6 w-6 text-emerald-400" />
              শর্ট লিস্ট (Short List)
            </CardTitle>
            <button
              onClick={generatePDF}
              disabled={pendingItems.length === 0 || isGeneratingPDF}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
            >
              <FileDown className="h-4 w-4" /> 
              {isGeneratingPDF ? 'তৈরি হচ্ছে...' : 'PDF'}
            </button>
          </div>
          <p className="text-slate-400 text-sm">দোকানে যা যা প্রয়োজন তার তালিকা</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">আইটেমের নাম</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="যেমন: Napa Extend"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white shadow-inner focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-500 transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">পরিমাণ (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value)}
                  placeholder="যেমন: ১০ পাতা"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white shadow-inner focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-500 transition-all"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 group"
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
              লিস্টে যোগ করুন
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="font-medium text-slate-500 uppercase text-xs tracking-wider px-2">কেনা বাকি ({pendingItems.length})</h3>
        {pendingItems.length === 0 && (
          <p className="text-center text-slate-400 py-8 italic">কোন আইটেম নেই</p>
        )}
        <div className="space-y-2">
          {pendingItems.map(item => (
            <div
              key={item.id}
              className="group flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all"
            >
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">{item.name}</span>
                {item.quantity && (
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full w-fit mt-1">
                    পরিমাণ: {item.quantity}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onToggleItem(item.id)}
                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                  title="Mark as Done"
                >
                  <Check className="h-5 w-5" />
                </button>
                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {doneItems.length > 0 && (
        <div className="space-y-4 pt-8 border-t border-slate-200">
          <h3 className="font-medium text-slate-500 uppercase text-xs tracking-wider px-2">কেনা সম্পন্ন ({doneItems.length})</h3>
          <div className="space-y-2 opacity-60">
            {doneItems.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-slate-500 line-through decoration-slate-400">{item.name}</span>
                  {item.quantity && (
                    <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                      পরিমাণ: {item.quantity}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onToggleItem(item.id)}
                    className="p-2 text-emerald-600 bg-emerald-50 rounded-full"
                    title="Mark as Pending"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-2 text-slate-400 hover:text-red-600"
                    title="Delete"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
