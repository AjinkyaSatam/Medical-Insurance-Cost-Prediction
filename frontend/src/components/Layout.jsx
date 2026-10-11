import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calculator,
  BarChart3,
  Award,
  Lightbulb,
  Sun,
  Moon,
  Menu,
  X,
  Activity,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import { api } from '../api/client';

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(null);
  const location = useLocation();

  // Dark mode state persisted in localStorage
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const checkHealth = () => {
    api.checkHealth()
      .then(() => setBackendHealthy(true))
      .catch(() => setBackendHealthy(false));
  };

  useEffect(() => {
    // Initial health check + periodic polling every 4 seconds
    checkHealth();
    const interval = setInterval(checkHealth, 4000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Predict Cost', path: '/predict', icon: Calculator },
    { name: 'EDA Analytics', path: '/eda', icon: BarChart3 },
    { name: 'Model Benchmark', path: '/performance', icon: Award },
    { name: 'Actuarial Insights', path: '/insights', icon: Lightbulb },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-sm shadow-teal-500/20">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-base leading-tight">MediCost AI</h1>
            <p className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold uppercase tracking-wider">Health Insurance ML</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar for Desktop */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 hidden md:flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">MediCost AI</h2>
              <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium tracking-wide">Predictive Intelligence</p>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-teal-500 text-white shadow-sm shadow-teal-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Backend Status & System Specs */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Activity className="w-3.5 h-3.5 text-teal-500" />
              <span>FastAPI Server</span>
            </div>
            <button
              onClick={checkHealth}
              title="Click to re-check FastAPI health"
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition ${
                backendHealthy === true
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : backendHealthy === false
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${backendHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              {backendHealthy === true ? 'Online' : backendHealthy === false ? 'Offline (Retry)' : 'Checking'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
              <span>R² Score: 91.88%</span>
            </div>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              title="Toggle dark/light mode"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
          <p>
            Medical Insurance Cost Prediction • Powered by Scikit-Learn Gradient Boosting & FastAPI • Estimates for demonstration purposes only.
          </p>
        </footer>
      </div>
    </div>
  );
}
