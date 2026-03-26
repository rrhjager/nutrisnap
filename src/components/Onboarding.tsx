import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Mic, History, Apple, ArrowRight, Check } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to NutriSnap",
    description: "The AI-powered nutritionist in your pocket. Track your health with just a snap.",
    icon: <Apple className="w-12 h-12 text-white" />,
    color: "bg-emerald-500"
  },
  {
    title: "Snap or Scan",
    description: "Take a photo of your meal or scan a barcode. Our AI identifies everything instantly.",
    icon: <Camera className="w-12 h-12 text-white" />,
    color: "bg-blue-500"
  },
  {
    title: "Speak your Meal",
    description: "Don't want to take a photo? Just describe your meal using voice commands.",
    icon: <Mic className="w-12 h-12 text-white" />,
    color: "bg-purple-500"
  },
  {
    title: "Sync with Health",
    description: "Automatically sync your nutrition data with Google Fit to keep your health goals on track.",
    icon: <History className="w-12 h-12 text-white" />,
    color: "bg-orange-500"
  }
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8 max-w-sm"
          >
            <div className={`w-24 h-24 ${steps[currentStep].color} rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-${steps[currentStep].color.split('-')[1]}-200`}>
              {steps[currentStep].icon}
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">
                {steps[currentStep].title}
              </h2>
              <p className="text-zinc-500 text-lg leading-relaxed">
                {steps[currentStep].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-8 space-y-8">
        <div className="flex justify-center gap-2">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-emerald-500' : 'w-2 bg-zinc-200'}`} 
            />
          ))}
        </div>
        
        <button
          onClick={nextStep}
          className="w-full bg-zinc-900 text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          {currentStep === steps.length - 1 ? (
            <>Get Started <Check className="w-5 h-5" /></>
          ) : (
            <>Next <ArrowRight className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </div>
  );
};
