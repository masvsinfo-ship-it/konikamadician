import React, { useState, useEffect } from 'react';
import { Lock, BookOpen, ArrowRight, Download, Smartphone, Facebook, MessageCircle, AlertCircle, CheckCircle2, Loader2, UserPlus, LogIn, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { motion, AnimatePresence } from 'motion/react';

interface LoginPageProps {
  onLogin: (data: any, loginId: string, pass: string, profile?: any) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [lastTransactionAmount, setLastTransactionAmount] = useState('');
  const [recoveredPassword, setRecoveredPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) setServerStatus('online');
        else setServerStatus('offline');
      } catch (e) {
        setServerStatus('offline');
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 30000);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearInterval(interval);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('আপনার ব্রাউজারে "Add to Home Screen" অপশনটি ব্যবহার করে অ্যাপটি ইন্সটল করুন।');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRecovering) {
        const res = await fetch('/api/recover-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loginId, lastTransactionAmount })
        });
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          if (text.includes('<html') || text.includes('<!DOCTYPE')) {
            throw new Error(`সার্ভার সাময়িকভাবে বন্ধ আছে বা ইন্টারনেট সমস্যা (Error ${res.status})`);
          }
          throw new Error(`Invalid server response: ${text.substring(0, 50)}`);
        }
        if (data.success) {
          setRecoveredPassword(data.password);
        } else {
          setError(data.error || 'Recovery failed');
        }
      } else if (isRegistering) {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loginId, password, name, shopName, address })
        });
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse JSON:', text);
          if (text.includes('<html') || text.includes('<!DOCTYPE')) {
            throw new Error(`সার্ভার সাময়িকভাবে বন্ধ আছে বা ইন্টারনেট সমস্যা (Error ${res.status})`);
          }
          throw new Error(`Invalid server response: ${text.substring(0, 50)}`);
        }
        if (data.success) {
          onLogin({}, loginId, password, data.profile);
        } else {
          setError(data.error || 'Registration failed');
        }
      } else {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loginId, password })
        });
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse JSON:', text);
          if (text.includes('<html') || text.includes('<!DOCTYPE')) {
            throw new Error(`সার্ভার সাময়িকভাবে বন্ধ আছে বা ইন্টারনেট সমস্যা (Error ${res.status})`);
          }
          throw new Error(`Invalid server response: ${text.substring(0, 50)}`);
        }
        if (data.success) {
          onLogin(data.data, loginId, password, data.profile);
        } else {
          setError(data.error || 'Login failed');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(`Network error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-100/40 rounded-full blur-[120px]" />
      </div>
      
      <div className="w-full max-w-[440px] space-y-6 relative z-10">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="mx-auto h-20 w-20 bg-white rounded-3xl flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100 mb-4">
            <BookOpen className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">দোকানের খাতা</h1>
          <p className="text-slate-500 font-medium">আপনার ব্যবসার ডিজিটাল হিসাবরক্ষক</p>
          
          {/* Server Status Badge */}
          <div className="flex justify-center pt-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              serverStatus === 'online' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
              serverStatus === 'offline' ? 'bg-red-50 text-red-600 border-red-100' : 
              'bg-slate-50 text-slate-400 border-slate-100'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                serverStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 
                serverStatus === 'offline' ? 'bg-red-500' : 
                'bg-slate-300'
              }`} />
              {serverStatus === 'online' ? 'সার্ভার অনলাইন' : 
               serverStatus === 'offline' ? 'সার্ভার অফলাইন' : 
               'সার্ভার চেক করা হচ্ছে...'}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white/80 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-4 pt-8 px-8">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black text-slate-900">
                    {isRecovering ? 'পাসওয়ার্ড পুনরুদ্ধার' : (isRegistering ? 'নতুন একাউন্ট' : 'স্বাগতম')}
                  </CardTitle>
                  <CardDescription className="text-slate-500 font-medium mt-1">
                    {isRecovering ? 'প্রয়োজনীয় তথ্য দিয়ে পাসওয়ার্ড দেখুন' : (isRegistering ? 'আপনার দোকানের তথ্য দিয়ে শুরু করুন' : 'আপনার একাউন্টে প্রবেশ করুন')}
                  </CardDescription>
                </div>
                <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                  {isRecovering ? <KeyRound className="h-6 w-6" /> : (isRegistering ? <UserPlus className="h-6 w-6" /> : <LogIn className="h-6 w-6" />)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="px-8 pb-8">
              <AnimatePresence mode="wait">
                {recoveredPassword ? (
                  <motion.div 
                    key="recovered"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 py-4"
                  >
                    <div className="p-6 bg-emerald-50 rounded-[1.5rem] border border-emerald-100 text-center">
                      <p className="text-sm text-emerald-600 font-bold mb-3 uppercase tracking-widest">আপনার পাসওয়ার্ড</p>
                      <p className="text-4xl font-black text-emerald-900 tracking-[0.2em]">{recoveredPassword}</p>
                    </div>
                    <button
                      onClick={() => {
                        setRecoveredPassword('');
                        setIsRecovering(false);
                        setPassword('');
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-slate-900/10"
                    >
                      লগইন পেইজে ফিরে যান
                    </button>
                  </motion.div>
                ) : (
                  <motion.form 
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSubmit} 
                    className="space-y-4"
                  >
                    {isRegistering && !isRecovering && (
                      <div className="grid gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">আপনার নাম</label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); setError(''); }}
                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none font-medium"
                            placeholder="যেমন: মোঃ আব্দুল্লাহ"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">দোকানের নাম</label>
                            <input
                              type="text"
                              value={shopName}
                              onChange={(e) => { setShopName(e.target.value); setError(''); }}
                              className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none font-medium"
                              placeholder="দোকানের নাম"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">ঠিকানা</label>
                            <input
                              type="text"
                              value={address}
                              onChange={(e) => { setAddress(e.target.value); setError(''); }}
                              className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none font-medium"
                              placeholder="শহর/গ্রাম"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">মোবাইল নাম্বার</label>
                      <div className="relative">
                        <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                        <input
                          type="tel"
                          value={loginId}
                          onChange={(e) => { setLoginId(e.target.value); setError(''); }}
                          className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-5 py-3.5 text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none font-medium text-lg"
                          placeholder="017XXXXXXXX"
                          required
                        />
                      </div>
                    </div>

                    {isRecovering ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">সর্বশেষ লেনদেনের পরিমাণ</label>
                        <input
                          type="number"
                          value={lastTransactionAmount}
                          onChange={(e) => { setLastTransactionAmount(e.target.value); setError(''); }}
                          className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none font-medium"
                          placeholder="যেমন: 500"
                          required
                        />
                        <p className="text-[10px] text-slate-400 font-medium ml-1 italic">* নিরাপত্তা নিশ্চিত করতে শেষ লেনদেনের সঠিক পরিমাণ দিন</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">পাসওয়ার্ড</label>
                          {!isRegistering && (
                            <button
                              type="button"
                              onClick={() => { setIsRecovering(true); setError(''); }}
                              className="text-[10px] text-emerald-600 font-bold hover:underline uppercase tracking-wider"
                            >
                              ভুলে গেছেন?
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                            className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-5 py-3.5 text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none font-medium text-lg"
                            placeholder="••••••••"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2 p-4 bg-red-50 rounded-2xl border border-red-100 text-red-600"
                      >
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold leading-relaxed">{error}</p>
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading || (serverStatus === 'offline' && !isRecovering)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 group mt-4 relative overflow-hidden"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <span>{isRecovering ? 'পাসওয়ার্ড দেখুন' : (isRegistering ? 'একাউন্ট তৈরি করুন' : 'লগইন করুন')}</span>
                          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
              
              {!recoveredPassword && (
                <div className="mt-8 text-center">
                  <button 
                    type="button"
                    onClick={() => {
                      if (isRecovering) setIsRecovering(false);
                      else setIsRegistering(!isRegistering);
                      setError('');
                    }}
                    className="text-sm text-slate-500 hover:text-emerald-600 font-bold transition-colors"
                  >
                    {isRecovering ? 'লগইন পেইজে ফিরে যান' : (isRegistering ? 'আগে থেকে একাউন্ট আছে? লগইন করুন' : 'নতুন একাউন্ট খুলতে চান? এখানে ক্লিক করুন')}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer Actions */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <button
            onClick={handleInstallClick}
            className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 text-slate-600 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 group shadow-sm"
          >
            <Smartphone className="h-5 w-5 text-emerald-500" />
            <span>Android App ইন্সটল করুন</span>
            <Download className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>সকল তথ্য ক্লাউডে সুরক্ষিত</span>
            </div>
            
            <div className="pt-6 border-t border-slate-200/60">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-4">Developed By</p>
              <div className="flex items-center justify-center gap-3">
                <a 
                  href="https://fb.com/billal8795" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="h-10 w-10 flex items-center justify-center text-blue-600 bg-white rounded-xl shadow-sm border border-slate-100 hover:scale-110 transition-transform"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a 
                  href="https://wa.me/8801735308795" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="h-10 w-10 flex items-center justify-center text-emerald-600 bg-white rounded-xl shadow-sm border border-slate-100 hover:scale-110 transition-transform"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-4">© {new Date().getFullYear()} কনিকা মেডিসিন কর্ণার | জামালপুর</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
