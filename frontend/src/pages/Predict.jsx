import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  AlertTriangle,
  Coins,
  RefreshCw,
  Users,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Heart,
  Sparkles,
  Scale
} from 'lucide-react';
import Card from '../components/Card';
import { api } from '../api/client';
import { useCurrency } from '../context/CurrencyContext';

export default function Predict() {
  const { currency, toggleCurrency, isINR, rate = 96.0, costFactor = 1.0, factor = 1.0, formatDirect, formatInrLakhCrore } = useCurrency();
  const activeRate = Number(rate || 96.0);
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

  // Feature 4: BMI Calculator Inputs & State
  const [heightCm, setHeightCm] = useState(175);
  const [weightKg, setWeightKg] = useState(75);
  const [bmiCalcError, setBmiCalcError] = useState(null);
  const [bmiCalcSuccess, setBmiCalcSuccess] = useState(false);

  // Inference state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Feature 4: Calculate BMI Button Handler with Validation
  const handleCalculateBmi = (e) => {
    if (e) e.preventDefault();
    setBmiCalcError(null);
    setBmiCalcSuccess(false);

    const h = Number(heightCm);
    const w = Number(weightKg);

    if (isNaN(h) || h < 100 || h > 250) {
      setBmiCalcError('Height must be between 100 and 250 cm.');
      return;
    }
    if (isNaN(w) || w < 20 || w > 300) {
      setBmiCalcError('Weight must be between 20 and 300 kg.');
      return;
    }

    const heightM = h / 100.0;
    const computedBmi = Math.round((w / (heightM * heightM)) * 10) / 10;
    setFormData((prev) => ({ ...prev, bmi: computedBmi }));
    setBmiCalcSuccess(true);
    setTimeout(() => setBmiCalcSuccess(false), 3500);
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
    if (bmi < 18.5) return { label: 'Underweight', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-300' };
    if (bmi <= 24.9) return { label: 'Normal weight (WHO)', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300' };
    if (bmi <= 29.9) return { label: 'Overweight', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-300' };
    return { label: 'Clinically Obese (BMI ≥ 30)', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-300 font-bold' };
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
          {formatted} {short && <span className="text-sm font-semibold opacity-85">({short})</span>}
        </span>
      );
    }
    return formatDirect(usdVal, { decimals: 2 });
  };

  // Helper for signed contribution amounts
  const renderContributionAmount = (contribUsd, contribInr) => {
    if (isINR) {
      const absVal = Math.abs(contribInr);
      const sign = contribInr >= 0 ? '+' : '-';
      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(absVal);
      const short = formatInrLakhCrore(absVal);
      return `${sign}${formatted} (${short})`;
    }
    const absVal = Math.abs(contribUsd);
    const sign = contribUsd >= 0 ? '+' : '-';
    return `${sign}$${absVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Find max absolute contribution for factor breakdown scaling
  const maxContribUsd = result?.breakdown?.contributions?.length
    ? Math.max(...result.breakdown.contributions.map((c) => Math.abs(c.contribution_usd)))
    : 1;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Medical Insurance Cost Estimator
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Multiple Linear Regression model with configurable India INR translation layer & actuarial breakdown.
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

      {/* Mandatory Academic Disclaimer Banner */}
      <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Academic Notice:</strong> Model trained on empirical US health records. Figures are India-adjusted estimates via configurable INR exchange and cost factors, not actual insurance policy quotes.
        </p>
      </div>

      {/* Main Grid: Form on Left, Output on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column (Left: 5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card title="Beneficiary Profile Form" subtitle="Enter demographic & biometric predictors">
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
                  <label htmlFor="region" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    US dataset region
                  </label>
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
                    Note: Indian cities are not in the US training data.
                  </p>
                </div>
              </div>

              {/* FEATURE 4: BMI CALCULATOR (Height & Weight Inputs + Calculate BMI Button) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Body Mass Index (BMI)
                    </span>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${bmiCat.badge}`}>
                    {bmiCat.label}
                  </span>
                </div>

                {/* Direct BMI Slider & Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-600 dark:text-slate-400">Current BMI:</span>
                    <span className="text-teal-600 dark:text-teal-400 font-extrabold text-sm">
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
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>15 (Underweight)</span>
                    <span>25 (Normal)</span>
                    <span>30 (Obese)</span>
                    <span>55</span>
                  </div>
                </div>

                {/* Feature 4 Subpanel: Height & Weight Inputs with "Calculate BMI" button */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      BMI Calculator Tool
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Formula: weight / (height/100)²
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="heightCm" className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                        Height (cm)
                      </label>
                      <input
                        id="heightCm"
                        type="number"
                        min="100"
                        max="250"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        placeholder="100 - 250"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <span className="text-[10px] text-slate-400">Range: 100–250 cm</span>
                    </div>

                    <div>
                      <label htmlFor="weightKg" className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                        Weight (kg)
                      </label>
                      <input
                        id="weightKg"
                        type="number"
                        min="20"
                        max="300"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        placeholder="20 - 300"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <span className="text-[10px] text-slate-400">Range: 20–300 kg</span>
                    </div>
                  </div>

                  {bmiCalcError && (
                    <p className="text-[11px] text-rose-500 font-medium">
                      {bmiCalcError}
                    </p>
                  )}

                  {bmiCalcSuccess && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> BMI updated to {formData.bmi} kg/m²!
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleCalculateBmi}
                    className="w-full py-2 px-3 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-semibold rounded-lg text-xs border border-teal-200 dark:border-teal-800 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Calculate BMI & Set Value</span>
                  </button>

                  {/* Feature 4: Note on Indian Guidelines */}
                  <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-lg text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
                    <p>
                      <strong>Indian Guidelines Note:</strong> Consensus guidelines for Asian Indians (ICMR & Ministry of Health) use lower cutoffs for overweight (BMI ≥ 23 kg/m²) and obesity (BMI ≥ 25 kg/m²) than the cutoff of 30 used in the dataset's logic, reflecting higher cardiovascular risk at lower body fat thresholds.
                    </p>
                  </div>
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

              {/* Smoker Toggle */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Active Smoker Status</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                      Primary Factor
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Smoker × BMI interaction produces the largest coefficient in the linear model
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

        {/* Results Column (Right: 7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* 1. Primary Result Card (Features 1 & Risk Level) */}
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

                    {/* Primary Prediction Number */}
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
                          Base Model Prediction: ${result.predicted_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>

                    {/* FEATURE 1: ESTIMATED RANGE ("Likely range: Rs X - Rs Y" on result card) */}
                    <div className="p-3.5 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-slate-800/80 dark:to-slate-800/50 border border-teal-200/80 dark:border-teal-900/50 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Likely range:
                          </span>
                          <span className="text-sm font-extrabold text-teal-700 dark:text-teal-300">
                            {isINR ? (
                              <>
                                ₹{Math.round(result.low).toLocaleString('en-IN')} – ₹{Math.round(result.high).toLocaleString('en-IN')}
                                <span className="text-xs font-semibold ml-1.5 opacity-80">
                                  ({formatInrLakhCrore(result.low)} – {formatInrLakhCrore(result.high)})
                                </span>
                              </>
                            ) : (
                              `$${Math.round(result.low_usd).toLocaleString('en-US')} – $${Math.round(result.high_usd).toLocaleString('en-US')}`
                            )}
                          </span>
                        </div>

                        {/* Tooltip on typical error */}
                        <div className="relative group">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800 flex items-center gap-1 cursor-pointer">
                            approximate range <HelpCircle className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                          </span>
                          <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-xl z-30 leading-relaxed border border-slate-700">
                            <strong>Predictive Range Formula:</strong>
                            <p className="mt-1 text-slate-300">
                              Computed as prediction ± 1.96 × residual standard deviation ($3,802.71 / ₹{Math.round(3802.71 * activeRate * activeFactor).toLocaleString('en-IN')}) from hold-out test residuals, floored at 0. Represents an empirical 95% interval based on the model's typical error.
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Accounts for empirical variance and typical regression error in insurance claims.
                      </p>
                    </div>

                    {/* Comparison vs Peer Cohort */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5">
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

                      <div className="space-y-1">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex">
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

                    {/* Rationale Note */}
                    <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40 rounded-xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <strong>Linear Regression Rationale:</strong> {result.explanation}
                    </div>
                  </div>
                </Card>

                {/* 2. FEATURE 2: FACTOR BREAKDOWN (Horizontal Bar Chart) */}
                {result.breakdown && result.breakdown.contributions && (
                  <Card
                    title="Factor Breakdown (Feature Contributions)"
                    subtitle="How each input shifts your estimate relative to the average person (coef × [x - mean_x])"
                  >
                    <div className="space-y-4 pt-2">
                      <div className="space-y-3">
                        {result.breakdown.contributions.map((c) => {
                          const isPositive = c.contribution_usd >= 0;
                          const barPct = Math.min(100, (Math.abs(c.contribution_usd) / (maxContribUsd || 1)) * 100);

                          return (
                            <div key={c.field} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                  {isPositive ? (
                                    <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                                  ) : (
                                    <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                                  )}
                                  {c.label}
                                </span>
                                <span
                                  className={`font-mono font-bold text-xs ${
                                    isPositive ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                                  }`}
                                >
                                  {renderContributionAmount(c.contribution_usd, c.contribution_inr)}
                                </span>
                              </div>

                              {/* Horizontal Bar Chart visualization */}
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden flex">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isPositive
                                      ? 'bg-gradient-to-r from-amber-400 to-rose-500'
                                      : 'bg-gradient-to-r from-teal-400 to-emerald-500'
                                  }`}
                                  style={{ width: `${Math.max(4, barPct)}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-400">
                                <span>{isPositive ? 'Raises predicted cost' : 'Lowers predicted cost'}</span>
                                <span>{barPct.toFixed(0)}% relative impact</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Mathematical Invariant Verification Badge */}
                      <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Mathematical Identity Verified:</span>
                        </div>
                        <p className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          Average Profile ({renderCost(result.breakdown.base_prediction_usd, result.breakdown.base_prediction_inr, true)}) + Sum of Contributions ({renderContributionAmount(result.breakdown.total_contributions_usd, result.breakdown.total_contributions_inr)}) = Prediction ({renderCost(result.breakdown.person_prediction_usd, result.breakdown.person_prediction_inr, true)})
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* 3. FEATURE 3: WHAT-IF SCENARIOS (Potential Savings Cards) */}
                <Card
                  title="What-If Counterfactual Scenarios"
                  subtitle="Simulation re-running the model with one changeable factor improved"
                >
                  <div className="space-y-4 pt-2">
                    {result.whatif && result.whatif.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4">
                        {result.whatif.map((sc) => (
                          <div
                            key={sc.id}
                            className="p-4 bg-gradient-to-r from-teal-50/50 via-white to-emerald-50/40 dark:from-slate-800/80 dark:to-slate-800/40 border border-teal-200 dark:border-teal-900 rounded-xl space-y-3 shadow-xs"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <Sparkles className="w-4 h-4 text-teal-500" />
                                  {sc.title}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {sc.action}
                                </p>
                              </div>
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                Save {renderCost(sc.saving_usd, sc.saving_inr)}
                              </span>
                            </div>

                            {/* Before vs After Cost Comparison */}
                            <div className="grid grid-cols-2 gap-3 p-3 bg-white/80 dark:bg-slate-900/60 rounded-lg border border-slate-200/60 dark:border-slate-800 text-xs">
                              <div>
                                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Current Value</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{sc.before_value}</span>
                                <span className="block text-slate-500 text-[11px] mt-0.5">
                                  Cost: {renderCost(sc.current_cost_usd, sc.current_cost_inr, false)}
                                </span>
                              </div>
                              <div className="border-l border-slate-200 dark:border-slate-800 pl-3">
                                <span className="block text-[10px] text-teal-600 dark:text-teal-400 uppercase font-semibold">With What-If</span>
                                <span className="font-bold text-teal-700 dark:text-teal-300">{sc.after_value}</span>
                                <span className="block text-teal-600 dark:text-teal-400 text-[11px] mt-0.5">
                                  New Cost: {renderCost(sc.new_cost_usd, sc.new_cost_inr, false)}
                                </span>
                              </div>
                            </div>

                            {/* Required Guarantee Note */}
                            <p className="text-[11px] text-slate-400 italic">
                              "{sc.note}"
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                        <strong>Optimal Modifiable Baseline:</strong> No counterfactual what-if scenarios apply because you are already a non-smoker with a healthy BMI.
                      </div>
                    )}
                  </div>
                </Card>

                {/* 4. FEATURE 5: HOW THE CUSTOMER CAN LOWER THEIR ESTIMATE */}
                <Card
                  title="How to Lower Your Estimated Cost"
                  subtitle="Actionable, transparent guidance derived from regression rules without shaming"
                >
                  <div className="space-y-4 pt-2">
                    {result.suggestions?.has_modifiable_factors ? (
                      <div className="space-y-3">
                        {result.suggestions.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3"
                          >
                            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 mt-0.5">
                              <Heart className="w-4 h-4" />
                            </div>
                            <div className="space-y-1">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                {item.title}
                              </h5>
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                {item.suggestion}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block mr-1.5 -mt-0.5" />
                        {result.suggestions?.positive_message || "Your profile has no major modifiable cost drivers in this model."}
                      </div>
                    )}

                    {/* Unchangeable Factors Note */}
                    <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {result.suggestions?.unchangeable_factors_note ||
                        "Note on fixed factors: Age, biological sex, US dataset region, and dependent children cannot and should not be changed. They represent standard demographic context and are not judged."}
                    </div>

                    {/* Medical Advice Disclaimer */}
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 italic">
                      ⚠️ {result.suggestions?.medical_disclaimer || "General information only, not medical advice. Consult a doctor before making health changes."}
                    </p>
                  </div>
                </Card>

                {/* 5. How this is calculated Card */}
                <Card title="Conversion & Actuarial Formulation" subtitle="India conversion & Linear Regression pipeline design">
                  <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800/70 rounded-xl font-mono text-teal-700 dark:text-teal-300 border border-slate-200 dark:border-slate-700">
                      estimated_inr = predicted_usd × USD_TO_INR_RATE ({activeRate}) × INDIA_COST_FACTOR ({activeFactor})
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-750">
                        <span className="block text-[10px] uppercase font-bold text-slate-400">USD to INR Rate</span>
                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                          ₹{activeRate.toFixed(1)} / $1 USD
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-750">
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Residual Std Dev</span>
                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                          $3,802.71 (Hold-out)
                        </span>
                      </div>
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
        </div>
      </div>
    </div>
  );
}
