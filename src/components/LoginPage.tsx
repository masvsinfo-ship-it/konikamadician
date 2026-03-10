import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { 
  Lock, 
  BookOpen, 
  ArrowRight, 
  Download, 
  Smartphone, 
  Facebook, 
  MessageCircle, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  UserPlus, 
  LogIn, 
  KeyRound,
  ShieldCheck,
  CloudLightning,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginPageProps {
  onLogin: (data: any, loginId: string, pass: string, profile?: any) => void;
  deferredPrompt: any;
  setDeferredPrompt: (prompt: any) => void;
}

type AuthMode = 'login' | 'register' | 'recover';

export function LoginPage({ onLogin, deferredPrompt, setDeferredPrompt }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [lastTransactionAmount, setLastTransactionAmount] = useState('');
  const [recoveredPassword, setRecoveredPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInstallLoading, setIsInstallLoading] = useState(false);

  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsInstalled(true);
        }
      } catch (err) {
        console.error('Install error:', err);
      }
    } else {
      // If prompt is not ready, show a brief loading state instead of alerts
      setIsInstallLoading(true);
      setTimeout(() => {
        setIsInstallLoading(false);
        // Try to check if it's already installed or if we can trigger it now
        if (window.matchMedia('(display-mode: standalone)').matches) {
          setIsInstalled(true);
        } else {
          // If still not ready, we can't force the browser, but we avoid showing "rules"
          console.log('Install prompt not yet ready');
        }
      }, 1500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate a small delay for better UX
    setTimeout(() => {
      try {
        if (mode === 'recover') {
          const result = storageService.recoverPassword(loginId, lastTransactionAmount);
          if (result.success) setRecoveredPassword(result.password!);
          else setError(result.error || 'পাসওয়ার্ড উদ্ধার করা সম্ভব হয়নি।');
        } else if (mode === 'register') {
          const result = storageService.register({
            loginId,
            password,
            profile: { name, shopName, address, mobile: loginId }
          });
          if (result.success) {
            const loginResult = storageService.login(loginId, password);
            if (loginResult.success) onLogin(loginResult.data, loginId, password, loginResult.profile);
            else setMode('login');
          } else {
            setError(result.error || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।');
          }
        } else {
          const result = storageService.login(loginId, password);
          if (result.success) onLogin(result.data, loginId, password, result.profile);
          else setError(result.error || 'লগইন ব্যর্থ হয়েছে। সঠিক তথ্য দিন।');
        }
      } catch (err: any) {
        setError('একটি সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
      } finally {
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white selection:bg-emerald-100 selection:text-emerald-900">
      {/* Left Pane - Brand & Info (Desktop Only) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-emerald-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]" />
          <div className="grid grid-cols-10 gap-4 p-8">
            {Array.from({ length: 100 }).map((_, i) => (
              <div key={i} className="h-1 w-1 bg-white rounded-full opacity-20" />
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-xl">
              <BookOpen className="h-7 w-7" />
            </div>
            <span className="text-2xl font-black tracking-tight">দোকানের খাতা</span>
          </div>

          <div className="space-y-8 max-w-md">
            <h1 className="text-6xl font-black leading-[1.1] tracking-tighter">
              আপনার ব্যবসার <br />
              <span className="text-emerald-200">ডিজিটাল</span> হিসাবরক্ষক
            </h1>
            <p className="text-xl text-emerald-50/80 font-medium leading-relaxed">
              সহজ, নিরাপদ এবং আধুনিক পদ্ধতিতে আপনার দোকানের বাকি-নগদ হিসাব রাখুন। যেকোনো জায়গা থেকে যেকোনো সময়।
            </p>

            <div className="grid gap-6 pt-8">
              {[
                { icon: ShieldCheck, title: '১০০% নিরাপদ', desc: 'আপনার সকল তথ্য ক্লাউডে এনক্রিপ্টেড অবস্থায় থাকে।' },
                { icon: CloudLightning, title: 'দ্রুত ও সহজ', desc: 'খুব সহজেই লেনদেন এন্ট্রি এবং কাস্টমার ম্যানেজমেন্ট।' },
                { icon: LayoutDashboard, title: 'স্মার্ট ড্যাশবোর্ড', desc: 'এক নজরে লাভ-ক্ষতি এবং বকেয়া টাকার হিসাব।' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{item.title}</h4>
                    <p className="text-sm text-emerald-50/60">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between pt-12 border-t border-white/10">
          <div className="flex gap-4">
            <a href="https://fb.com/billal8795" target="_blank" className="hover:scale-110 transition-transform"><Facebook className="h-5 w-5" /></a>
            <a href="https://wa.me/8801735308795" target="_blank" className="hover:scale-110 transition-transform"><MessageCircle className="h-5 w-5" /></a>
          </div>
          <p className="text-xs font-bold opacity-60 uppercase tracking-widest">© {new Date().getFullYear()} কনিকা মেডিসিন কর্ণার</p>
        </div>
      </div>

      {/* Right Pane - Auth Form */}
      <div className="flex flex-col justify-center items-center p-6 lg:p-12 bg-slate-50/50">
        <div className="w-full max-w-[420px] space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center gap-4 mb-8">
            <div className="h-16 w-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <BookOpen className="h-9 w-9" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">দোকানের খাতা</h1>
              <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest">ডিজিটাল হিসাব খাতা</p>
            </div>
          </div>

          <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 relative">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                {mode === 'login' ? 'স্বাগতম!' : mode === 'register' ? 'নতুন একাউন্ট' : 'পাসওয়ার্ড উদ্ধার'}
              </h2>
              <p className="text-slate-500 font-medium mt-1">
                {mode === 'login' ? 'আপনার একাউন্টে লগইন করুন' : mode === 'register' ? 'আপনার দোকানের তথ্য দিন' : 'প্রয়োজনীয় তথ্য দিয়ে পাসওয়ার্ড দেখুন'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {recoveredPassword ? (
                <motion.div
                  key="recovered"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-100 text-center">
                    <p className="text-xs text-emerald-600 font-black uppercase tracking-[0.2em] mb-3">আপনার পাসওয়ার্ড</p>
                    <p className="text-5xl font-black text-emerald-900 tracking-widest">{recoveredPassword}</p>
                  </div>
                  <button
                    onClick={() => { setRecoveredPassword(''); setMode('login'); }}
                    className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all"
                  >
                    লগইন করুন
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key={mode}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  {mode === 'register' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">আপনার নাম</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-slate-900 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium"
                          placeholder="যেমন: মোঃ আব্দুল্লাহ"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">দোকানের নাম</label>
                          <input
                            type="text"
                            required
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-slate-900 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium"
                            placeholder="দোকানের নাম"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ঠিকানা</label>
                          <input
                            type="text"
                            required
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-slate-900 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium"
                            placeholder="শহর/গ্রাম"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">মোবাইল নাম্বার</label>
                    <div className="relative">
                      <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                      <input
                        type="tel"
                        required
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-5 py-4 text-slate-900 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-bold text-lg"
                        placeholder="017XXXXXXXX"
                      />
                    </div>
                  </div>

                  {mode === 'recover' ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">সর্বশেষ লেনদেনের পরিমাণ</label>
                      <input
                        type="number"
                        required
                        value={lastTransactionAmount}
                        onChange={(e) => setLastTransactionAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-900 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-bold"
                        placeholder="যেমন: ৫০০"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">পাসওয়ার্ড</label>
                        {mode === 'login' && (
                          <button 
                            type="button" 
                            onClick={() => setMode('recover')}
                            className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline"
                          >
                            ভুলে গেছেন?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-5 py-4 text-slate-900 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-bold text-lg"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  )}

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 bg-red-50 rounded-2xl border border-red-100 flex gap-3 text-red-600"
                    >
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <p className="text-xs font-bold leading-tight">{error}</p>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 group mt-4"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <span>
                          {mode === 'login' ? 'লগইন করুন' : mode === 'register' ? 'একাউন্ট তৈরি করুন' : 'পাসওয়ার্ড দেখুন'}
                        </span>
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError('');
                  setRecoveredPassword('');
                }}
                className="text-sm font-bold text-slate-400 hover:text-emerald-600 transition-colors"
              >
                {mode === 'login' ? 'নতুন একাউন্ট খুলতে চান? এখানে ক্লিক করুন' : 'আগে থেকে একাউন্ট আছে? লগইন করুন'}
              </button>
            </div>
          </div>

          {/* App Install & Footer */}
          <div className="space-y-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <button
                type="button"
                onClick={isInstalled || isInstallLoading ? undefined : handleInstall}
                className={`relative w-full bg-white border border-slate-200 p-5 rounded-[2rem] flex items-center gap-5 transition-all shadow-xl shadow-slate-200/50 ${isInstalled || isInstallLoading ? 'opacity-75 cursor-default' : 'hover:bg-slate-50'}`}
              >
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform ${isInstalled ? 'bg-slate-400' : isInstallLoading ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-600 shadow-emerald-600/20 group-hover:scale-110'}`}>
                  {isInstallLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Smartphone className="h-8 w-8" />}
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">
                    {isInstalled ? 'App Installed' : isInstallLoading ? 'Preparing...' : 'Android APK Installer'}
                  </p>
                  <p className="text-xl font-black text-slate-900 leading-none">
                    {isInstalled ? 'সফলভাবে ইন্সটল হয়েছে' : isInstallLoading ? 'প্রসেসিং হচ্ছে...' : 'সরাসরি ইন্সটল করুন'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">
                    {isInstalled ? 'হোম স্ক্রিন থেকে ওপেন করুন' : isInstallLoading ? 'দয়া করে অপেক্ষা করুন' : 'অটোমেটিক এন্ড্রয়েড ইন্সটলেশন'}
                  </p>
                </div>
                <div className="ml-auto flex flex-col items-center gap-1">
                  {isInstalled ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  ) : isInstallLoading ? (
                    <div className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Download className="h-6 w-6 text-emerald-600 animate-bounce" />
                      <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">APK</span>
                    </>
                  )}
                </div>
              </button>
            </div>

            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                <span>১০০% নিরাপদ ও ডিজিটাল হিসাব খাতা</span>
              </div>
              <p className="text-[10px] font-bold text-slate-300">© {new Date().getFullYear()} কনিকা মেডিসিন কর্ণার | জামালপুর</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
