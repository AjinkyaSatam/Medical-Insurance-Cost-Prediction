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
import { Filter, BarChart3, RefreshCw, Info } from 'lucide-react';
import Card from '../components/Card';
import { SkeletonChart } from '../components/SkeletonLoader';
import ErrorState from '../components/ErrorState';
import { api } from '../api/client';

export default function EDA() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  const formatDollar = (val) => `$${Number(val).toLocaleString()}`;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Exploratory Data Analysis (EDA)
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Explore bivariate distributions, lifestyle risk disparities, and correlation structures across policyholders.
        </p>
      </div>

      {/* Slicers & Filters Panel */}
      <Card title="Interactive Data Slicers" subtitle="Filter data points dynamically across all visualizations">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Region filter */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
              Regions Included
            </span>
            <div className="flex flex-wrap gap-2">
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
            <div className="flex gap-2">
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
            <div className="flex items-center gap-3">
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
            title="Distribution of Annual Medical Charges"
            subtitle="Histogram of policyholder costs stratified by tobacco smoking status"
          >
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.charges_distribution || []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="bin_label" tick={{ fontSize: 10 }} interval={3} />
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
                <strong>Plain-English Insight:</strong> The raw medical charges distribution has extreme positive skewness. Non-smokers cluster densely under $10,000, while smokers produce a secondary peak extending from $30,000 to over $60,000.
              </span>
            </div>
          </Card>

          {/* Chart 2: Category Breakdown */}
          <Card
            title="Average & Median Charges by Demographic Group"
            subtitle="Compare medical costs across different attributes"
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
                  <YAxis tickFormatter={formatDollar} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '0.75rem',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`$${Number(val).toLocaleString()}`, 'Amount']}
                  />
                  <Legend />
                  <Bar dataKey="average" fill="#3b82f6" name="Mean Cost ($)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="median" fill="#14b8a6" name="Median Cost ($)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/30 rounded-xl text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span>
                <strong>Plain-English Insight:</strong> Smoking creates an ~3.8x disparity in mean cost (~$32,050 vs ~$8,434), whereas gender and regional medians remain comparable across cohorts.
              </span>
            </div>
          </Card>

          {/* Scatter Plots Row: Age & BMI vs Charges */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Age vs Cost */}
            <Card title="Age vs Charges (Biological Aging Trajectory)">
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
                      dataKey="cost"
                      name="Cost"
                      tickFormatter={formatDollar}
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
                      formatter={(val, name) => [name === 'Cost' ? `$${Number(val).toLocaleString()}` : val, name]}
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
                💡 <strong>Insight:</strong> Medical charges increase linearly with age for both groups (~$260/year), but smokers begin from a heavily elevated base intercept.
              </div>
            </Card>

            {/* BMI vs Cost */}
            <Card title="BMI vs Charges (Obesity Threshold Step-Function)">
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
                      dataKey="cost"
                      name="Cost"
                      tickFormatter={formatDollar}
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
                      formatter={(val, name) => [name === 'Cost' ? `$${Number(val).toLocaleString()}` : val, name]}
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
                💡 <strong>Insight:</strong> Crossing BMI = 30 produces an abrupt jump for smokers into the $35,000–$50,000 bracket, confirming the non-linear interaction effect.
              </div>
            </Card>
          </div>

          {/* Correlation Heatmap Table */}
          <Card title="Pearson Correlation Matrix Heatmap" subtitle="Pairwise statistical correlation between variables">
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
              💡 <strong>Insight:</strong> Smoking shows the highest linear correlation with charges (r = 0.787), followed by age (r = 0.299) and BMI (r = 0.198).
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
