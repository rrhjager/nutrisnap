import React, { useState } from 'react';
import { NutritionInfo } from '../services/nutritionService';
import { motion } from 'motion/react';
import { X, Save, Flame, Beef, Wheat, Droplets } from 'lucide-react';

interface ManualEntryProps {
  onSave: (data: NutritionInfo) => void;
  onClose: () => void;
}

export const ManualEntry: React.FC<ManualEntryProps> = ({ onSave, onClose }) => {
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const handleSave = () => {
    if (!foodName || !calories) return;

    const data: NutritionInfo = {
      foodName,
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
      servingSize: '1 portie',
      confidence: 1,
      ingredients: [foodName],
    };

    onSave(data);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-zinc-900">Manual Entry</h2>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-2">Meal Name</label>
              <input
                type="text"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="e.g. Chicken with rice"
                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 font-medium text-zinc-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ManualInput
                icon={<Flame className="w-4 h-4 text-orange-500" />}
                label="Calories"
                value={calories}
                onChange={setCalories}
                unit="kcal"
              />
              <ManualInput
                icon={<Beef className="w-4 h-4 text-red-500" />}
                label="Protein"
                value={protein}
                onChange={setProtein}
                unit="g"
              />
              <ManualInput
                icon={<Wheat className="w-4 h-4 text-amber-500" />}
                label="Carbs"
                value={carbs}
                onChange={setCarbs}
                unit="g"
              />
              <ManualInput
                icon={<Droplets className="w-4 h-4 text-blue-500" />}
                label="Fat"
                value={fat}
                onChange={setFat}
                unit="g"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!foodName || !calories}
            className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            Save Meal
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ManualInput = ({ icon, label, value, onChange, unit }: { icon: React.ReactNode, label: string, value: string, onChange: (v: string) => void, unit: string }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2 flex items-center gap-1">
      {icon}
      {label}
    </label>
    <div className="relative">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 font-bold text-zinc-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all pr-12"
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-400">{unit}</span>
    </div>
  </div>
);
