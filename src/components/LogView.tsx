import React, { useState, useMemo } from 'react';
import { LogEntry, ScanEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, TrendingUp, Trash2, Plus, Droplet, Minus, Crown, CheckCircle2, History, Utensils, ChevronLeft, ChevronRight } from 'lucide-react';
import { WeeklyChart } from './WeeklyChart';
import { AdBanner } from './AdBanner';

interface DailyStats {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface LogViewProps {
  entries: LogEntry[];
  scans: ScanEntry[];
  onDelete: (id: string) => void;
  onDeleteScan: (id: string) => void;
  onItemClick: (item: LogEntry | ScanEntry) => void;
  dailyGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  waterAmount: number;
  onUpdateWater: (amount: number) => void;
  isPremium: boolean;
  onUpgradeClick: () => void;
}

export const LogView: React.FC<LogViewProps> = ({ 
  entries, 
  scans,
  onDelete, 
  onDeleteScan,
  onItemClick,
  dailyGoal,
  proteinGoal,
  carbsGoal,
  fatGoal,
  waterAmount,
  onUpdateWater,
  isPremium,
  onUpgradeClick
}) => {
  const [activeTab, setActiveTab] = useState<'meals' | 'scans'>('meals');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const isToday = useMemo(() => {
    const today = new Date();
    return selectedDate.getDate() === today.getDate() &&
           selectedDate.getMonth() === today.getMonth() &&
           selectedDate.getFullYear() === today.getFullYear();
  }, [selectedDate]);

  const filteredEntries = useMemo(() => {
    if (!isPremium) {
      // Non-premium only see today
      const today = new Date();
      return entries.filter(entry => {
        const d = new Date(entry.timestamp);
        return d.getDate() === today.getDate() &&
               d.getMonth() === today.getMonth() &&
               d.getFullYear() === today.getFullYear();
      });
    }
    // Premium see selected date
    return entries.filter(entry => {
      const d = new Date(entry.timestamp);
      return d.getDate() === selectedDate.getDate() &&
             d.getMonth() === selectedDate.getMonth() &&
             d.getFullYear() === selectedDate.getFullYear();
    });
  }, [entries, isPremium, selectedDate]);

  const filteredScans = useMemo(() => {
    if (!isPremium) {
      // Non-premium only see today
      const today = new Date();
      return scans.filter(scan => {
        const d = new Date(scan.timestamp);
        return d.getDate() === today.getDate() &&
               d.getMonth() === today.getMonth() &&
               d.getFullYear() === today.getFullYear();
      });
    }
    // Premium see selected date
    return scans.filter(scan => {
      const d = new Date(scan.timestamp);
      return d.getDate() === selectedDate.getDate() &&
             d.getMonth() === selectedDate.getMonth() &&
             d.getFullYear() === selectedDate.getFullYear();
    });
  }, [scans, isPremium, selectedDate]);

  const stats: DailyStats = useMemo(() => filteredEntries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: acc.protein + entry.protein,
      carbs: acc.carbs + entry.carbs,
      fat: acc.fat + entry.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  ), [filteredEntries]);

  const progress = Math.min((stats.calories / dailyGoal) * 100, 100);

