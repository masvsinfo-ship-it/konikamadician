import React, { useState, useEffect } from 'react';
import { Customer, Transaction } from '../types';
import { Plus, Search, User, Phone, MapPin, DollarSign, ArrowLeft, Edit, Trash2, Save, X, FileDown, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';

interface CustomersProps {
  customers: Customer[];
  transactions: Transaction[];
  userProfile: any;
  initialViewingCustomerId?: string | null;
  onClearViewingCustomer?: () => void;
  onAddCustomer: (customer: Customer) => void;
  onEditCustomer: (id: string, customer: Partial<Customer>) => void;
  onDeleteCustomer: (id: string) => void;
  onUpdateDue: (id: string, amount: number) => void;
  onAddTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (id: string, transaction: Partial<Transaction>) => void;
}

export function Customers({ 
  customers, 
  transactions, 
  userProfile,
  initialViewingCustomerId,
  onClearViewingCustomer,
  onAddCustomer, 
  onEditCustomer, 
  onDeleteCustomer,
  onUpdateDue, 
  onAddTransaction,
  onDeleteTransaction,
  onEditTransaction
}: CustomersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', whatsapp: '', imo: '', address: '', promiseDate: '' });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [dueAmount, setDueAmount] = useState('');
  const [isAddingDue, setIsAddingDue] = useState(false);
  const [dueDescription, setDueDescription] = useState('');
  
  // Derived state for viewing customer
  const viewingCustomer = viewingCustomerId ? customers.find(c => c.id === viewingCustomerId) : null;
  
  // Edit Customer State
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustomerData, setEditCustomerData] = useState<Customer | null>(null);

  // Edit Transaction State
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editTransactionData, setEditTransactionData] = useState<{amount: string, description: string}>({ amount: '', description: '' });

  useEffect(() => {
    if (initialViewingCustomerId) {
      setViewingCustomerId(initialViewingCustomerId);
      onClearViewingCustomer?.();
    }
  }, [initialViewingCustomerId, onClearViewingCustomer]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.mobile.includes(searchTerm)
  );

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.mobile) return;

    onAddCustomer({
      id: Date.now().toString(),
      name: newCustomer.name,
      mobile: newCustomer.mobile,
      whatsapp: newCustomer.whatsapp,
      imo: newCustomer.imo,
      address: newCustomer.address,
      totalDue: 0,
      promiseDate: newCustomer.promiseDate || undefined,
    });
    setNewCustomer({ name: '', mobile: '', whatsapp: '', imo: '', address: '', promiseDate: '' });
    setIsAdding(false);
  };

  const handleUpdateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomerData) return;
    
    onEditCustomer(editCustomerData.id, {
      name: editCustomerData.name,
      mobile: editCustomerData.mobile,
      whatsapp: editCustomerData.whatsapp,
      imo: editCustomerData.imo,
      address: editCustomerData.address,
      promiseDate: editCustomerData.promiseDate || undefined,
    });
    
    // Update local viewing state
    setIsEditingCustomer(false);
    setEditCustomerData(null);
  };

  const handleDeleteCustomer = (id: string) => {
    if (confirm('আপনি কি নিশ্চিত এই কাস্টমারকে ডিলিট করতে চান?')) {
      onDeleteCustomer(id);
      if (viewingCustomerId === id) setViewingCustomerId(null);
    }
  };

  const handlePayment = () => {
    if (!selectedCustomer || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    // Subtract amount from due
    onUpdateDue(selectedCustomer.id, -amount);
    
    // Record the payment as a transaction
    onAddTransaction({
      id: Date.now().toString(),
      type: 'DUE_PAYMENT',
      amount: amount,
      cost: 0,
      profit: 0, 
      date: new Date().toISOString(),
      description: 'বাকি টাকা জমা',
      customerId: selectedCustomer.id,
    });

    setPaymentAmount('');
    setSelectedCustomer(null);
    alert('টাকা জমা হয়েছে!');
  };

  const handleAddDue = () => {
    if (!selectedCustomer || !dueAmount) return;
    const amount = parseFloat(dueAmount);
    if (isNaN(amount) || amount <= 0) return;

    // Add amount to due
    onUpdateDue(selectedCustomer.id, amount);
    
    // Record the due as a transaction
    onAddTransaction({
      id: Date.now().toString(),
      type: 'MEDICINE',
      amount: amount,
      cost: 0,
      profit: 0, 
      date: new Date().toISOString(),
      description: dueDescription || 'বাকি যোগ করা হয়েছে',
      customerId: selectedCustomer.id,
    });

    setDueAmount('');
    setDueDescription('');
    setIsAddingDue(false);
    setSelectedCustomer(null);
    alert('বাকি যোগ করা হয়েছে!');
  };

  const startEditTransaction = (t: Transaction) => {
    setEditingTransactionId(t.id);
    setEditTransactionData({
      amount: t.amount.toString(),
      description: t.description
    });
  };

  const saveEditTransaction = (id: string) => {
    const amount = parseFloat(editTransactionData.amount);
    if (isNaN(amount)) return;

    onEditTransaction(id, {
      amount: amount,
      description: editTransactionData.description
    });
    setEditingTransactionId(null);
  };

  const handleWhatsAppReminder = (customer: Customer) => {
    const number = customer.whatsapp || customer.mobile;
    const cleanNumber = number.replace(/[^0-9+]/g, '');
    const phone = cleanNumber.startsWith('+88') ? cleanNumber : `+88${cleanNumber}`;
    const message = `প্রিয় ${customer.name},\n${userProfile?.shopName || 'দোকানের খাতা'} থেকে আপনার মোট বাকি ৳${customer.totalDue}।\nঅনুগ্রহ করে দ্রুত পরিশোধ করার অনুরোধ করা হলো।\nধন্যবাদ।`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleImoReminder = (customer: Customer) => {
    const number = customer.imo || customer.mobile;
    const cleanNumber = number.replace(/[^0-9+]/g, '');
    const phone = cleanNumber.startsWith('+88') ? cleanNumber : `+88${cleanNumber}`;
    const message = `প্রিয় ${customer.name},\n${userProfile?.shopName || 'দোকানের খাতা'} থেকে আপনার মোট বাকি ৳${customer.totalDue}।\nঅনুগ্রহ করে দ্রুত পরিশোধ করার অনুরোধ করা হলো।\nধন্যবাদ।`;
    // IMO doesn't have a direct web intent like WhatsApp, but we can try the intent URL scheme
    // Fallback to copying text and opening IMO
    navigator.clipboard.writeText(message).then(() => {
      alert('মেসেজ কপি করা হয়েছে। ইমু (IMO) অ্যাপ খুলে পেস্ট করুন।');
      window.location.href = `imo://`;
    });
  };

  const handleShareReminder = (customer: Customer) => {
    const message = `আসসালামু আলাইকুম ${customer.name},
${userProfile?.shopName || 'দোকানের খাতা'} থেকে বলছি। আপনার বর্তমান বকেয়া টাকার পরিমাণ ৳${customer.totalDue}। অনুগ্রহ করে দ্রুত বকেয়া পরিশোধ করার জন্য অনুরোধ করা হলো।

ধন্যবাদ।
প্রোঃ মোঃ সাজ্জাতুল ইসলাম
বাজিতেরপাড়া বাজার, মাদারগঞ্জ, জামালপুর।
মোবাইলঃ ০১৭১৬-০৪১০৪৮`;

    if (navigator.share) {
      navigator.share({
        title: 'বকেয়া পরিশোধের তাগাদা',
        text: message,
      }).catch(console.error);
    } else {
      const whatsappUrl = `https://wa.me/${customer.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('আপনি কি নিশ্চিত এই লেনদেন ডিলিট করতে চান?')) {
      onDeleteTransaction(id);
    }
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showStatementPreview, setShowStatementPreview] = useState(false);

  const generatePDF = async () => {
    if (!viewingCustomer) return;
    setIsGeneratingPDF(true);
    setShowStatementPreview(true);

    // Wait for a moment to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 500));

    const customerTransactions = transactions
      .filter(t => t.customerId === viewingCustomer.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const itemsPerPage = 20;
    const totalPages = Math.ceil(customerTransactions.length / itemsPerPage) || 1;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    try {
      for (let i = 0; i < totalPages; i++) {
        const pageElement = document.getElementById(`statement-page-${i}`);
        if (!pageElement) continue;

        const dataUrl = await toPng(pageElement, { 
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          skipFonts: false,
        });

        if (i > 0) pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      
      pdf.save(`${viewingCustomer.name}_Statement.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`PDF তৈরি করতে সমস্যা হয়েছে: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingPDF(false);
      setShowStatementPreview(false);
    }
  };

  if (viewingCustomer) {
    const customerTransactions = transactions
      .filter(t => t.customerId === viewingCustomer.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const itemsPerPage = 20;
    const chunks = [];
    for (let i = 0; i < customerTransactions.length; i += itemsPerPage) {
      chunks.push(customerTransactions.slice(i, i + itemsPerPage));
    }
    if (chunks.length === 0) chunks.push([]);

    return (
      <div className="space-y-6">
        {/* Statement Preview Modal */}
        {showStatementPreview && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="flex flex-col gap-8 py-10">
              <p className="text-white text-center font-black text-xl animate-pulse">PDF তৈরি হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>
              {chunks.map((chunk, pageIndex) => (
                <div 
                  key={pageIndex}
                  id={`statement-page-${pageIndex}`}
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
                    <p className="text-lg text-slate-900 mt-6 font-black border-y-2 border-slate-900 py-2 uppercase tracking-widest">কাস্টমার স্টেটমেন্ট</p>
                    
                    <div className="mt-8 flex justify-between items-end text-sm">
                      <div className="text-left space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">ক্রেতার তথ্য</p>
                        <p className="text-xl font-black text-slate-900">{viewingCustomer.name}</p>
                        <p className="font-bold text-slate-600">{viewingCustomer.mobile}</p>
                        <p className="text-slate-500">{viewingCustomer.address}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">তারিখ</p>
                        <p className="font-black text-lg">{format(new Date(), 'dd/MM/yyyy')}</p>
                        <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-100 mt-2">
                          <p className="text-[10px] text-red-400 uppercase font-bold">মোট বাকি</p>
                          <p className="text-xl font-black text-red-600">৳{viewingCustomer.totalDue}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-slate-900 text-left text-xs text-slate-500 uppercase">
                          <th className="py-4 font-black">তারিখ</th>
                          <th className="py-4 font-black">বিবরণ</th>
                          <th className="py-4 text-right font-black">ডেবিট (-)</th>
                          <th className="py-4 text-right font-black">ক্রেডিট (+)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {chunk.map((t, i) => {
                          const isCashSale = t.type === 'MEDICINE' && t.description.includes('(নগদ)');
                          const isDueSale = t.type === 'MEDICINE' && !t.description.includes('(নগদ)');
                          const isCredit = t.type === 'DUE_PAYMENT' || t.type === 'SALE_PAYMENT';
                          
                          return (
                            <tr key={i}>
                              <td className="py-4 text-slate-500 font-medium">
                                {format(new Date(t.date), 'dd/MM/yyyy')}
                              </td>
                              <td className="py-4 font-bold text-slate-800">{t.description}</td>
                              <td className="py-4 text-right text-red-600 font-black">
                                {isDueSale ? `+৳${t.amount.toFixed(0)}` : '-'}
                              </td>
                              <td className={`py-4 text-right font-black ${isCashSale ? 'text-blue-600' : 'text-emerald-600'}`}>
                                {(isCredit || isCashSale) ? `-৳${t.amount.toFixed(0)}` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-10 pt-10 border-t-2 border-slate-100 text-center">
                    <p className="text-sm text-slate-500 font-bold italic">ধন্যবাদ, আমাদের সাথেই থাকুন।</p>
                    <div className="mt-4 text-[9px] text-slate-300 uppercase tracking-[0.2em] space-y-1 font-medium">
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

        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md pb-4 border-b border-slate-100 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setViewingCustomerId(null)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">{viewingCustomer.name}</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <button
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <FileDown className="h-4 w-4" /> 
              {isGeneratingPDF ? 'তৈরি হচ্ছে...' : 'PDF'}
            </button>
            <button
              onClick={() => handleWhatsAppReminder(viewingCustomer)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] rounded-lg text-white text-sm whitespace-nowrap transition-colors shadow-sm"
            >
              WhatsApp
            </button>
            <button
              onClick={() => handleImoReminder(viewingCustomer)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00A3FF] hover:bg-[#0082CC] rounded-lg text-white text-sm whitespace-nowrap transition-colors shadow-sm"
            >
              IMO
            </button>
            <button
              onClick={() => handleShareReminder(viewingCustomer)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm whitespace-nowrap transition-colors shadow-sm"
            >
              <Share2 className="h-4 w-4" /> তাগাদা
            </button>
            <button
              onClick={() => {
                setEditCustomerData(viewingCustomer);
                setIsEditingCustomer(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 text-sm whitespace-nowrap transition-colors border border-slate-200"
            >
              <Edit className="h-4 w-4" /> এডিট
            </button>
          </div>
        </div>

        {isEditingCustomer && editCustomerData && (
          <Card className="bg-blue-50 border-blue-200 mb-6">
            <CardHeader>
              <CardTitle>তথ্য পরিবর্তন করুন</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateCustomer} className="grid gap-4 sm:grid-cols-3 items-end">
                <div>
                  <label className="text-sm font-medium text-slate-700">নাম</label>
                  <input
                    value={editCustomerData.name}
                    onChange={e => setEditCustomerData({...editCustomerData, name: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">মোবাইল</label>
                  <input
                    value={editCustomerData.mobile}
                    onChange={e => setEditCustomerData({...editCustomerData, mobile: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">WhatsApp নাম্বার (ঐচ্ছিক)</label>
                  <input
                    value={editCustomerData.whatsapp || ''}
                    onChange={e => setEditCustomerData({...editCustomerData, whatsapp: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                    placeholder="মোবাইল নাম্বারই হলে ফাঁকা রাখুন"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">IMO নাম্বার (ঐচ্ছিক)</label>
                  <input
                    value={editCustomerData.imo || ''}
                    onChange={e => setEditCustomerData({...editCustomerData, imo: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                    placeholder="মোবাইল নাম্বারই হলে ফাঁকা রাখুন"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">ঠিকানা</label>
                  <input
                    value={editCustomerData.address}
                    onChange={e => setEditCustomerData({...editCustomerData, address: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">টাকা দেওয়ার তারিখ</label>
                  <input
                    type="date"
                    value={editCustomerData.promiseDate || ''}
                    onChange={e => setEditCustomerData({...editCustomerData, promiseDate: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    সেভ করুন
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsEditingCustomer(false)}
                    className="bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300"
                  >
                    বাতিল
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-slate-50">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">বর্তমান বাকি</p>
              <p className="text-2xl font-bold text-red-600">৳ {viewingCustomer.totalDue}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-50">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">মোবাইল</p>
              <div className="flex flex-col gap-2 mt-1">
                <a 
                  href={`tel:${viewingCustomer.mobile}`}
                  className="text-lg font-medium text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" /> {viewingCustomer.mobile}
                </a>
                {viewingCustomer.whatsapp && (
                  <div className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="font-semibold text-[#25D366]">WA:</span> {viewingCustomer.whatsapp}
                  </div>
                )}
                {viewingCustomer.imo && (
                  <div className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="font-semibold text-[#00A3FF]">IMO:</span> {viewingCustomer.imo}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">ঠিকানা</p>
              <p className="text-lg font-medium text-slate-900">{viewingCustomer.address || 'নেই'}</p>
            </CardContent>
          </Card>
          {viewingCustomer.promiseDate && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-6">
                <p className="text-sm text-amber-600">টাকা দেওয়ার তারিখ</p>
                <p className="text-lg font-medium text-amber-900">
                  {format(new Date(viewingCustomer.promiseDate), 'dd MMM yyyy')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>লেনদেনের ইতিহাস</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customerTransactions.map((t) => {
                const isCashSale = t.type === 'MEDICINE' && t.description.includes('(নগদ)');
                const isDueSale = t.type === 'MEDICINE' && !t.description.includes('(নগদ)');
                const isCredit = t.type === 'DUE_PAYMENT' || t.type === 'SALE_PAYMENT';
                const isEditing = editingTransactionId === t.id;
                
                return (
                  <div 
                    key={t.id} 
                    className={`flex items-center justify-between p-4 rounded-lg border-l-4 shadow-sm ${
                      isDueSale ? 'bg-red-50 border-red-500' : 
                      isCashSale ? 'bg-blue-50 border-blue-500' :
                      'bg-emerald-50 border-emerald-500'
                    }`}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">
                            {format(new Date(t.date), 'dd MMM yyyy, hh:mm a')}
                          </span>
                          {t.type === 'MEDICINE' && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${t.description.includes('(নগদ)') ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                              {t.description.includes('(নগদ)') ? 'নগদ বিক্রয়' : 'বাকি বিক্রয়'}
                            </span>
                          )}
                          {(t.type === 'DUE_PAYMENT' || t.type === 'SALE_PAYMENT') && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-100 text-emerald-700">
                              জমা
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <button onClick={() => saveEditTransaction(t.id)} className="text-emerald-600 hover:text-emerald-800">
                                <Save className="h-4 w-4" />
                              </button>
                              <button onClick={() => setEditingTransactionId(null)} className="text-slate-500 hover:text-slate-700">
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEditTransaction(t)} className="text-blue-400 hover:text-blue-600">
                                <Edit className="h-3 w-3" />
                              </button>
                              <button onClick={() => handleDeleteTransaction(t.id)} className="text-red-400 hover:text-red-600">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        {isEditing ? (
                          <input
                            value={editTransactionData.description}
                            onChange={e => setEditTransactionData({...editTransactionData, description: e.target.value})}
                            className="w-full mr-4 rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        ) : (
                          <p className="font-medium text-slate-900">{t.description}</p>
                        )}
                        
                        {isEditing ? (
                          <input
                            type="number"
                            value={editTransactionData.amount}
                            onChange={e => setEditTransactionData({...editTransactionData, amount: e.target.value})}
                            className="w-24 rounded border border-slate-300 px-2 py-1 text-right font-bold"
                          />
                        ) : (
                          <p className={`text-lg font-bold ${
                            isDueSale ? 'text-red-600' : 
                            isCashSale ? 'text-blue-600' : 
                            'text-emerald-600'
                          }`}>
                            {isCredit ? '-' : '+'} ৳ {t.amount}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {customerTransactions.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  কোন লেনদেন পাওয়া যায়নি
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">কাস্টমার তালিকা</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          নতুন কাস্টমার
        </button>
      </div>

      {isAdding && (
        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader>
            <CardTitle>নতুন কাস্টমার যোগ করুন</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCustomer} className="grid gap-4 sm:grid-cols-3 items-end">
              <div>
                <label className="text-sm font-medium text-slate-700">নাম</label>
                <input
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">মোবাইল</label>
                <input
                  value={newCustomer.mobile}
                  onChange={e => setNewCustomer({...newCustomer, mobile: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">ঠিকানা</label>
                <input
                  value={newCustomer.address}
                  onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
              <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700">
                সংরক্ষণ করুন
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input
          placeholder="নাম বা মোবাইল নাম্বার দিয়ে খুঁজুন..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-emerald-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCustomers.map(customer => (
          <Card 
            key={customer.id} 
            className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 hover:border-emerald-300"
            onClick={() => setViewingCustomerId(customer.id)}
          >
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{customer.name}</h3>
                    <a 
                      href={`tel:${customer.mobile}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center text-xs text-slate-500 gap-1 hover:text-emerald-600 transition-colors"
                    >
                      <Phone className="h-3 w-3" /> {customer.mobile}
                    </a>
                  </div>
                </div>
                <div className={`text-right ${customer.totalDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  <p className="text-xs text-slate-500">মোট বাকি</p>
                  <p className="font-bold">৳ {customer.totalDue}</p>
                </div>
              </div>
              
              <div className="text-xs text-slate-500 mb-4 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {customer.address || 'ঠিকানা নেই'}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomer(customer);
                    setIsAddingDue(false);
                  }}
                  className="flex-1 bg-emerald-50 text-emerald-700 py-2 rounded-md text-sm font-medium hover:bg-emerald-100"
                >
                  জমা দিন
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomer(customer);
                    setIsAddingDue(true);
                  }}
                  className="flex-1 bg-red-50 text-red-700 py-2 rounded-md text-sm font-medium hover:bg-red-100"
                >
                  বাকি যোগ
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShareReminder(customer);
                  }}
                  className="bg-blue-50 text-blue-600 px-3 py-2 rounded-md hover:bg-blue-100 transition-colors"
                  title="তাগাদা পাঠান"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCustomer(customer.id);
                  }}
                  className="bg-slate-100 text-slate-400 px-3 py-2 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white">
            <CardHeader>
              <CardTitle>{isAddingDue ? 'বাকি যোগ করুন' : 'টাকা জমা'} - {selectedCustomer.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <p className="text-sm text-slate-500">বর্তমান বাকি</p>
                <p className="text-2xl font-bold text-red-600">৳ {selectedCustomer.totalDue}</p>
              </div>
              
              {isAddingDue ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-700">বাকির পরিমাণ</label>
                    <input
                      type="number"
                      value={dueAmount}
                      onChange={e => setDueAmount(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-lg"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">বিবরণ (ঐচ্ছিক)</label>
                    <input
                      type="text"
                      value={dueDescription}
                      onChange={e => setDueDescription(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                      placeholder="যেমন: নাপা এক্সট্রেন্ড"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-sm font-medium text-slate-700">জমার পরিমাণ</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-lg"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="flex-1 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  onClick={isAddingDue ? handleAddDue : handlePayment}
                  className={`flex-1 py-2 text-white rounded-md ${isAddingDue ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {isAddingDue ? 'বাকি যোগ করুন' : 'জমা দিন'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
