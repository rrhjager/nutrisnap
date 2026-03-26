import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeFoodDescription } from '../services/nutritionService';
import { NutritionInfo } from '../services/nutritionService';

interface VoiceCommandProps {
  onResult: (data: NutritionInfo) => void;
  onClose: () => void;
  isLimitReached: boolean;
}

export const VoiceCommand: React.FC<VoiceCommandProps> = ({ onResult, onClose, isLimitReached }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLimitReached) {
      setError("You've reached your daily limit of scans/voice commands.");
    }
  }, [isLimitReached]);

  const startListening = useCallback(() => {
    if (isLimitReached) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcriptValue = event.results[current][0].transcript;
      setTranscript(transcriptValue);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError("Microphone permission was denied. Please enable it in your browser settings.");
      } else {
        setError(`Error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, []);

  const handleProcess = async () => {
    if (!transcript) return;

    setIsProcessing(true);
    setError(null);
    try {
      const result = await analyzeFoodDescription(transcript);
      onResult(result);
      onClose();
    } catch (err: any) {
      console.error('Processing error:', err);
      setError("Could not analyze your description. Please try again.");
    } finally {
      setIsProcessing(false);
    }
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
            <h2 className="text-2xl font-bold text-zinc-900">Voice Command</h2>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center space-y-6">
            <button
              onClick={isListening ? undefined : startListening}
              disabled={isProcessing}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                isListening 
                  ? 'bg-red-500 animate-pulse shadow-lg shadow-red-200' 
                  : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-100'
              } disabled:opacity-50`}
            >
              {isListening ? (
                <Mic className="w-10 h-10 text-white" />
              ) : (
                <MicOff className="w-10 h-10 text-white" />
              )}
            </button>

            <div className="w-full min-h-[100px] bg-zinc-50 rounded-2xl p-6 border border-zinc-100 flex flex-col items-center justify-center text-center">
              {transcript ? (
                <p className="text-zinc-900 font-medium italic">"{transcript}"</p>
              ) : (
                <p className="text-zinc-400 text-sm">
                  {isListening ? "Listening..." : "Tap the mic and describe your meal\n(e.g. 'I had a bowl of oatmeal with blueberries')"}
                </p>
              )}
            </div>

            {error && (
              <p className="text-red-500 text-xs font-medium text-center">{error}</p>
            )}

            <button
              onClick={handleProcess}
              disabled={!transcript || isProcessing || isListening}
              className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              Analyze Voice Input
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Sparkles = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
  </svg>
);
