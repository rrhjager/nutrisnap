import React from 'react';
import { LogEntry } from '../types';
import { motion } from 'motion/react';

interface WeeklyChartProps {
  entries: LogEntry[];
  dailyGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ 
  entries, 
  dailyGoal,
  proteinGoal,
  carbsGoal,
  fatGoal
}) => {
  const [activeMetric, setActiveMetric] = React.useState<'calories' | 'protein' | 'carbs' | 'fat'>('calories');
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  
  // Get last 7 days including today
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    return d;
  });

  const dailyData = last7Days.map(date => {
    const dayEntries = entries.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate.getDate() === date.getDate() &&
             entryDate.getMonth() === date.getMonth() &&
             entryDate.getFullYear() === date.getFullYear();
    });
    
    return {
      calories: dayEntries.reduce((sum, entry) => sum + entry.calories, 0),
      protein: dayEntries.reduce((sum, entry) => sum + (entry.protein || 0), 0),
      carbs: dayEntries.reduce((sum, entry) => sum + (entry.carbs || 0), 0),
      fat: dayEntries.reduce((sum, entry) => sum + (entry.fat || 0), 0),
    };
  });

  const currentGoal = activeMetric === 'calories' ? dailyGoal : 
                     activeMetric === 'protein' ? proteinGoal :
                     activeMetric === 'carbs' ? carbsGoal : fatGoal;

  const maxVal = Math.max(...dailyData.map(d => d[activeMetric]), currentGoal, 1);

  const metricColors = {
    calories: 'bg-emerald-500',
    protein: 'bg-red-400',
    carbs: 'bg-amber-400',
    fat: 'bg-blue-400'
  };

  const metricLabels = {
    calories: 'Calories',
    protein: 'Protein (g)',
    carbs: 'Carbs (g)',
    fat: 'Fat (g)'
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100">
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-zinc-900">Weekly Trends</h3>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50 px-2 py-1 rounded-lg">Premium Feature</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {(['calories', 'protein', 'carbs', 'fat'] as const).map(metric => (
            <button
              key={metric}
              onClick={() => setActiveMetric(metric)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeMetric === metric 
                  ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200' 
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              {metric}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-end h-40 gap-2 mb-2">
        {dailyData.map((data, i) => {
          const val = data[activeMetric];
          const height = (val / maxVal) * 100;
          const isToday = i === 6;
          const isOverGoal = val > currentGoal;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
              <div className="relative w-full flex flex-col justify-end h-full">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  className={`w-full rounded-t-xl transition-all duration-500 ${
                    isToday 
                      ? (isOverGoal && activeMetric === 'calories' ? 'bg-red-400' : metricColors[activeMetric]) 
                      : (isOverGoal && activeMetric === 'calories' ? 'bg-red-200' : 'bg-zinc-100 group-hover:bg-zinc-200')
                  }`}
                />
                {/* Goal Line */}
                <div 
                  className="absolute left-0 right-0 border-t border-dashed border-zinc-200 pointer-events-none z-10"
                  style={{ bottom: `${(currentGoal / maxVal) * 100}%` }}
                />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-tighter ${isToday ? 'text-zinc-900' : 'text-zinc-400'}`}>
                {days[last7Days[i].getDay() === 0 ? 6 : last7Days[i].getDay() - 1]}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${metricColors[activeMetric]}`} />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{metricLabels[activeMetric]}</span>
        </div>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Goal: {currentGoal}</span>
      </div>
    </div>
  );
};
