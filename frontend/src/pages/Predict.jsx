import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  AlertTriangle,
  Coins,
  Shield,
  RefreshCw,
  Users,
  Info,
  HelpCircle,
  FileText
} from 'lucide-react';
import Card from '../components/Card';
import { api } from '../api/client';
import { useCurrency } from '../context/CurrencyContext';

export default function Predict() {
  const { currency, toggleCurrency, isINR, rate = 83.0, costFactor = 1.0, factor = 1.0, formatDirect, formatInrLakhCrore } = useCurrency();
  const activeRate = Number(rate || 83.0);
  const activeFactor = Number(costFactor || factor || 1.0);

  // Form State
  const [formData, setFormData] = useState({
    age: 30,
    sex: 'male',
    bmi: 28.5,
    children: 1,
    smoker: 'no',
    region: 'southeast',
  });

  // BMI helper mode
  const [bmiMode, setBmiMode] = useState('direct'); // 'direct' or 'compute'
  const [heightCm, setHeightCm] = useState(175);
  const [weightKg, setWeightKg] = useState(75);

  // Inference state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleComputeBmi = (h, w) => {
    if (h > 0) {
      const calculatedBmi = Number((w / Math.pow(h / 100, 2)).toFixed(1));
      setFormData((prev) => ({ ...prev, bmi: Math.min(60, Math.max(10, calculatedBmi)) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        age: Number(formData.age),
        sex: formData.sex,
        bmi: Number(formData.bmi),
        children: Number(formData.children),
        smoker: formData.smoker,
        region: formData.region,
      };

      const data = await api.predictCost(payload);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Prediction failed. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const getBmiCategory = (bmi) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-amber-500' };
    if (bmi <= 24.9) return { label: 'Normal weight', color: 'text-emerald-500' };
    if (bmi <= 29.9) return { label: 'Overweight', color: 'text-amber-600' };
    return { label: 'Clinically Obese (BMI ≥ 30)', color: 'text-rose-600 font-semibold' };
  };

  const bmiCat = getBmiCategory(formData.bmi);

  // Helper to format values in the chosen currency
  const renderCost = (usdVal, inrVal, showShort = true) => {
    if (usdVal === undefined || usdVal === null) return '—';
    if (isINR) {
      const formatted = formatDirect(inrVal, { decimals: 0 });
      const short = showShort ? formatInrLakhCrore(inrVal) : null;
      return (
        <span>
          {formatted} {short && <span className="text-sm font-semibold opacity-80">({short})</span>}
        </span>
      );
    }
    return formatDirect(usdVal, { decimals: 2 });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Medical Insurance Cost Estimator
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Multiple Linear Regression model with configurable India INR cost translation layer.
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

      {/* Mandatory Top Disclaimer */}
      <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Academic Disclaimer:</strong> Model trained on US data. Amounts are India-adjusted estimates, not real insurance quotes.
        </p>
      </div>

      {/* Main Grid: Form on Left, Output on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column */}
        <div className="lg:col-span-7 space-y-6">
          <Card title="Beneficiary Information Form" subtitle="Enter demographic and biometric parameters">
            <form onSubmit={handleSubmit} className="space-y-6 pt-2">
              {/* Age Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-medium">
                  <label htmlFor="age" className="text-slate-700 dark:text-slate-300">
                    Age (Years)
                  </label>
                  <span className="text-teal-600 dark:text-teal-400 font-bold px-2 py-0.5 bg-teal-50 dark:bg-teal-950/50 rounded-lg">
                    {formData.age} years
                  </span>
                </div>
                <input
                  id="age"
                  type="range"
                  min="18"
                  max="65"
                  step="1"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>18 yrs</span>
                  <span>40 yrs</span>
                  <span>65 yrs</span>
                </div>
              </div>

              {/* Sex & Region Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="sex" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Biological Sex
                  </label>
                  <select
                    id="sex"
                    value={formData.sex}
                    onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="region" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      US dataset region
                    </label>
                  </div>
                  <select
                    id="region"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="northeast">Northeast</option>
                    <option value="northwest">Northwest</option>
                    <option value="southeast">Southeast</option>
                    <option value="southwest">Southwest</option>
                  </select>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                    Note: Indian cities are not in the US training dataset.
                  </p>
                </div>
              </div>

              {/* BMI Mode Switcher & Controls */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Body Mass Index (BMI)
                  </label>
                  <div className="flex gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setBmiMode('direct')}
                      className={`px-2.5 py-1 rounded-md font-medium transition ${
                        bmiMode === 'direct'
                          ? 'bg-teal-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Slider
                    </button>
                    <button
                      type="button"
                      onClick={() => setBmiMode('compute')}
                      className={`px-2.5 py-1 rounded-md font-medium transition ${
                        bmiMode === 'compute'
                          ? 'bg-teal-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Height / Weight
                    </button>
                  </div>
                </div>

                {bmiMode === 'direct' ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-slate-600 dark:text-slate-400">Current BMI:</span>
                      <span className="text-teal-600 dark:text-teal-400 font-bold">
                        {formData.bmi} kg/m²
                      </span>
                    </div>
                    <input
                      type="range"
                      min="15.0"
                      max="55.0"
                      step="0.1"
                      value={formData.bmi}
                      onChange={(e) => setFormData({ ...formData, bmi: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>15 (Underweight)</span>
                      <span>25 (Normal)</span>
                      <span>30 (Obese threshold)</span>
                      <span>55</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Height (cm)</label>
                      <input
                        type="number"
                        min="100"
                        max="240"
                        value={heightCm}
                        onChange={(e) => {
                          const h = Number(e.target.value);
                          setHeightCm(h);
                          handleComputeBmi(h, weightKg);
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Weight (kg)</label>
                      <input
                        type="number"
                        min="30"
                        max="250"
                        value={weightKg}
                        onChange={(e) => {
                          const w = Number(e.target.value);
                          setWeightKg(w);
                          handleComputeBmi(heightCm, w);
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                <div className="text-xs flex items-center justify-between border-t border-slate-200 dark:border-slate-700/60 pt-2">
                  <span className="text-slate-500 dark:text-slate-400">Clinical Classification:</span>
                  <span className={bmiCat.color}>{bmiCat.label}</span>
                </div>
              </div>

              {/* Children Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-medium">
                  <label htmlFor="children" className="text-slate-700 dark:text-slate-300">
                    Dependent Children
                  </label>
                  <span className="text-teal-600 dark:text-teal-400 font-bold px-2 py-0.5 bg-teal-50 dark:bg-teal-950/50 rounded-lg">
                    {formData.children} {formData.children === 1 ? 'child' : 'children'}
                  </span>
                </div>
                <input
                  id="children"
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={formData.children}
                  onChange={(e) => setFormData({ ...formData, children: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>

              {/* Smoker Toggle (Primary Driver) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Active Smoker Status</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                      Primary Regression Driver
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Smoker × BMI interaction triggers strongest coefficient in the Linear model
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, smoker: 'no' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      formData.smoker === 'no'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, smoker: 'yes' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      formData.smoker === 'yes'
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-teal-500/20 transition-all flex items-center justify-center gap-2 text-base cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Evaluating Linear Regression Model...</span>
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5" />
                    <span>Calculate Insurance Estimate ({currency})</span>
                  </>
                )}
              </button>

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
                  {error}
                </div>
              )}
            </form>
          </Card>
        </div>

        {/* Prediction Results & Explanation Column */}
        <div className="lg:col-span-5 space-y-6">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result-card"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Result Card */}
                <Card className="border-2 border-teal-500/30 shadow-lg">
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Forecasted Annual Charge
                      </span>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          result.risk_level === 'low'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                            : result.risk_level === 'medium'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {result.risk_label}
                      </span>
                    </div>

                    {/* Primary Number */}
                    <div>
                      <div className="text-3xl sm:text-4xl font-extrabold text-teal-600 dark:text-teal-400 tracking-tight">
                        {renderCost(result.predicted_usd, result.estimated_inr)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-block text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md">
                          Estimated, India-adjusted
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          (~{renderCost(result.monthly_equivalent_usd, result.monthly_equivalent_inr, false)}/mo)
                        </span>
                      </div>
                      {isINR && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                          Base USD Prediction: ${result.predicted_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>

                    {/* Comparison vs Peer Cohort */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-teal-500" /> Peer Cohort (Age ±5 yrs, {formData.smoker} smoker)
                        </span>
                        <span>
                          {renderCost(
                            result.average_cost_for_similar_profiles_usd,
                            result.average_cost_for_similar_profiles_inr,
                            false
                          )}
                        </span>
                      </div>

                      {/* Visual Comparison Bar */}
                      <div className="space-y-1.5">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
                          <div
                            className={`h-full ${
                              result.cohort_difference_usd > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  15,
                                  (result.predicted_usd / (result.average_cost_for_similar_profiles_usd * 1.5 || 1)) * 100
                                )
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            {result.cohort_difference_usd > 0 ? '▲' : '▼'}{' '}
                            {renderCost(
                              Math.abs(result.cohort_difference_usd),
                              Math.abs(result.cohort_difference_inr),
                              false
                            )}{' '}
                            vs peer cohort average
                          </span>
                          <span>
                            Dataset Avg: {renderCost(result.overall_dataset_average_usd, result.overall_dataset_average_inr, false)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Plain-English Explanation */}
                    <div className="p-3.5 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40 rounded-xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <strong>Linear Regression Rationale:</strong> {result.explanation}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <Card key="empty-state" className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-4">
                  <Calculator className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1">
                  Ready to Calculate
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Adjust the parameters on the left and submit to receive a Linear Regression cost projection in {currency}.
                </p>
              </Card>
            )}
          </AnimatePresence>

          {/* "How this is calculated" Card */}
          <Card title="How this is calculated" subtitle="India conversion & actuarial adjustment formula">
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="p-3 bg-slate-100 dark:bg-slate-800/70 rounded-xl font-mono text-teal-700 dark:text-teal-300 border border-slate-200 dark:border-slate-700">
                estimated_inr = predicted_usd × USD_TO_INR_RATE × INDIA_COST_FACTOR
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-750">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">USD to INR Rate</span>
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    ₹{activeRate.toFixed(1)} / $1 USD
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-750">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">India Cost Factor</span>
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    {activeFactor.toFixed(2)} (Configurable)
                  </span>
                </div>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                The machine learning pipeline remains trained on original US insurance data (Ordinary Least Squares). This transparent conversion layer enables real-time Indian rupee estimates without corrupting the underlying empirical weights.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
