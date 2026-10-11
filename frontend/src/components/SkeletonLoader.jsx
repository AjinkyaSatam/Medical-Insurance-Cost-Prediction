import React from 'react';

export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 animate-pulse ${className}`}>
      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3 mb-4"></div>
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded"
            style={{ width: `${100 - i * 15}%` }}
          ></div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ height = 'h-64' }) {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 animate-pulse`}>
      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-6"></div>
      <div className={`${height} bg-slate-100 dark:bg-slate-800/50 rounded-xl flex items-end p-4 gap-3`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-200/80 dark:bg-slate-700/60 rounded-t"
            style={{ height: `${25 + (i * 12) % 65}%` }}
          ></div>
        ))}
      </div>
    </div>
  );
}
