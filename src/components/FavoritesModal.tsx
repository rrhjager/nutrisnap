import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Plus, Trash2 } from 'lucide-react';
import { collection, query, onSnapshot, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { SavedMeal } from '../types';
import { NutritionInfo } from '../services/nutritionService';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onLogMeal: (meal: NutritionInfo) => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({ isOpen, onClose, userId, onLogMeal }) => {
  const [favorites, setFavorites] = useState<SavedMeal[]>([]);

  useEffect(() => {
    if (!isOpen || !userId) return;
    const q = query(collection(db, 'users', userId, 'favorites'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favs: SavedMeal[] = [];
      snapshot.forEach((doc) => {
        favs.push({ id: doc.id, ...doc.data() } as SavedMeal);
      });
      setFavorites(favs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/favorites`);
    });
    return () => unsubscribe();
  }, [isOpen, userId]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId, 'favorites', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/favorites/${id}`);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl max-h-[80vh] flex flex-col"
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-pink-100 p-2 rounded-xl text-pink-500">
                <Heart className="w-5 h-5 fill-pink-500" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900">Favorite Meals</h2>
            </div>
            <button onClick={onClose} className="p-2 bg-zinc-100 rounded-full text-zinc-500 hover:bg-zinc-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 no-scrollbar space-y-3">
            {favorites.length === 0 ? (
              <div className="text-center py-10 text-zinc-500">
                <Heart className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
                <p>No favorite meals yet.</p>
                <p className="text-sm mt-1">Save meals after scanning to quickly log them later!</p>
              </div>
            ) : (
              favorites.map(fav => (
                <div key={fav.id} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-zinc-900">{fav.customName}</h3>
                    <p className="text-xs text-zinc-500">{fav.foodName} • {fav.calories} kcal</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        onLogMeal(fav);
                        onClose();
                      }}
                      className="p-2 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(fav.id)}
                      className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
