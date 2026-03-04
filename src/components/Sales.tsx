import React, { useState, useRef, useEffect } from 'react';
import { Transaction, Customer, AppSettings } from '../types';
import { Plus, Trash2, UserPlus, Search, X, FileDown, Printer, Check, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

interface SalesProps {
  customers: Customer[];
  settings: AppSettings;
  userProfile: any;
  onCompleteSale: (items: Transaction[], customerId?: string, paidAmount?: number) => void;
  onAddCustomer: (customer: Customer) => void;
}

interface CartItem {
  id: string;
  name: string;
  cost: number;
  price: number;
  qty: number;
}

interface InvoiceData {
  items: CartItem[];
  customer?: Customer;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  date: string;
  invoiceId: string;
}

export function Sales({ customers, settings, userProfile, onCompleteSale, onAddCustomer }: SalesProps) {
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerMobile, setNewCustomerMobile] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (previewContainerRef.current && showInvoice) {
        const containerWidth = previewContainerRef.current.offsetWidth - 64; // 64px for padding
        const a4WidthPx = 794; // Approximate width of 210mm in pixels
        if (containerWidth < a4WidthPx) {
          setPreviewScale(containerWidth / a4WidthPx);
        } else {
          setPreviewScale(1);
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [showInvoice]);

  const handleCostChange = (val: string) => {
    setCost(val);
    if (val && settings.medicineProfitPercent) {
      const costNum = parseFloat(val);
      const suggestedPrice = costNum + (costNum * settings.medicineProfitPercent / 100);
      setPrice(suggestedPrice.toFixed(2));
    }
  };

  const addToCart = () => {
    if (!name || !price) return;
    const itemPrice = parseFloat(price);
    const itemCost = cost ? parseFloat(cost) : itemPrice; // If cost is not provided, set it equal to price so profit is 0
    
    const newItem: CartItem = {
      id: Date.now().toString(),
      name,
      cost: itemCost,
      price: itemPrice,
      qty: parseInt(qty) || 1,
    };
    setCart([...cart, newItem]);
    setName('');
    setCost('');
    setPrice('');
    setQty('1');
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalCost = cart.reduce((sum, item) => sum + (item.cost * item.qty), 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;

    let finalCustomerId = selectedCustomerId;
    let finalCustomer: Customer | undefined = customers.find(c => c.id === selectedCustomerId);

    if (isNewCustomer && newCustomerName) {
      const newCustomer: Customer = {
        id: Date.now().toString(),
        name: newCustomerName,
        mobile: newCustomerMobile,
        address: newCustomerAddress,
        totalDue: 0,
      };
      onAddCustomer(newCustomer);
      finalCustomerId = newCustomer.id;
      finalCustomer = newCustomer;
    }

    const transactions: Transaction[] = cart.map(item => ({
      id: Math.random().toString(36).substr(2, 9),
      type: 'MEDICINE',
      amount: item.price * item.qty,
      cost: item.cost * item.qty,
      profit: (item.price - item.cost) * item.qty,
      date: new Date().toISOString(),
      description: `${item.name} x${item.qty}`,
      customerId: finalCustomerId || undefined,
    }));

    const paid = paidAmount !== '' ? parseFloat(paidAmount) : totalAmount;
    
    // Prepare Invoice Data
    const invoice: InvoiceData = {
      items: [...cart],
      customer: finalCustomer,
      totalAmount,
      paidAmount: paid,
      dueAmount: Math.max(0, totalAmount - paid),
      date: new Date().toISOString(),
      invoiceId: Date.now().toString().slice(-6),
    };
    setInvoiceData(invoice);
    setShowInvoice(true);

    // Complete Sale in Background
    onCompleteSale(transactions, finalCustomerId, paid);
    
    // Reset Form
    setCart([]);
    setPaidAmount('');
    setSelectedCustomerId('');
    setIsNewCustomer(false);
    setNewCustomerName('');
    setNewCustomerMobile('');
    setNewCustomerAddress('');
  };

  const generateInvoicePDF = async () => {
    setIsGeneratingPDF(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const itemsPerPage = 15;
    const totalItems = invoiceData?.items.length || 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    try {
      for (let i = 0; i < totalPages; i++) {
        const pageElement = document.getElementById(`invoice-page-${i}`);
        if (!pageElement) continue;

        const dataUrl = await toPng(pageElement, { 
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          skipFonts: false,
        });

        if (i > 0) pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      
      pdf.save(`Invoice_${invoiceData?.invoiceId}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('PDF তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (showInvoice && invoiceData) {
    const itemsPerPage = 15;
    const chunks = [];
    for (let i = 0; i < invoiceData.items.length; i += itemsPerPage) {
      chunks.push(invoiceData.items.slice(i, i + itemsPerPage));
    }
    if (chunks.length === 0) chunks.push([]);

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-slate-800/40 rounded-xl shadow-2xl max-w-5xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-4 border-b bg-white flex justify-between items-center">
            <div className="flex items-center gap-2 text-emerald-600">
              <div className="bg-emerald-100 p-1.5 rounded-full">
                <Check className="h-4 w-4" />
              </div>
              <h3 className="font-bold">ইনভয়েস প্রিভিউ (A4 সাইজ)</h3>
            </div>
            <button onClick={() => setShowInvoice(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div 
            ref={previewContainerRef}
            className="p-4 sm:p-8 bg-slate-200/50 overflow-y-auto max-h-[75vh] flex flex-col items-center gap-4 overflow-x-hidden print:p-0 print:bg-white print:overflow-visible print:max-h-none"
          >
            {chunks.map((chunk, pageIndex) => (
              <div 
                key={pageIndex}
                className="origin-top transition-transform duration-200 print:transform-none print:h-auto print:w-auto print:mb-0"
                style={{ 
                  transform: `scale(${previewScale})`,
                  height: `${297 * 3.7795 * previewScale}px`, // 297mm in px * scale
                  width: `${210 * 3.7795 * previewScale}px`,
                  marginBottom: pageIndex < chunks.length - 1 ? `${40 * previewScale}px` : 0
                }}
              >
                <div 
                  id={`invoice-page-${pageIndex}`}
                  className="bg-white shadow-2xl p-[15mm] flex flex-col"
                  style={{ 
                    width: '210mm', 
                    height: '297mm', 
                    minHeight: '297mm',
                    boxSizing: 'border-box',
                    position: 'relative' 
                  }}
                >
                {/* Header */}
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">{userProfile?.shopName || 'দোকানের খাতা'}</h2>
                  <p className="text-xs text-slate-500 uppercase tracking-[0.2em] mt-1 font-bold">বাকি | নগদ | হিসাব</p>
                  <div className="mt-4 text-xs text-slate-500 space-y-0.5">
                    <p className="font-bold text-slate-700">{userProfile?.name || 'প্রোঃ মোঃ সাজ্জাতুল ইসলাম'}</p>
                    <p>{userProfile?.address || 'বাজিতেরপাড়া বাজার, মাদারগঞ্জ, জামালপুর।'}</p>
                    <p className="font-bold">মোবাইলঃ {userProfile?.mobile || '০১৭১৬-০৪১০৪৮'}</p>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-y-2 border-slate-900 py-3">
                    <div className="text-left">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">ইনভয়েস নং</p>
                      <p className="text-base font-black text-slate-900">#{invoiceData.invoiceId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">তারিখ</p>
                      <p className="text-base font-black text-slate-900">{format(new Date(invoiceData.date), 'dd/MM/yyyy')}</p>
                      <div className="mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${invoiceData.dueAmount <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {invoiceData.dueAmount <= 0 ? 'নগদ' : 'বাকি'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {pageIndex === 0 && invoiceData.customer && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-xl border-2 border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">ক্রেতার তথ্য</p>
                      <p className="text-lg font-black text-slate-900">{invoiceData.customer.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{invoiceData.customer.mobile}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>{invoiceData.customer.address}</p>
                    </div>
                  </div>
                )}

                <div className="flex-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] text-slate-500 uppercase border-b-2 border-slate-900">
                        <th className="text-left py-2 font-black">বিবরণ</th>
                        <th className="text-center py-2 font-black">পরিমাণ</th>
                        <th className="text-right py-2 font-black">একক দাম</th>
                        <th className="text-right py-2 font-black">মোট</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {chunk.map((item, i) => (
                        <tr key={i}>
                          <td className="py-2.5 text-slate-800 font-bold">{item.name}</td>
                          <td className="text-center py-2.5 text-slate-600 font-medium">{item.qty}</td>
                          <td className="text-right py-2.5 text-slate-600">৳{item.price.toFixed(0)}</td>
                          <td className="text-right py-2.5 text-slate-900 font-black">৳{(item.price * item.qty).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer - Only on last page */}
                {pageIndex === chunks.length - 1 && (
                  <div className="mt-6 pt-6 border-t-2 border-slate-900">
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between text-slate-600 text-sm">
                          <span>মোট বিল</span>
                          <span className="font-bold">৳{invoiceData.totalAmount.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 text-sm">
                          <span>নগদ জমা</span>
                          <span className="font-bold">৳{invoiceData.paidAmount.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between text-red-600 text-xl font-black pt-2 border-t-2 border-slate-200">
                          <span>বাকি</span>
                          <span>৳{invoiceData.dueAmount.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-16 flex justify-between items-end px-6">
                      <div className="text-center">
                        <div className="w-32 border-t-2 border-slate-900 mb-1"></div>
                        <p className="text-[10px] font-bold text-slate-900">ক্রেতার স্বাক্ষর</p>
                      </div>
                      <div className="text-center">
                        <div className="w-32 border-t-2 border-slate-900 mb-1"></div>
                        <p className="text-[10px] font-bold text-slate-900">কর্তৃপক্ষের স্বাক্ষর</p>
                      </div>
                    </div>

                    <div className="mt-10 text-center border-t border-slate-100 pt-4">
                      <p className="text-xs text-slate-500 font-bold italic">ধন্যবাদ, আবার আসবেন।</p>
                      <div className="mt-2 text-[8px] text-slate-300 uppercase tracking-[0.2em] space-y-0.5 font-medium">
                        <p>Developed by: fb.com/billal8795 | WhatsApp: +8801735308795</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="absolute bottom-6 right-[20mm] text-[10px] text-slate-400 font-bold">
                  Page {pageIndex + 1} of {chunks.length} | {userProfile?.shopName || 'দোকানের খাতা'}
                </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 border-t bg-white grid grid-cols-2 gap-6">
            <button
              onClick={generateInvoicePDF}
              disabled={isGeneratingPDF}
              className="flex items-center justify-center gap-3 bg-emerald-600 text-white py-4 rounded-xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 disabled:opacity-50"
            >
              <FileDown className="h-6 w-6" />
              {isGeneratingPDF ? 'PDF তৈরি হচ্ছে...' : 'PDF সেভ করুন (A4)'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-3 bg-slate-900 text-white py-4 rounded-xl font-black text-lg hover:bg-slate-950 transition-all shadow-xl shadow-slate-300"
            >
              <Printer className="h-6 w-6" /> প্রিন্ট করুন
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left: Add Item Form */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>পণ্য যোগ করুন</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">পণ্যের নাম</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="পণ্যের নাম..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">ক্রয় মূল্য (ঐচ্ছিক)</label>
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => handleCostChange(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">বিক্রয় মূল্য</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">পরিমাণ</label>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={addToCart}
                  className="w-full rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  যোগ করুন
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cart Table */}
        <Card>
          <CardHeader>
            <CardTitle>বর্তমান বিল</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-2">নাম</th>
                    <th className="px-4 py-2">পরিমাণ</th>
                    <th className="px-4 py-2">দাম</th>
                    <th className="px-4 py-2">মোট</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2">{item.qty}</td>
                      <td className="px-4 py-2">৳{item.price}</td>
                      <td className="px-4 py-2">৳{(item.price * item.qty).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        কোন আইটেম যোগ করা হয়নি
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Checkout */}
      <div className="space-y-6">
        <Card className="bg-slate-900 text-white">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between text-lg">
                <span>মোট বিল</span>
                <span className="font-bold">৳ {totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>মোট লাভ</span>
                <span>৳ {(totalAmount - totalCost).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>চেকআউট</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Selection */}
            {!isNewCustomer ? (
              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-slate-700">কাস্টমার খুঁজুন বা নির্বাচন করুন</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="নাম বা মোবাইল দিয়ে খুঁজুন..."
                    value={selectedCustomerId ? (customers.find(c => c.id === selectedCustomerId)?.name || '') : customerSearchTerm}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      setSelectedCustomerId('');
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="block w-full rounded-md border border-slate-300 pl-10 pr-10 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
                  />
                  {(selectedCustomerId || customerSearchTerm) && (
                    <button 
                      onClick={() => {
                        setSelectedCustomerId('');
                        setCustomerSearchTerm('');
                        setShowCustomerDropdown(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {showCustomerDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div 
                      className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm font-bold text-slate-700 border-b border-slate-100"
                      onClick={() => {
                        setSelectedCustomerId('');
                        setCustomerSearchTerm('');
                        setShowCustomerDropdown(false);
                      }}
                    >
                      সাধারণ কাস্টমার (নগদ)
                    </div>
                    {customers
                      .filter(c => 
                        c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || 
                        c.mobile.includes(customerSearchTerm)
                      )
                      .map((c) => (
                        <div
                          key={c.id}
                          className="px-4 py-2 hover:bg-emerald-50 cursor-pointer text-sm flex justify-between items-center"
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setCustomerSearchTerm(c.name);
                            setShowCustomerDropdown(false);
                          }}
                        >
                          <div>
                            <p className="font-bold text-slate-900">{c.name}</p>
                            <p className="text-xs text-slate-500">{c.mobile}</p>
                          </div>
                          {c.totalDue > 0 && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                              বাকি: ৳{c.totalDue}
                            </span>
                          )}
                        </div>
                      ))}
                    {customers.filter(c => 
                      c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || 
                      c.mobile.includes(customerSearchTerm)
                    ).length === 0 && customerSearchTerm && (
                      <div className="px-4 py-3 text-center text-xs text-slate-400 italic">
                        কোন কাস্টমার পাওয়া যায়নি
                      </div>
                    )}
                  </div>
                )}

                {selectedCustomerId && (
                  <div className="flex justify-end">
                    <a 
                      href={`tel:${customers.find(c => c.id === selectedCustomerId)?.mobile}`}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" /> কল করুন: {customers.find(c => c.id === selectedCustomerId)?.mobile}
                    </a>
                  </div>
                )}
                <button
                  onClick={() => setIsNewCustomer(true)}
                  className="text-sm text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <UserPlus className="h-3 w-3" /> নতুন কাস্টমার যোগ করুন
                </button>
              </div>
            ) : (
              <div className="space-y-2 border-l-2 border-emerald-500 pl-3 bg-emerald-50/50 p-2 rounded-r-md">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-emerald-700">নতুন কাস্টমার</span>
                  <button onClick={() => setIsNewCustomer(false)} className="text-xs text-red-500">বাতিল</button>
                </div>
                <input
                  placeholder="নাম"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="block w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
                <input
                  placeholder="মোবাইল"
                  value={newCustomerMobile}
                  onChange={(e) => setNewCustomerMobile(e.target.value)}
                  className="block w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
                <input
                  placeholder="ঠিকানা"
                  value={newCustomerAddress}
                  onChange={(e) => setNewCustomerAddress(e.target.value)}
                  className="block w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              </div>
            )}

            {/* Payment */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700">জমা দেওয়া টাকা</label>
                {selectedCustomerId && customers.find(c => c.id === selectedCustomerId)?.totalDue! > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                    পূর্বের বাকি: ৳ {customers.find(c => c.id === selectedCustomerId)?.totalDue}
                  </span>
                )}
              </div>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder={totalAmount.toString()}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">এই বিক্রয়ে বাকি:</span>
                  <span className={paidAmount !== '' && parseFloat(paidAmount) < totalAmount ? "text-red-600 font-bold" : "text-slate-600"}>
                    ৳ {Math.max(0, totalAmount - (parseFloat(paidAmount) || 0)).toFixed(2)}
                  </span>
                </div>
                {selectedCustomerId && (
                  <div className="flex justify-between text-sm border-t border-slate-100 pt-1 mt-1">
                    <span className="font-medium text-slate-700">সর্বমোট বাকি হবে:</span>
                    <span className="font-black text-red-600">
                      ৳ {( (customers.find(c => c.id === selectedCustomerId)?.totalDue || 0) + Math.max(0, totalAmount - (parseFloat(paidAmount) || 0)) ).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full rounded-md bg-slate-900 px-4 py-3 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              বিক্রয় সম্পন্ন করুন
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