  const changeDate = (days: number) => {
    if (!isPremium && days !== 0) return;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-zinc-900">Your Logbook</h2>
          <div className="flex items-center gap-2 text-zinc-500 font-medium">
            <Calendar className="w-4 h-4" />
            <span>
              {isToday ? 'Today, ' : ''}
              {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
        
        {isPremium && (
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            <button 
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-white rounded-lg transition-colors text-zinc-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setSelectedDate(new Date())}
              className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-white rounded-lg transition-colors text-zinc-600"
            >
              Today
            </button>
            <button 
              onClick={() => changeDate(1)}
              disabled={isToday}
              className="p-2 hover:bg-white rounded-lg transition-colors text-zinc-600 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {!isPremium && (
        <div className="mt-4 mb-2">
          <AdBanner type="banner" />
        </div>
      )}

      {/* Daily Summary Card */}
      <div className="bg-zinc-900 text-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Calories</p>
              <h3 className="text-4xl font-bold">{stats.calories} <span className="text-lg font-medium text-zinc-500">/ {dailyGoal}</span></h3>
            </div>
            <div className="text-right">
              <p className="text-emerald-400 text-sm font-bold">{Math.round(progress)}%</p>
            </div>
          </div>
          
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-6">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-zinc-800 pt-4">
            <MacroMiniStat label="Protein" value={stats.protein} goal={proteinGoal} unit="g" color="text-red-400" />
            <MacroMiniStat label="Carbs" value={stats.carbs} goal={carbsGoal} unit="g" color="text-amber-400" />
            <MacroMiniStat label="Fat" value={stats.fat} goal={fatGoal} unit="g" color="text-blue-400" />
          </div>
        </div>
        <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 rotate-12" />
      </div>

      {/* Water Tracking */}
      <div className="bg-blue-50 rounded-[2rem] p-6 border border-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500 p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
            <Droplet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-blue-900">Water Intake</h3>
            <p className="text-blue-600 text-sm font-bold">{waterAmount} ml <span className="text-blue-400 font-medium">/ 2000 ml</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onUpdateWater(Math.max(0, waterAmount - 250))}
            className="p-2 bg-white rounded-xl text-blue-500 shadow-sm active:scale-95 transition-transform"
          >
            <Minus className="w-5 h-5" />
          </button>
          <button 
            onClick={() => onUpdateWater(waterAmount + 250)}
            className="p-2 bg-blue-500 rounded-xl text-white shadow-md active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekly Chart */}
      {isPremium ? (
        <WeeklyChart 
          entries={entries} 
          dailyGoal={dailyGoal}
          proteinGoal={proteinGoal}
          carbsGoal={carbsGoal}
          fatGoal={fatGoal}
        />
      ) : (
        <div className="bg-zinc-900 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 text-center">
            <Crown className="w-8 h-8 text-amber-400 mx-auto mb-3 fill-amber-400" />
            <h3 className="text-white font-bold mb-2">Weekly Trends</h3>
            <p className="text-zinc-400 text-xs mb-4">Upgrade to Premium to see your progress across the entire week.</p>
            <button 
              onClick={onUpgradeClick}
              className="text-amber-400 text-xs font-bold uppercase tracking-widest hover:text-amber-300 transition-colors"
            >
              View Premium
            </button>
          </div>
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]" />
        </div>
      )}

      {/* Meal History */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <div className="flex bg-zinc-100 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('meals')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'meals' ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-500'}`}
            >
              <Utensils className="w-3 h-3" />
              Meals
            </button>
            <button
              onClick={() => setActiveTab('scans')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'scans' ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-500'}`}
            >
              <History className="w-3 h-3" />
              Recent Scans
            </button>
          </div>
          <span className="text-xs font-bold text-zinc-400">
            {activeTab === 'meals' ? filteredEntries.length : filteredScans.length} items
          </span>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="wait">
            {activeTab === 'meals' ? (
              <motion.div
                key="meals-list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {!isPremium && filteredEntries.length > 0 && <AdBanner type="card" />}
                {filteredEntries.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-[2.5rem] border border-dashed border-zinc-200">
                    <p className="text-zinc-400 font-medium">No meals logged for this day.</p>
                  </div>
                ) : (
                  filteredEntries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      onClick={() => onItemClick(entry)}
                      className="group bg-white p-4 rounded-3xl shadow-sm border border-zinc-100 flex items-center justify-between hover:border-emerald-200 transition-colors cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-2xl">
                          {getFoodEmoji(entry.foodName)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-zinc-900">{entry.foodName}</h4>
                            {entry.isSynced && (
                              <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-500 uppercase tracking-tighter bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-2 h-2" /> Fit Synced
                              </div>
                            )}
                          </div>
                          <p className="text-zinc-400 text-xs font-medium">
                            {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • {entry.calories} kcal
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </motion.div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="scans-list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {!isPremium && filteredScans.length > 0 && <AdBanner type="card" />}
                {filteredScans.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-[2.5rem] border border-dashed border-zinc-200">
                    <p className="text-zinc-400 font-medium">No scans for this day.</p>
                  </div>
                ) : (
                  filteredScans.map((scan) => (
                    <motion.div
                      key={scan.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      onClick={() => onItemClick(scan)}
                      className="group bg-white p-4 rounded-3xl shadow-sm border border-zinc-100 flex items-center justify-between hover:border-emerald-200 transition-colors cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl">
                          {getFoodEmoji(scan.foodName)}
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900">{scan.foodName}</h4>
                          <p className="text-zinc-400 text-xs font-medium">
                            {new Date(scan.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • {scan.calories} kcal
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteScan(scan.id)}
                        className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const MacroMiniStat = ({ label, value, goal, unit, color }: { label: string, value: number, goal: number, unit: string, color: string }) => (
  <div>
    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">{label}</p>
    <p className={`text-sm font-bold ${color}`}>{Math.round(value)}<span className="text-[10px] opacity-50 font-medium">/{goal}{unit}</span></p>
  </div>
);

const getFoodEmoji = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('kip') || n.includes('chicken')) return '🍗';
  if (n.includes('appel') || n.includes('apple')) return '🍎';
  if (n.includes('banaan') || n.includes('banana')) return '🍌';
  if (n.includes('pizza')) return '🍕';
  if (n.includes('burger')) return '🍔';
  if (n.includes('salade') || n.includes('salad')) return '🥗';
  if (n.includes('koffie') || n.includes('coffee')) return '☕';
  if (n.includes('ei') || n.includes('egg')) return '🍳';
  if (n.includes('brood') || n.includes('bread')) return '🍞';
  if (n.includes('rijst') || n.includes('rice')) return '🍚';
  if (n.includes('pasta')) return '🍝';
  if (n.includes('vis') || n.includes('fish')) return '🐟';
  if (n.includes('steak') || n.includes('vlees')) return '🥩';
  return '🍽️';
};
