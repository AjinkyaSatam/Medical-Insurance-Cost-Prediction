import React from 'react';

export default function Card({ children, className = '', title, subtitle, action, hover = false }) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm p-6 transition-all duration-200 ${
        hover ? 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700' : ''
      } ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            {title && <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
