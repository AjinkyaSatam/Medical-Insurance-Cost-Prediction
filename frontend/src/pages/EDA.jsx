import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  CartesianGrid,
  Cell
} from 'recharts';
import { Filter, BarChart3, RefreshCw, Info, Coins, AlertTriangle } from 'lucide-react';
import Card from '../components/Card';
import { SkeletonChart } from '../components/SkeletonLoader';
import ErrorState from '../components/ErrorState';
import { api } from '../api/client';
import { useCurrency } from '../context/CurrencyContext';

export default function EDA() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currency, isINR, toggleCurrency, formatDirect, formatInrLakhCrore } = useCurrency();

  // Filters State
  const [selectedRegions, setSelectedRegions] = useState(['northeast', 'northwest', 'southeast', 'southwest']);
  const [selectedSmokers, setSelectedSmokers] = useState(['no', 'yes']);
  const [ageRange, setAgeRange] = useState([18, 64]);
  const [activeCategoryTab, setActiveCategoryTab] = useState('smoker');

  useEffect(() => {
    fetchEdaData();
  }, [selectedRegions, selectedSmokers, ageRange]);

  const fetchEdaData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getEdaData({
        region: selectedRegions,
        smoker: selectedSmokers,
        age_min: ageRange[0],
        age_max: ageRange[1],
      });
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch EDA dataset.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRegion = (r) => {
    if (selectedRegions.includes(r)) {
      if (selectedRegions.length > 1) {
        setSelectedRegions(selectedRegions.filter((item) => item !== r));
      }
    } else {
      setSelectedRegions([...selectedRegions, r]);
    }
  };

  const toggleSmoker = (s) => {
    if (selectedSmokers.includes(s)) {
      if (selectedSmokers.length > 1) {
        setSelectedSmokers(selectedSmokers.filter((item) => item !== s));
      }
    } else {
      setSelectedSmokers([...selectedSmokers, s]);
    }
  };

  // Helper formatters
  const formatCost = (val) => {
    if (val === null || val === undefined) return '—';
    if (isINR) {
      const inr = Number(val);
      return inr >= 100000 ? `₹${(inr / 100000).toFixed(1)}L` : `₹${(inr / 1000).toFixed(0)}k`;
    }
    return `$${(Number(val) / 1000).toFixed(0)}k`;
  };

  const formatTooltipCost = (val) => {
    if (val === null || val === undefined) return '—';
    if (isINR) {
      return `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${formatInrLakhCrore(val)})`;
    }
    return `$${Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Exploratory Data Analysis (EDA)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Explore distributions, demographic risk disparities, and correlation patterns ({currency} view).
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

      {isINR && (
        <div className="p-3 bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/40 rounded-xl flex items-center gap-2 text-xs text-teal-800 dark:text-teal-200">
          <Info className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <span>All charges below are displayed as <strong>Estimated, India-adjusted</strong> amounts (Rate: ₹83.0 / $1 USD).</span>
        </div>
      )}

      {/* Slicers & Filters Panel */}
      <Card title="Interactive Data Slicers" subtitle="Filter data points dynamically across all visualizations">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Region filter */}
          <div className="space-y-2">
            <div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                US Dataset Region
              </span>
              <p className="text-[10px] text-slate-400 italic">
                (Note: Indian cities are not in the US dataset)
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {['northeast', 'northwest', 'southeast', 'southwest'].map((r) => {
                const active = selectedRegions.includes(r);
                return (
                  <button
                    key={r}
                    onClick={() => toggleRegion(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                      active
                        ? 'bg-teal-500 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Smoker filter */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
              Smoking Status
            </span>
            <div className="flex gap-2 pt-1">
              {[
                { val: 'no', label: 'Non-Smokers' },
                { val: 'yes', label: 'Active Smokers' },
              ].map(({ val, label }) => {
                const active = selectedSmokers.includes(val);
                return (
                  <button
                    key={val}
                    onClick={() => toggleSmoker(val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      active
                        ? val === 'yes'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Age range */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300">
              <span className="uppercase tracking-wider">Age Range Filter</span>
              <span className="text-teal-600 dark:text-teal-400">{ageRange[0]} - {ageRange[1]} yrs</span>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="range"
                min="18"
                max="64"
                value={ageRange[1]}
                onChange={(e) => setAgeRange([ageRange[0], Math.max(ageRange[0] + 5, Number(e.target.value))])}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>
            <span className="text-[11px] text-slate-400">
              Showing {data?.total_records || 0} of {data?.dataset_size_overall || 1337} total records
            </span>
          </div>
        </div>
      </Card>

      {error ? (
        <ErrorState onRetry={fetchEdaData} message={error} />
      ) : loading ? (
        <div className="space-y-6">
          <SkeletonChart height="h-72" />
          <SkeletonChart height="h-72" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Chart 1: Charges Distribution */}
          <Card
            title={`Distribution of Medical Charges (${currency})`}
            subtitle={`Histogram bins stratified by tobacco smoking status (${isINR ? 'Estimated, India-adjusted' : 'USD'})`}
          >
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.charges_distribution || []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey={isINR ? 'bin_label_inr' : 'bin_label_usd'}
                    tick={{ fontSize: 10 }}
                    interval={3}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '0.75rem',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(val, name) => [val, name === 'non_smokers' ? 'Non-Smokers' : 'Smokers']}
                  />
                  <Legend />
                  <Bar dataKey="non_smokers" stackId="a" fill="#10b981" name="Non-Smokers" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="smokers" stackId="a" fill="#ef4444" name="Smokers" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/30 rounded-xl text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span>
                <strong>Distribution Insight:</strong> Medical charges show pronounced right-skewness. Non-smokers cluster densely under {isINR ? '₹8.3 Lakh ($10,000)' : '$10,000'}, whereas smokers produce an extended high-cost tail beyond {isINR ? '₹25 Lakh ($30,000)' : '$30,000'}.
              </span>
            </div>
          </Card>

          {/* Chart 2: Category Breakdown */}
          <Card
            title={`Average & Median Charges by Demographic Group (${currency})`}
            subtitle="Compare medical costs across different attributes (Estimated, India-adjusted)"
            action={
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {['smoker', 'sex', 'region', 'children'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveCategoryTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                      activeCategoryTab === tab
                        ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            }
          >
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.averages_by_category?.[activeCategoryTab] || []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatCost} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '0.75rem',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(val, name) => [
                      formatTooltipCost(val),
                      name === 'average_inr' || name === 'average_usd' ? 'Mean Cost' : 'Median Cost'
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey={isINR ? 'average_inr' : 'average_usd'}
                    fill="#3b82f6"
                    name={`Mean Cost (${currency})`}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey={isINR ? 'median_inr' : 'median_usd'}
                    fill="#14b8a6"
                    name={`Median Cost (${currency})`}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/30 rounded-xl text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span>
                <strong>Demographic Disparity:</strong> Smoking creates an ~3.8x disparity in mean cost ({isINR ? '₹26.6 Lakh vs ₹7.0 Lakh' : '$32,050 vs $8,434'}), whereas biological sex and dataset region have virtually uniform distributions.
              </span>
            </div>
          </Card>

          {/* Scatter Plots Row: Age & BMI vs Charges */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Age vs Cost */}
            <Card title={`Age vs Charges (${currency})`} subtitle="Biological aging trajectory (Estimated, India-adjusted)">
              <div className="h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      type="number"
                      dataKey="age"
                      name="Age"
                      unit=" yrs"
                      domain={[18, 65]}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey={isINR ? "cost_inr" : "cost_usd"}
                      name="Cost"
                      tickFormatter={formatCost}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '0.75rem',
                        border: 'none',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                      formatter={(val, name) => [
                        name === 'cost_inr' || name === 'cost_usd' ? formatTooltipCost(val) : val,
                        name === 'cost_inr' || name === 'cost_usd' ? 'Cost' : name
                      ]}
                    />
                    <Scatter
                      name="Beneficiaries"
                      data={data?.scatter_age?.slice(0, 500) || []}
                      fill="#3b82f6"
                      opacity={0.65}
                    >
                      {(data?.scatter_age?.slice(0, 500) || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.smoker === 'yes' ? '#ef4444' : '#10b981'} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                💡 <strong>Linearity:</strong> Cost increases linearly with age for both cohorts, consistent with the linear regression formulation.
              </div>
            </Card>

            {/* BMI vs Cost */}
            <Card title={`BMI vs Charges (${currency})`} subtitle="Obesity interaction threshold (Estimated, India-adjusted)">
              <div className="h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      type="number"
                      dataKey="bmi"
                      name="BMI"
                      unit=" kg/m²"
                      domain={[15, 55]}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey={isINR ? "cost_inr" : "cost_usd"}
                      name="Cost"
                      tickFormatter={formatCost}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '0.75rem',
                        border: 'none',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                      formatter={(val, name) => [
                        name === 'cost_inr' || name === 'cost_usd' ? formatTooltipCost(val) : val,
                        name === 'cost_inr' || name === 'cost_usd' ? 'Cost' : name
                      ]}
                    />
                    <Scatter
                      name="Beneficiaries"
                      data={data?.scatter_bmi?.slice(0, 500) || []}
                      fill="#14b8a6"
                      opacity={0.65}
                    >
                      {(data?.scatter_bmi?.slice(0, 500) || []).map((entry, index) => (
                        <Cell key={`cell-bmi-${index}`} fill={entry.smoker === 'yes' ? '#ef4444' : '#10b981'} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                💡 <strong>Interaction Step:</strong> Smokers crossing BMI 30 jump into the {isINR ? '₹29 Lakh - ₹42 Lakh' : '$35,000 - $50,000'} range, justifying the <code>smoker_x_bmi</code> interaction term.
              </div>
            </Card>
          </div>

          {/* Correlation Heatmap Table */}
          <Card title="Pearson Correlation Matrix Heatmap" subtitle="Pairwise statistical correlation between numeric variables (unitless)">
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-3 font-semibold text-slate-500">Variable</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-500 text-center">Age</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-500 text-center">BMI</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-500 text-center">Children</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-500 text-center">Smoker</th>
                    <th className="py-2.5 px-3 font-semibold text-slate-500 text-center">Charges (Target)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[
                    { name: 'Age', vals: [1.0, 0.109, 0.042, -0.025, 0.299] },
                    { name: 'BMI', vals: [0.109, 1.0, 0.013, 0.004, 0.198] },
                    { name: 'Children', vals: [0.042, 0.013, 1.0, 0.008, 0.068] },
                    { name: 'Smoker', vals: [-0.025, 0.004, 0.008, 1.0, 0.787] },
                    { name: 'Charges (Target)', vals: [0.299, 0.198, 0.068, 0.787, 1.0] },
                  ].map((row) => (
                    <tr key={row.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{row.name}</td>
                      {row.vals.map((v, i) => {
                        const isHigh = Math.abs(v) > 0.5;
                        const isMod = Math.abs(v) >= 0.2;
                        return (
                          <td
                            key={i}
                            className={`py-2 px-3 text-center font-mono ${
                              isHigh
                                ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold'
                                : isMod
                                ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 font-medium'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {v.toFixed(3)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-3 bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/30 rounded-xl text-xs text-slate-700 dark:text-slate-300">
              💡 <strong>Linear Correlation:</strong> Smoking status exhibits the strongest linear correlation with charges (r = 0.787), followed by chronological age (r = 0.299).
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
