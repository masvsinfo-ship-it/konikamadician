import React, { useState, useRef } from 'react';
import { AppSettings, UserProfile } from '../types';
import { storageService } from '../services/storageService';
import { Save, Trash2, AlertTriangle, Lock, User, Upload, Camera, Github, CheckCircle2, Download, FileJson } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface SettingsProps {
  settings: AppSettings;
  userProfile: UserProfile | null;
  onUpdateSettings: (settings: AppSettings) => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onResetData: () => void;
}

export function Settings({ settings, userProfile, onUpdateSettings, onUpdateProfile, onResetData }: SettingsProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  
  // Profile State
  const [profileName, setProfileName] = useState(userProfile?.name || '');
  const [profileShopName, setProfileShopName] = useState(userProfile?.shopName || '');
  const [profileAddress, setProfileAddress] = useState(userProfile?.address || '');
  const [profileMobile, setProfileMobile] = useState(userProfile?.mobile || '');
  const [profilePassword, setProfilePassword] = useState(localStorage.getItem('password') || '');
  const [profilePic, setProfilePic] = useState(userProfile?.profilePic || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: keyof AppSettings, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: parseFloat(value) || 0,
    }));
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    alert('সেটিংস সংরক্ষণ করা হয়েছে!');
  };

  const handleBackup = () => {
    const loginId = localStorage.getItem('loginId');
    if (!loginId) return;
    
    const data = storageService.getBackupData(loginId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dokaner_khata_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.loginId || !data.password) {
          alert('ভুল ফাইল! এটি সঠিক ব্যাকআপ ফাইল নয়।');
          return;
        }

        if (confirm('আপনি কি এই ব্যাকআপ ফাইলটি রিস্টোর করতে চান? এটি আপনার বর্তমান সকল তথ্য মুছে ফেলবে।')) {
          const success = storageService.restoreBackupData(data);
          if (success) {
            alert('ব্যাকআপ সফলভাবে রিস্টোর হয়েছে! অ্যাপটি রিলোড হবে।');
            window.location.reload();
          } else {
            alert('ব্যাকআপ রিস্টোর করতে সমস্যা হয়েছে।');
          }
        }
      } catch (err) {
        alert('ফাইলটি পড়তে সমস্যা হয়েছে।');
      }
    };
    reader.readAsText(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        alert('ছবির সাইজ ১ মেগাবাইটের কম হতে হবে।');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const currentLoginId = localStorage.getItem('loginId');
      if (!currentLoginId) throw new Error('Not logged in');

      const result = storageService.updateProfile(currentLoginId, {
        loginId: profileMobile,
        password: profilePassword,
        profile: {
          name: profileName,
          shopName: profileShopName,
          address: profileAddress,
          mobile: profileMobile,
          profilePic
        }
      });

      if (result.success) {
        onUpdateProfile({
          name: profileName,
          shopName: profileShopName,
          address: profileAddress,
          mobile: profileMobile,
          profilePic
        });
        localStorage.setItem('loginId', profileMobile);
        localStorage.setItem('password', profilePassword);
        alert('প্রোফাইল সফলভাবে আপডেট হয়েছে!');
      } else {
        alert(result.error || 'প্রোফাইল আপডেট ব্যর্থ হয়েছে');
      }
    } catch (err) {
      alert('একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-600" /> প্রোফাইল সেটিংস
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-emerald-100 bg-slate-50 flex items-center justify-center">
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-slate-300" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2 rounded-full shadow-lg hover:bg-emerald-700 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              <p className="text-xs text-slate-500">সর্বোচ্চ ১ মেগাবাইট (1MB)</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">নাম</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-slate-300 px-3 py-2 border focus:border-emerald-500 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">দোকানের নাম</label>
                <input
                  type="text"
                  value={profileShopName}
                  onChange={(e) => setProfileShopName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-slate-300 px-3 py-2 border focus:border-emerald-500 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">ঠিকানা</label>
                <input
                  type="text"
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  className="mt-1 block w-full rounded-md border-slate-300 px-3 py-2 border focus:border-emerald-500 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">মোবাইল নাম্বার (লগইন আইডি)</label>
                <input
                  type="text"
                  value={profileMobile}
                  onChange={(e) => setProfileMobile(e.target.value)}
                  className="mt-1 block w-full rounded-md border-slate-300 px-3 py-2 border focus:border-emerald-500 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">নতুন পাসওয়ার্ড</label>
                <input
                  type="text"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-slate-300 px-3 py-2 border focus:border-emerald-500 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 transition-colors"
              >
                <Save className="h-4 w-4" />
                {isUpdatingProfile ? 'আপডেট হচ্ছে...' : 'প্রোফাইল সেভ করুন'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-emerald-600" /> ব্যাকআপ ও রিস্টোর (Backup & Restore)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-emerald-900">তথ্য ব্যাকআপ রাখুন</h4>
                <p className="text-xs text-emerald-700 mt-1">আপনার সকল তথ্য একটি ফাইল হিসেবে ডাউনলোড করে রাখুন। ফোন হারিয়ে গেলে বা ব্রাউজার ডাটা ক্লিয়ার হলে এটি কাজে লাগবে।</p>
              </div>
              <button
                onClick={handleBackup}
                className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all font-bold shrink-0"
              >
                <Download className="h-5 w-5" />
                ব্যাকআপ ডাউনলোড
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-900">ব্যাকআপ রিস্টোর করুন</h4>
                <p className="text-xs text-slate-500 mt-1">আগে ডাউনলোড করা ব্যাকআপ ফাইল থেকে তথ্য ফিরিয়ে আনুন।</p>
              </div>
              <div className="shrink-0">
                <input
                  type="file"
                  ref={importInputRef}
                  onChange={handleImport}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => importInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-100 transition-all font-bold"
                >
                  <FileJson className="h-5 w-5" />
                  ফাইল সিলেক্ট করুন
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>অ্যাপ সেটিংস</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 border-b pb-2">লাভের হার (Profit Rates)</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">সাধারণ পণ্যের লাভের হার (%)</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    value={localSettings.medicineProfitPercent}
                    onChange={(e) => handleChange('medicineProfitPercent', e.target.value)}
                    className="block w-full rounded-md border-slate-300 pl-3 pr-12 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2 border"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-slate-500 sm:text-sm">%</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">পণ্যের ক্রয় মূল্যের উপর ডিফল্ট লাভ</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">বিকাশ ক্যাশ আউট ফি (%)</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    value={localSettings.bkashCashOutFee}
                    onChange={(e) => handleChange('bkashCashOutFee', e.target.value)}
                    className="block w-full rounded-md border-slate-300 pl-3 pr-12 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2 border"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-slate-500 sm:text-sm">%</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">প্রতি হাজারে ১৮.৫০ টাকা হলে ১.৮৫%</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">ফ্লেক্সিলোড কমিশন (%)</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    value={localSettings.flexiloadCommission}
                    onChange={(e) => handleChange('flexiloadCommission', e.target.value)}
                    className="block w-full rounded-md border-slate-300 pl-3 pr-12 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2 border"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-slate-500 sm:text-sm">%</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">প্রতি হাজারে ২৭-৩০ টাকা হলে ২.৭-৩.০%</p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-between items-center border-t">
            <button
              onClick={onResetData}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium px-4 py-2 rounded-md hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              সকল তথ্য রিসেট করুন
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-md hover:bg-emerald-700 shadow-sm"
            >
              <Save className="h-4 w-4" />
              সংরক্ষণ করুন
            </button>
          </div>
          
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              <strong>সতর্কতা:</strong> "সকল তথ্য রিসেট করুন" বাটনে ক্লিক করলে আপনার দোকানের সকল কাস্টমার, লেনদেন এবং শর্ট লিস্টের তথ্য চিরতরে মুছে যাবে। এটি করার আগে নিশ্চিত হয়ে নিন।
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
