import React, { useState, useRef } from 'react';
import { AppSettings, UserProfile } from '../types';
import { Save, Trash2, AlertTriangle, Lock, User, Upload, Camera, Github, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface SettingsProps {
  settings: AppSettings;
  userProfile: UserProfile | null;
  onUpdateSettings: (settings: AppSettings) => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onResetData: () => void;
  onRestoreFromGithub: () => void;
}

export function Settings({ settings, userProfile, onUpdateSettings, onUpdateProfile, onResetData, onRestoreFromGithub }: SettingsProps) {
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
      const res = await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentLoginId,
          newLoginId: profileMobile,
          name: profileName,
          shopName: profileShopName,
          address: profileAddress,
          password: profilePassword,
          profilePic
        })
      });
      const data = await res.json();
      if (data.success) {
        onUpdateProfile(data.profile);
        localStorage.setItem('loginId', profileMobile);
        localStorage.setItem('password', profilePassword);
        alert('প্রোফাইল সফলভাবে আপডেট হয়েছে!');
      } else {
        alert(data.error || 'প্রোফাইল আপডেট ব্যর্থ হয়েছে');
      }
    } catch (err) {
      alert('নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleGitHubConnect = async () => {
    try {
      const res = await fetch('/api/auth/github/url');
      const { url } = await res.json();
      window.open(url, 'github_oauth', 'width=600,height=700');
    } catch (err) {
      alert('GitHub কানেক্ট করতে সমস্যা হয়েছে।');
    }
  };

  const isGitHubConnected = userProfile?.githubId && localStorage.getItem(`github_token_${userProfile.mobile}`);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-600" /> প্রোফাইল সেটিংস
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isGitHubConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                  <Github className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">GitHub স্টোরেজ</h3>
                  <p className="text-xs text-slate-500">আপনার তথ্য GitHub-এ ব্যাকআপ রাখুন</p>
                </div>
              </div>
              {isGitHubConnected ? (
                <div className="flex gap-2">
                  <button
                    onClick={onRestoreFromGithub}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1"
                  >
                    <Upload className="h-3 w-3 rotate-180" />
                    রিস্টোর
                  </button>
                  <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-md">
                    <CheckCircle2 className="h-3 w-3" />
                    কানেক্টেড
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleGitHubConnect}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                  <Github className="h-4 w-4" />
                  কানেক্ট করুন
                </button>
              )}
            </div>
          </div>

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

            <div className="pt-4 border-t space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Github className="h-4 w-4" /> সোশ্যাল অ্যাকাউন্ট
              </h3>
              
              {userProfile?.githubId ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-full">
                      <Github className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">GitHub যুক্ত আছে</p>
                      <p className="text-xs text-emerald-600">ইউজারনাম: {userProfile.githubUsername}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm('আপনি কি নিশ্চিত যে আপনি GitHub অ্যাকাউন্টটি ডিসকানেক্ট করতে চান?')) {
                          try {
                            const res = await fetch('/api/update-profile', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                currentLoginId: userProfile.mobile,
                                newLoginId: userProfile.mobile,
                                name: userProfile.name,
                                shopName: userProfile.shopName,
                                address: userProfile.address,
                                password: sessionStorage.getItem('password'),
                                profilePic: userProfile.profilePic,
                                githubId: null,
                                githubUsername: null
                              })
                            });
                            const data = await res.json();
                            if (data.success) {
                              onUpdateProfile(data.profile);
                              alert('GitHub অ্যাকাউন্ট সফলভাবে ডিসকানেক্ট হয়েছে।');
                            }
                          } catch (err) {
                            alert('ডিসকানেক্ট করতে সমস্যা হয়েছে।');
                          }
                        }
                      }}
                      className="text-xs font-bold text-red-500 hover:text-red-600 underline"
                    >
                      সরিয়ে ফেলুন
                    </button>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/auth/github/url');
                      const { url } = await res.json();
                      window.open(url, 'github_oauth', 'width=600,height=700');
                    } catch (err) {
                      alert('GitHub কানেক্ট করতে সমস্যা হয়েছে।');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
                >
                  <Github className="h-5 w-5" /> GitHub অ্যাকাউন্ট যুক্ত করুন
                </button>
              )}
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
