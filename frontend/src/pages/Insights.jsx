import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ReferenceLine
} from 'recharts';
import { Lightbulb, TrendingUp, ShieldAlert, HeartPulse, Scale, CheckCircle2, Coins, Calculator } from 'lucide-react';
import Card from '../components/Card';
import { SkeletonChart, SkeletonCard } from '../components/SkeletonLoader';
import ErrorState from '../components/ErrorState';
import { api } from '../api/client';
import { useCurrency } from '../context/CurrencyContext';

export default function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currency, isINR, toggleCurrency, formatDirect, formatInrLakhCrore } = useCurrency();

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getInsights();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch insights data.');
    } finally {
      setLoading(false);
    }
  };

  const coefficients = data?.coefficients || [];
  const plainEnglishCards = data?.plain_english_cards || [];
  const interceptUsd = data?.intercept_usd || 0;
  const interceptInr = data?.intercept_inr || 0;

  // Chart data formatted according to chosen currency
  const chartData = coefficients.slice(0, 10).map((item) => ({
    feature: item.feature,
    value: isINR ? item.coefficient_inr : item.coefficient_usd,
    abs_val: isINR ? item.abs_coefficient_inr : item.abs_coefficient_usd,
    direction: item.direction,
    description: item.description,
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Linear Regression Coefficients & Actuarial Insights
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Empirical weights (β coefficients) explaining individual feature impact on annual medical charges.
          </p>
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center self-start md:self-auto gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl shadow-sm">
          <span className="text-xs font-semibold px-2 text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-teal-500" /> Currency:
          </span>
          <button
            type="button"
            onClick={() => !isINR && toggleCurrency()}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              isINR
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ₹ INR (Default)
          </button>
          <button
            type="button"
            onClick={() => isINR && toggleCurrency()}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              !isINR
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            $ USD
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <SkeletonChart height="h-80" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </div>
        </div>
      ) : error ? (
        <ErrorState onRetry={fetchInsights} message={error} />
      ) : (
        <div className="space-y-8">
          {/* Linear Equation Formula Card */}
          <Card className="border-l-4 border-l-teal-500">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                <Calculator className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  Mathematical Formulation: Ordinary Least Squares (OLS)
                </h4>
                <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl font-mono text-xs text-teal-700 dark:text-teal-300 border border-slate-200 dark:border-slate-700">
                  y = β₀ + β₁x₁ + β₂x₂ + ... + βₙxₙ
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Where <strong>β₀ (Intercept = {isINR ? formatDirect(interceptInr, { decimals: 0 }) : formatDirect(interceptUsd, { decimals: 2 })})</strong> represents the expected baseline cost when all standardized predictors equal zero.
                  Each <strong>βᵢ coefficient</strong> reflects the expected change in predicted cost for a one-unit change in that feature, holding all other features strictly constant (<em>ceteris paribus</em>).
                </p>
              </div>
            </div>
          </Card>

          {/* Sorted Coefficients Bar Chart */}
          <Card
            title={`Top Linear Regression Coefficients (${currency})`}
            subtitle="Sorted by magnitude of impact on medical insurance charges (positive values increase cost, negative reduce cost)"
          >
            <div className="h-88 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => isINR ? `₹${(v / 100000).toFixed(1)}L` : `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '0.75rem',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [
                      isINR
                        ? `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${formatInrLakhCrore(val)})`
                        : `$${Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
                      'Coefficient (Impact)'
                    ]}
                  />
                  <ReferenceLine x={0} stroke="#94a3b8" />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.value >= 0 ? '#10b981' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/30 rounded-xl text-xs text-slate-700 dark:text-slate-300">
              💡 <strong>Viva Takeaway:</strong> In Linear Regression, the green bars indicate risk factors that increase charges (e.g. <code>smoker_x_bmi</code>, <code>age</code>, <code>obese</code>), whereas red bars represent negative offset weights (e.g. baseline non-smoker / normal categories).
            </div>
          </Card>

          {/* Plain-English Cards for Viva & Practical Understanding */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Plain-English Coefficient Interpretations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {plainEnglishCards.map((card) => (
                <Card
                  key={card.id}
                  className={`border-l-4 ${
                    card.type === 'primary'
                      ? 'border-l-rose-500'
                      : card.type === 'secondary'
                      ? 'border-l-teal-500'
                      : card.type === 'warning'
                      ? 'border-l-amber-500'
                      : 'border-l-indigo-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {card.title}
                    </h3>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex-shrink-0">
                      {isINR ? card.stat_inr : card.stat_usd}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {card.summary}
                  </p>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 dark:text-slate-500">
                    Feature: <code>{card.feature}</code> • Estimated, India-adjusted
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Practical Underwriting Summary Card */}
          <Card title="Linear Regression Actuarial Summary">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Smoking Synergies</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Because smoking interacts multiplicatively with BMI (<code>smoker_x_bmi</code> coefficient ≈ {isINR ? '₹15.82 Lakh' : '$19,065'}), clinical smoking cessation yields massive estimated premium relief.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-sm">
                  <HeartPulse className="w-4 h-4" />
                  <span>Linear Aging Impact</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Age adds a constant linear penalty of ~{isINR ? '₹3.19 Lakh' : '$3,849'} per standardized unit across the beneficiary's lifetime, reflecting steady biological risk escalation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  <Scale className="w-4 h-4" />
                  <span>Explainability Advantage</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Unlike black-box ensemble trees, Linear Regression provides full parametric transparency: every single rupee in the output can be directly attributed to a specific feature coefficient.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
