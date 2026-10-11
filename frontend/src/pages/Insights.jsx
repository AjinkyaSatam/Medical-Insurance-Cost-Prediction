import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';
import { Lightbulb, TrendingUp, ShieldAlert, HeartPulse, Scale, CheckCircle2 } from 'lucide-react';
import Card from '../components/Card';
import { SkeletonChart, SkeletonCard } from '../components/SkeletonLoader';
import ErrorState from '../components/ErrorState';
import { api } from '../api/client';

export default function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const featureImportance = data?.feature_importance?.slice(0, 8) || [];
  const keyFindings = data?.key_findings || [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Actuarial & Business Insights
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Quantitative feature attribution and plain-English medical risk takeaways derived from the final model.
        </p>
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
          {/* Feature Importance Bar Chart */}
          <Card
            title={`Top Feature Importances (${data?.final_model || 'Gradient Boosting'})`}
            subtitle="Relative contribution of each engineered covariate towards annual premium predictions"
          >
            <div className="h-80 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={[...featureImportance].reverse()}
                  margin={{ top: 10, right: 30, left: 90, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    tick={{ fontSize: 11 }}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '0.75rem',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val}%`, 'Predictive Weight']}
                  />
                  <Bar dataKey="percentage" fill="#14b8a6" radius={[0, 6, 6, 0]}>
                    {[...featureImportance].reverse().map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.percentage > 50
                            ? '#0f766e'
                            : entry.percentage > 10
                            ? '#14b8a6'
                            : '#5eead4'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/30 rounded-xl text-xs text-slate-700 dark:text-slate-300">
              💡 <strong>Actuarial Takeaway:</strong> The engineered interaction feature <code>smoker_x_bmi</code> alone accounts for <strong>80.03%</strong> of total predictive variance, vastly exceeding individual univariate effects.
            </div>
          </Card>

          {/* Key Findings Cards */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Core Empirical Takeaways
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {keyFindings.map((finding) => (
                <Card
                  key={finding.id}
                  className={`border-l-4 ${
                    finding.type === 'primary'
                      ? 'border-l-rose-500'
                      : finding.type === 'secondary'
                      ? 'border-l-teal-500'
                      : finding.type === 'actionable'
                      ? 'border-l-emerald-500'
                      : 'border-l-slate-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {finding.title}
                    </h3>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex-shrink-0">
                      {finding.stat}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {finding.summary}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* Policyholder Actionable Guidance */}
          <Card title="Actionable Health & Policyholder Guidance">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Smoking Cessation</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Quitting smoking yields an immediate projected annual premium decrease of <strong>$15,000–$30,000</strong>, lowering actuarial risk from the high tier to standard.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-sm">
                  <HeartPulse className="w-4 h-4" />
                  <span>Weight Management</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Maintaining BMI below the clinical obesity boundary (BMI &lt; 30) prevents triggering the high-cost interaction step, saving <strong>$10,000–$18,000</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  <Scale className="w-4 h-4" />
                  <span>Demographic Equity</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Gender and US regional residence exhibit less than 0.4% combined weight, guaranteeing premium fairness driven by actual biometrics and lifestyle choices.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
