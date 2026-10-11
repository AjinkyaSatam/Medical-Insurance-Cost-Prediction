import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  ArrowUpDown,
  Coins,
  Users,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import Card from '../components/Card';
import { api } from '../api/client';
import { useCurrency } from '../context/CurrencyContext';

export default function BulkPredict() {
  const { currency, toggleCurrency, isINR, formatDirect, formatInrLakhCrore } = useCurrency();

  // File upload state
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [batchData, setBatchData] = useState(null);

  // Table filters, search, sort, pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all'); // 'all', 'low', 'medium', 'high'
  const [sortField, setSortField] = useState('row');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showErrorsTable, setShowErrorsTable] = useState(false);
  const rowsPerPage = 10;

  // Drag and Drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a valid CSV file (.csv extension required).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('File size exceeds the 2 MB limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleProcessBatch = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.predictBatch(selectedFile);
      setBatchData(data);
      setCurrentPage(1);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to process CSV file. Ensure valid columns and format.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper to format values in the chosen currency
  const renderCost = (usdVal, inrVal, showShort = true) => {
    if (usdVal === undefined || usdVal === null) return '—';
    if (isINR) {
      const formatted = formatDirect(inrVal, { decimals: 0 });
      const short = showShort ? formatInrLakhCrore(inrVal) : null;
      return (
        <span>
          {formatted} {short && <span className="text-xs font-semibold opacity-80">({short})</span>}
        </span>
      );
    }
    return formatDirect(usdVal, { decimals: 2 });
  };

  // Filtered & Sorted Table Rows
  const filteredResults = useMemo(() => {
    if (!batchData?.results) return [];
    return batchData.results
      .filter((r) => {
        // Risk Filter
        if (riskFilter !== 'all' && r.risk_level !== riskFilter) return false;
        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (r.name || '').toLowerCase().includes(q);
          const matchRegion = (r.region || '').toLowerCase().includes(q);
          const matchSmoker = (r.smoker || '').toLowerCase().includes(q);
          const matchDriver = (r.top_cost_driver || '').toLowerCase().includes(q);
          if (!matchName && !matchRegion && !matchSmoker && !matchDriver) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (sortField === 'cost') {
          valA = a.estimated_cost_inr;
          valB = b.estimated_cost_inr;
        }
        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [batchData, riskFilter, searchQuery, sortField, sortAsc]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredResults.length / rowsPerPage) || 1;
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredResults.slice(start, start + rowsPerPage);
  }, [filteredResults, currentPage]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Formula-Injection Prevention for CSV Export
  const sanitizeCsvValue = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    // Prefix any text cell starting with = + - or @ with a single quote to prevent spreadsheet formula injection
    let safeStr = str;
    if (/^[=+\-@]/.test(safeStr)) {
      safeStr = `'${safeStr}`;
    }
    // Escape quotes and wrap in quotes if containing comma, newline, or quotes
    if (safeStr.includes(',') || safeStr.includes('"') || safeStr.includes('\n')) {
      return `"${safeStr.replace(/"/g, '""')}"`;
    }
    return safeStr;
  };

  const handleDownloadResultsCsv = () => {
    if (!batchData?.results || batchData.results.length === 0) return;

    const headers = [
      'Row',
      'Name',
      'Age',
      'Sex',
      'BMI',
      'Children',
      'Smoker',
      'Region',
      'Predicted_USD',
      'Estimated_INR',
      'Range_Low_INR',
      'Range_High_INR',
      'Risk_Level',
      'Top_Cost_Driver',
      'Short_Suggestion'
    ];

    const csvRows = [headers.join(',')];

    for (const r of batchData.results) {
      const row = [
        sanitizeCsvValue(r.row),
        sanitizeCsvValue(r.name || `Person ${r.row}`),
        sanitizeCsvValue(r.age),
        sanitizeCsvValue(r.sex),
        sanitizeCsvValue(r.bmi),
        sanitizeCsvValue(r.children),
        sanitizeCsvValue(r.smoker),
        sanitizeCsvValue(r.region),
        sanitizeCsvValue(r.predicted_usd),
        sanitizeCsvValue(r.estimated_cost_inr),
        sanitizeCsvValue(r.low),
        sanitizeCsvValue(r.high),
        sanitizeCsvValue(r.risk_level),
        sanitizeCsvValue(r.top_cost_driver),
        sanitizeCsvValue(r.short_suggestion)
      ];
      csvRows.push(row.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'insurance_batch_predictions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Risk Distribution Chart Data
  const chartData = useMemo(() => {
    if (!batchData?.counts_per_risk_level) return [];
    return [
      { name: 'Low Risk', count: batchData.counts_per_risk_level.low || 0, color: '#10b981' },
      { name: 'Moderate Risk', count: batchData.counts_per_risk_level.medium || 0, color: '#f59e0b' },
      { name: 'High Risk', count: batchData.counts_per_risk_level.high || 0, color: '#f43f5e' }
    ];
  }, [batchData]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-8 h-8 text-teal-500" />
            Bulk CSV Cost Estimator
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Evaluate rosters of up to 5,000 beneficiaries with in-memory Linear Regression batch inference and risk stratification.
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

      {/* Disclaimers & Privacy Notice Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Estimates Notice:</strong> Model trained on US data. Amounts are India-adjusted actuarial estimates, not real insurance policy quotes.
          </p>
        </div>

        <div className="p-3.5 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 rounded-xl flex items-start gap-3 text-xs text-teal-900 dark:text-teal-200 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>In-Memory Privacy:</strong> Files are processed strictly in memory and are never written or stored on disk.
          </p>
        </div>
      </div>

      {/* Upload Zone & Download Sample Card */}
      <Card title="Upload Beneficiaries Roster (CSV)" subtitle="Drag & drop your CSV file or use the sample template">
        <div className="space-y-6 pt-2">
          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              dragActive
                ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-teal-400'
            }`}
          >
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
              Drag & drop your beneficiary CSV here
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              Accepted columns: <code>name</code> (optional), <code>age</code>, <code>sex</code>, <code>bmi</code> (or <code>height_cm</code> & <code>weight_kg</code>), <code>children</code>, <code>smoker</code>, <code>region</code>. Max 2 MB, up to 5,000 rows.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <label
                htmlFor="csvFileInput"
                className="py-2.5 px-4 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Browse File</span>
              </label>
              <input
                id="csvFileInput"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Download Sample CSV Button */}
              <a
                href={api.getSampleBulkCsvUrl()}
                download="sample_bulk.csv"
                className="py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-teal-500" />
                <span>Download Sample CSV Template</span>
              </a>
            </div>

            {selectedFile && (
              <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-xl border border-teal-200 dark:border-teal-900 inline-flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 shadow-xs">
                <FileSpreadsheet className="w-4 h-4 text-teal-500" />
                <span className="font-semibold">{selectedFile.name}</span>
                <span className="text-slate-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                <button
                  type="button"
                  onClick={handleProcessBatch}
                  disabled={loading}
                  className="ml-2 py-1.5 px-3 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Process Batch</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Upload Error:</strong> {error}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Validation Summary & Results View */}
      {batchData && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {/* Validation Status Notification */}
          <div className="p-4 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Batch Processing Complete
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {batchData.rows_processed} rows evaluated successfully
                  </span>
                  {batchData.rows_skipped > 0 && (
                    <span className="text-rose-600 dark:text-rose-400 ml-2">
                      ({batchData.rows_skipped} invalid rows skipped)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {batchData.errors && batchData.errors.length > 0 && (
              <button
                type="button"
                onClick={() => setShowErrorsTable(!showErrorsTable)}
                className="py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
              >
                <span>{showErrorsTable ? 'Hide' : 'View'} Validation Errors ({batchData.errors.length})</span>
                {showErrorsTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* Expandable Errors Table */}
          {showErrorsTable && batchData.errors && batchData.errors.length > 0 && (
            <Card title="Row-Level Validation Errors" subtitle="Skipped rows and reason for omission">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase text-[10px]">
                      <th className="py-2.5 px-3">CSV Row #</th>
                      <th className="py-2.5 px-3">Invalid Field</th>
                      <th className="py-2.5 px-3">Validation Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchData.errors.map((err, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50/30 dark:hover:bg-rose-950/20"
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                          Row {err.row}
                        </td>
                        <td className="py-2.5 px-3 font-semibold uppercase">{err.column}</td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{err.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Aggregate KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Beneficiaries Processed</span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{batchData.rows_processed}</span>
                <Users className="w-5 h-5 text-teal-500 opacity-80" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Out of {batchData.total_rows} total rows uploaded
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Average Annual Estimate</span>
              <div className="text-xl sm:text-2xl font-extrabold text-teal-600 dark:text-teal-400">
                {renderCost(batchData.average_estimate_usd, batchData.average_estimate_inr)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Per beneficiary across valid roster
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Portfolio Exposure</span>
              <div className="text-xl sm:text-2xl font-extrabold text-teal-600 dark:text-teal-400">
                {renderCost(batchData.total_estimate_usd, batchData.total_estimate_inr)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Combined projected insurance charges
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Risk Stratification</span>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {batchData.counts_per_risk_level?.low || 0} Low
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  {batchData.counts_per_risk_level?.medium || 0} Med
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  {batchData.counts_per_risk_level?.high || 0} High
                </span>
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                Based on 33rd & 66th charge percentiles
              </p>
            </div>
          </div>

          {/* Risk Level Distribution Chart Card */}
          <Card title="Risk Tier Portfolio Breakdown" subtitle="Distribution of beneficiaries across Low, Moderate, and High risk tiers">
            <div className="h-44 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 90, bottom: 5 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} />
                  <Tooltip
                    formatter={(val) => [`${val} beneficiaries`, 'Count']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Results Table Section */}
          <Card
            title="Beneficiary Prediction Roster"
            subtitle="Search, filter, sort and export batch predictions"
          >
            <div className="space-y-4 pt-2">
              {/* Controls Toolbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search name, region, smoker, or driver..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {/* Filter and Export Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Risk Tier Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                    {['all', 'low', 'medium', 'high'].map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => {
                          setRiskFilter(tier);
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-semibold uppercase text-[10px] transition cursor-pointer ${
                          riskFilter === tier
                            ? 'bg-teal-500 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>

                  {/* Download CSV Button */}
                  <button
                    type="button"
                    onClick={handleDownloadResultsCsv}
                    className="py-2 px-3 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 text-xs font-bold rounded-xl border border-teal-200 dark:border-teal-800 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Export sanitized predictions to CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Results CSV</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                      <th
                        onClick={() => toggleSort('row')}
                        className="py-3 px-3 cursor-pointer hover:text-teal-500"
                      >
                        <div className="flex items-center gap-1">
                          <span>#</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        onClick={() => toggleSort('name')}
                        className="py-3 px-3 cursor-pointer hover:text-teal-500"
                      >
                        <div className="flex items-center gap-1">
                          <span>Name</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        onClick={() => toggleSort('age')}
                        className="py-3 px-3 cursor-pointer hover:text-teal-500"
                      >
                        <div className="flex items-center gap-1">
                          <span>Age/Sex</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        onClick={() => toggleSort('bmi')}
                        className="py-3 px-3 cursor-pointer hover:text-teal-500"
                      >
                        <div className="flex items-center gap-1">
                          <span>BMI / Kids</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-3 px-3">Smoker / Region</th>
                      <th
                        onClick={() => toggleSort('cost')}
                        className="py-3 px-3 cursor-pointer hover:text-teal-500"
                      >
                        <div className="flex items-center gap-1">
                          <span>Estimate ({currency})</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-3 px-3">Likely Range</th>
                      <th className="py-3 px-3">Risk Tier</th>
                      <th className="py-3 px-3">Primary Driver</th>
                      <th className="py-3 px-3">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedResults.length > 0 ? (
                      paginatedResults.map((r, idx) => (
                        <tr
                          key={r.row || idx}
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                        >
                          <td className="py-3 px-3 font-mono text-slate-400 font-semibold">{r.row}</td>
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                            {r.name || `Person ${r.row}`}
                          </td>
                          <td className="py-3 px-3">
                            <div>{r.age} yrs</div>
                            <div className="text-[10px] text-slate-400 capitalize">{r.sex}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold">{r.bmi}</div>
                            <div className="text-[10px] text-slate-400">{r.children} {r.children === 1 ? 'child' : 'kids'}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                r.smoker === 'yes'
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {r.smoker === 'yes' ? 'Smoker' : 'Non-Smoker'}
                            </span>
                            <div className="text-[10px] text-slate-400 capitalize mt-0.5">{r.region}</div>
                          </td>
                          <td className="py-3 px-3 font-bold text-teal-600 dark:text-teal-400 font-mono">
                            {renderCost(r.predicted_usd, r.estimated_cost_inr)}
                          </td>
                          <td className="py-3 px-3 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                            {isINR
                              ? `₹${Math.round(r.low).toLocaleString('en-IN')} – ₹${Math.round(r.high).toLocaleString('en-IN')}`
                              : `$${Math.round(r.low_usd).toLocaleString('en-US')} – $${Math.round(r.high_usd).toLocaleString('en-US')}`}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                r.risk_level === 'low'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300'
                                  : r.risk_level === 'medium'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-300'
                              }`}
                            >
                              {r.risk_level}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[11px] max-w-[140px] truncate" title={r.top_cost_driver}>
                            {r.top_cost_driver}
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-500 max-w-[180px] truncate" title={r.short_suggestion}>
                            {r.short_suggestion}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                          No beneficiaries match the current filter or search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2">
                <div>
                  Showing {filteredResults.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to{' '}
                  {Math.min(currentPage * rowsPerPage, filteredResults.length)} of {filteredResults.length} filtered entries
                </div>

                <div className="flex items-center gap-1.5 self-center sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 rounded-lg font-semibold transition cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 rounded-lg font-semibold transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
