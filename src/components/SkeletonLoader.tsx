import React from 'react';
import { motion } from 'motion/react';

export const SkeletonLoader: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-zinc-100 space-y-6 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-zinc-200 rounded-lg" />
          <div className="h-4 w-24 bg-zinc-100 rounded-md" />
        </div>
        <div className="h-10 w-10 bg-zinc-200 rounded-full" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-12 bg-zinc-100 rounded mx-auto" />
            <div className="h-6 w-16 bg-zinc-200 rounded-lg mx-auto" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="h-4 w-32 bg-zinc-100 rounded" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-6 w-20 bg-zinc-100 rounded-full" />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <div className="h-14 flex-1 bg-zinc-200 rounded-2xl" />
        <div className="h-14 flex-1 bg-zinc-100 rounded-2xl" />
      </div>
    </div>
  );
};
