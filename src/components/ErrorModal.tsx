import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, message }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Analysis Failed</h3>
              <p className="text-zinc-600 mb-6 leading-relaxed">
                {message}
              </p>
              <button
                onClick={onClose}
                className="w-full py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-colors"
              >
                Got it
              </button>
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
