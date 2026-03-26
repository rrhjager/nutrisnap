import React from 'react';
import { Droplets, Plus, Minus } from 'lucide-react';
import { motion } from 'motion/react';

interface WaterTrackerProps {
  amount: number;
  onUpdate: (amount: number) => void;
}

export const WaterTracker: React.FC<WaterTrackerProps> = ({ amount, onUpdate }) => {
  const goal = 2500; // 2.5L goal
  const progress = Math.min((amount / goal) * 100, 100);

  const increment = () => {
    if (navigator.vibrate) navigator.vibrate(20);
    onUpdate(amount + 250);
  };

  const decrement = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    onUpdate(Math.max(0, amount - 250));
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-zinc-100 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 p-2.5 rounded-xl">
            <Droplets className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Water Intake</h3>
            <p className="text-zinc-500 text-sm font-medium">Goal: {(goal / 1000).toFixed(1)}L</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-blue-600 tracking-tighter">{(amount / 1000).toFixed(1)}L</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{Math.round(progress)}% of goal</p>
        </div>
      </div>

      <div className="relative h-4 bg-blue-50 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="absolute inset-y-0 left-0 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"
        />
      </div>

      <div className="flex gap-3">
        <button 
          onClick={decrement}
          className="flex-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-400 py-4 rounded-2xl flex items-center justify-center transition-colors active:scale-95"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button 
          onClick={increment}
          className="flex-[2] bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus className="w-5 h-5" /> Add 250ml
        </button>
      </div>
    </div>
  );
};
