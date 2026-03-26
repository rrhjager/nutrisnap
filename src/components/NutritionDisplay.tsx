import React, { useState } from 'react';
import { NutritionInfo } from '../services/nutritionService';
import { motion } from 'motion/react';
import { Flame, Beef, Wheat, Droplets, Info, Save, RotateCcw, Share2, Minus, Plus, Heart } from 'lucide-react';

interface NutritionDisplayProps {
  data: NutritionInfo;
  onReset: () => void;
  onSave: (data: NutritionInfo) => void;
  onSaveFavorite?: (data: NutritionInfo, customName: string) => void;
}

export const NutritionDisplay: React.FC<NutritionDisplayProps> = ({ data, onReset, onSave, onSaveFavorite }) => {
  const [portion, setPortion] = useState<number>(1.0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<NutritionInfo>(data);
  const [showFavoritePrompt, setShowFavoritePrompt] = useState(false);
  const [favoriteName, setFavoriteName] = useState(data.foodName);

  const handleShare = async () => {
    const currentData = isEditing ? editedData : data;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `NutriSnap: ${currentData.foodName}`,
          text: `I just scanned ${currentData.foodName} with NutriSnap! It has ${Math.round(currentData.calories * portion)} kcal, ${Math.round(currentData.protein * portion)}g protein, ${Math.round(currentData.carbs * portion)}g carbs, and ${Math.round(currentData.fat * portion)}g fat.`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    }
  };

  const handleSave = () => {
    const finalData = isEditing ? editedData : data;
    onSave({
      ...finalData,
      calories: Math.round(finalData.calories * portion),
      protein: Math.round(finalData.protein * portion),
      carbs: Math.round(finalData.carbs * portion),
      fat: Math.round(finalData.fat * portion),
      servingSize: portion === 1.0 ? finalData.servingSize : `${portion}x ${finalData.servingSize}`
    });
  };

  const adjustPortion = (amount: number) => {
    setPortion(prev => {
      const newVal = prev + amount;
      return Number(Math.max(0.25, Math.min(10, newVal)).toFixed(2));
    });
  };

  const updateField = (field: keyof NutritionInfo, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const currentDisplayData = isEditing ? editedData : data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6 pb-12"
    >
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 mr-4">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editedData.foodName}
                  onChange={(e) => updateField('foodName', e.target.value)}
                  className="text-2xl font-bold text-zinc-900 w-full bg-zinc-50 border-b-2 border-emerald-500 focus:outline-none px-2 py-1 rounded-t-lg"
                  placeholder="Product Name"
                />
                <input
                  type="text"
                  value={editedData.servingSize}
                  onChange={(e) => updateField('servingSize', e.target.value)}
                  className="text-zinc-500 text-sm font-medium w-full bg-zinc-50 border-b border-zinc-200 focus:outline-none px-2 py-1 rounded-t-lg"
                  placeholder="Serving Size (e.g. 100g)"
                />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-zinc-900 capitalize">{data.foodName}</h2>
                <p className="text-zinc-500 text-sm font-medium">Serving: {data.servingSize}</p>
              </>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                isEditing ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              {isEditing ? 'Done Editing' : 'Edit Info'}
            </button>
            {!isEditing && (
              <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {Math.round(data.confidence * 100)}% Match
              </div>
            )}
            {navigator.share && !isEditing && (
              <button 
                onClick={handleShare}
                className="p-2 bg-zinc-50 text-zinc-400 rounded-xl hover:text-emerald-500 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Portion Control */}
        <div className="mb-6 bg-zinc-50 rounded-2xl p-4 flex items-center justify-between border border-zinc-100">
          <span className="text-sm font-bold text-zinc-700">Portion Size</span>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => adjustPortion(-0.25)}
              className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 active:scale-95 transition-all"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-mono font-bold text-lg w-12 text-center text-zinc-900">
              {portion}x
            </span>
            <button 
              onClick={() => adjustPortion(0.25)}
              className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <EditableStatCard
            icon={<Flame className="w-5 h-5 text-orange-500" />}
            label="Calories"
            value={isEditing ? editedData.calories : Math.round(data.calories * portion)}
            unit="kcal"
            color="bg-orange-50"
            isEditing={isEditing}
            onChange={(val) => updateField('calories', val)}
          />
          <EditableStatCard
            icon={<Beef className="w-5 h-5 text-red-500" />}
            label="Protein"
            value={isEditing ? editedData.protein : Math.round(data.protein * portion)}
            unit="g"
            color="bg-red-50"
            isEditing={isEditing}
            onChange={(val) => updateField('protein', val)}
          />
          <EditableStatCard
            icon={<Wheat className="w-5 h-5 text-amber-500" />}
            label="Carbs"
            value={isEditing ? editedData.carbs : Math.round(data.carbs * portion)}
            unit="g"
            color="bg-amber-50"
            isEditing={isEditing}
            onChange={(val) => updateField('carbs', val)}
          />
          <EditableStatCard
            icon={<Droplets className="w-5 h-5 text-blue-500" />}
            label="Fat"
            value={isEditing ? editedData.fat : Math.round(data.fat * portion)}
            unit="g"
            color="bg-blue-50"
            isEditing={isEditing}
            onChange={(val) => updateField('fat', val)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-zinc-400" />
          <h3 className="font-bold text-zinc-900">Ingredients Found</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentDisplayData.ingredients.map((item, i) => (
            <span
              key={i}
              className="bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-xl text-sm font-medium capitalize"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {showFavoritePrompt ? (
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm mb-2">
            <p className="text-sm font-bold text-zinc-900 mb-2">Name your favorite meal:</p>
            <input
              type="text"
              value={favoriteName}
              onChange={(e) => setFavoriteName(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 mb-3 focus:outline-none focus:border-pink-500"
              placeholder="e.g. Morning Oatmeal"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowFavoritePrompt(false)}
                className="flex-1 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onSaveFavorite) {
                    const finalData = isEditing ? editedData : data;
                    onSaveFavorite({
                      ...finalData,
                      calories: Math.round(finalData.calories * portion),
                      protein: Math.round(finalData.protein * portion),
                      carbs: Math.round(finalData.carbs * portion),
                      fat: Math.round(finalData.fat * portion),
                      servingSize: portion === 1.0 ? finalData.servingSize : `${portion}x ${finalData.servingSize}`
                    }, favoriteName || finalData.foodName);
                    setShowFavoritePrompt(false);
                  }
                }}
                className="flex-1 py-2 bg-pink-500 text-white rounded-xl font-bold text-sm"
              >
                Save Favorite
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSave}
              className="col-span-2 bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg shadow-emerald-100"
            >
              <Save className="w-5 h-5" />
              {isEditing ? 'Save & Add to Logbook' : 'Add to Logbook'}
            </button>
            <button
              onClick={() => setShowFavoritePrompt(true)}
              className="col-span-2 bg-pink-50 text-pink-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all border border-pink-100"
            >
              <Heart className="w-4 h-4 fill-pink-600" />
              Save as Favorite
            </button>
          </div>
        )}
        <button
          onClick={onReset}
          className="w-full bg-zinc-50 text-zinc-400 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-[0.98] transition-transform hover:text-zinc-900"
        >
          <RotateCcw className="w-5 h-5" />
          Not the right product? Try again
        </button>
      </div>
    </motion.div>
  );
};

interface EditableStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  color: string;
  isEditing: boolean;
  onChange: (val: number) => void;
}

const EditableStatCard: React.FC<EditableStatCardProps> = ({ icon, label, value, unit, color, isEditing, onChange }) => (
  <div className={`${color} rounded-2xl p-4 flex flex-col gap-2 border border-transparent dark:border-zinc-800/50`}>
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 text-zinc-500 dark:text-inherit">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      {isEditing ? (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="text-2xl font-bold text-zinc-900 bg-transparent w-full focus:outline-none border-b border-emerald-500/30"
        />
      ) : (
        <span className="text-2xl font-bold text-zinc-900 dark:text-inherit">{value}</span>
      )}
      <span className="text-xs font-medium opacity-60 text-zinc-500 dark:text-inherit">{unit}</span>
    </div>
  </div>
);
