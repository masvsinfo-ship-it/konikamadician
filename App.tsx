
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CalculatorCard from './components/CalculatorCard';
import ResultDisplay from './components/ResultDisplay';
import HistoryList from './components/HistoryList';
import AIAssistant from './components/AIAssistant';
import { CalculationResult, HistoryItem, CalcMode } from './types';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<CalcMode>('toMurubba');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [theme, setTheme] = useState<'emerald' | 'blue' | 'indigo'>('emerald');

  // Load history and theme from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('stone_calc_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedTheme = localStorage.getItem('stone_calc_theme') as any;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  const handleThemeChange = (newTheme: 'emerald' | 'blue' | 'indigo') => {
    setTheme(newTheme);
    localStorage.setItem('stone_calc_theme', newTheme);
  };

  const handleCalculate = (data: CalculationResult) => {
    setResult(data);
    const newItem: HistoryItem = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      label: `হিসাব ${history.length + 1}`
    };
    const updatedHistory = [newItem, ...history].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem('stone_calc_history', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('stone_calc_history');
  };

  const devFacebookUrl = "https://www.fb.com/billal8795"; 

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50/50 theme-${theme}`}>
      <Header 
        activeMode={activeMode} 
        setActiveMode={setActiveMode} 
        currentTheme={theme} 
        onThemeChange={handleThemeChange} 
      />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Calculator */}
          <div className="lg:col-span-2 space-y-8">
            <section className="animate-in fade-in duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-2 h-8 bg-${theme}-500 rounded-full shadow-lg shadow-${theme}-500/20`}></div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                  {activeMode === 'toMurubba' ? 'মাপ থেকে মুরুব্বা' : 
                   activeMode === 'toMurubbaFromPieces' ? 'পিস থেকে মুরুব্বা' :
                   activeMode === 'toPieces' ? 'মুরুব্বা থেকে পিস' : 'মিটার থেকে পিস'} ইনপুট
                </h2>
              </div>
              <CalculatorCard activeMode={activeMode} onCalculate={handleCalculate} themeColor={theme} />
            </section>

            {result && (
              <section className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-2 h-8 bg-slate-800 rounded-full shadow-lg"></div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                    হিসাবের ফলাফল
                  </h2>
                </div>
                <ResultDisplay result={result} themeColor={theme} />
              </section>
            )}

            <section>
                <AIAssistant currentCalculation={result} />
            </section>
          </div>

          {/* Right Column: History */}
          <div className="space-y-6">
            <section className="sticky top-32">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-slate-300 rounded-full"></div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                    সাম্প্রতিক হিসেব
                  </h2>
                </div>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors uppercase font-black tracking-widest bg-white px-3 py-1 rounded-full border border-red-50"
                  >
                    মুছে ফেলুন
                  </button>
                )}
              </div>
              <HistoryList items={history} onSelect={setResult} />
            </section>
          </div>

        </div>
      </main>

      {/* Ultra Slim Compact Footer */}
      <footer className="bg-white border-t-2 border-slate-100 py-6 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Left: Brand & Copyright */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 bg-${theme}-600 rounded-lg flex items-center justify-center text-white text-xs shadow-lg shadow-${theme}-500/20`}>
                <i className="fas fa-gem"></i>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">কারিনা গ্রুপ</span>
                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">© ২০২৬ সর্বস্বত্ব সংরক্ষিত</span>
              </div>
            </div>

            {/* Middle: Tagline (Small) */}
            <div className="hidden lg:block text-center">
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em] block mb-1">সহজ • নির্ভুল • দ্রুত</span>
              <div className="flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Netlify Status: Online</span>
              </div>
            </div>

            {/* Right: Developer Info with Link */}
            <div className="flex items-center gap-3 py-1.5 px-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ডেব্লপার:</span>
              <a 
                href={devFacebookUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`text-xs font-black text-${theme}-600 hover:underline decoration-2 underline-offset-4 transition-all`}
              >
                Md Billal
              </a>
              <div className={`w-1.5 h-1.5 rounded-full bg-${theme}-500 animate-pulse`}></div>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;