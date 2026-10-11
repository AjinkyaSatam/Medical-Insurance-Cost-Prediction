import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  BarChart3,
  Award,
  Lightbulb,
  ArrowRight,
  Database,
  CheckCircle2,
  Cpu,
  TrendingUp,
  FileText
} from 'lucide-react';
import Card from '../components/Card';
import MetricCard from '../components/MetricCard';
import { SkeletonCard } from '../components/SkeletonLoader';
import ErrorState from '../components/ErrorState';
import { api } from '../api/client';

export default function Home() {
  const [metrics, setMetrics] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [metricsData, healthData] = await Promise.all([
        api.getMetrics(),
        api.checkHealth(),
      ]);
      setMetrics(metricsData);
      setHealth(healthData);
    } catch (err) {
      setError(err.message || 'Failed to fetch model statistics');
    } finally {
      setLoading(false);
    }
  };

  const finalMetrics = metrics?.final_metrics || {};

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl shadow-teal-950/10">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            <Cpu className="w-3.5 h-3.5 text-teal-300" />
            Machine Learning • Actuarial Forecasting
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Predict Individual Healthcare Costs with Precision ML
          </h1>

          <p className="text-teal-100/90 text-sm sm:text-base leading-relaxed">
            An end-to-end medical insurance expenditure predictor powered by an audited Scikit-Learn
            Gradient Boosting ensemble. Discover risk factors, explore cohort benchmarks, and analyze actuarial insights.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/predict"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-teal-900 hover:bg-teal-50 font-semibold rounded-xl text-sm transition shadow-sm"
            >
              <Calculator className="w-4 h-4 text-teal-600" /> Calculate Estimate
            </Link>
            <Link
              to="/eda"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600/40 hover:bg-teal-600/60 border border-teal-400/30 text-white font-semibold rounded-xl text-sm backdrop-blur-sm transition"
            >
              <BarChart3 className="w-4 h-4" /> Explore Data
            </Link>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/4 -top-20 w-80 h-80 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      ) : error ? (
        <ErrorState onRetry={loadData} message={error} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Dataset Records"
            value={health?.dataset_records?.toLocaleString() || '1,337'}
            subtitle="Clean US Beneficiaries"
            icon={Database}
            color="teal"
          />
          <MetricCard
            title="Final Model"
            value={metrics?.final_model?.replace(' Regressor', '') || 'Gradient Boosting'}
            subtitle="Cross-Validation Selected"
            icon={Award}
            color="indigo"
          />
          <MetricCard
            title="Test R² Score"
            value={`${((finalMetrics.test_r2 || 0.9188) * 100).toFixed(2)}%`}
            subtitle="Variance Explained"
            icon={TrendingUp}
            color="emerald"
            badge="Hold-out Test"
          />
          <MetricCard
            title="Mean Absolute Error"
            value={`$${(finalMetrics.test_mae || 2123.89).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            subtitle="Average Prediction Error"
            icon={Calculator}
            color="amber"
          />
        </div>
      )}

      {/* Platform Features Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Platform Modules</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Navigate through the core modules of this ML project</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Link to="/predict" className="group">
            <Card hover className="h-full border-l-4 border-l-teal-500">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                  <Calculator className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                Interactive Cost Estimator
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Input personal demographics, biometric indicators, and lifestyle factors to receive real-time cost predictions with risk stratification and peer cohort comparisons.
              </p>
              <div className="flex items-center gap-2 text-xs font-medium text-teal-600 dark:text-teal-400">
                <span>Try the prediction tool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Card>
          </Link>

          <Link to="/eda" className="group">
            <Card hover className="h-full border-l-4 border-l-blue-500">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Exploratory Data Analysis
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Interactive charts exploring cost distributions, categorical breakdowns by smoker and region, BMI vs Age non-linearities, and Pearson correlation matrices.
              </p>
              <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                <span>View interactive charts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Card>
          </Link>

          <Link to="/performance" className="group">
            <Card hover className="h-full border-l-4 border-l-indigo-500">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                  <Award className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Model Performance & Benchmarking
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Transparent evaluation comparing Linear Regression, Random Forest, Gradient Boosting, and XGBoost across raw and log1p targets with diagnostic residual plots.
              </p>
              <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                <span>Inspect model leaderboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Card>
          </Link>

          <Link to="/insights" className="group">
            <Card hover className="h-full border-l-4 border-l-amber-500">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                  <Lightbulb className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Actuarial Insights
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Feature importance rankings and plain-English takeaways illustrating the compounding impact of smoking, clinical obesity, and chronological aging on health expenditure.
              </p>
              <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                <span>Read actuarial findings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Methodology & Quality Badges */}
      <Card title="Methodological Integrity & System Highlights">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Leak-Free Pipeline</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Scikit-Learn ColumnTransformer and FeatureEngineer fitted strictly on 80% training splits.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Stratified 5-Fold CV</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tuned with RandomizedSearchCV, maintaining exact ~20.5% smoker representation across all folds.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Clinical Outlier Retention</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                139 target outliers ($34,500+) retained as genuine clinical risk signals (97.8% are smokers).
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
