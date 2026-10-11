import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_USD_TO_INR_RATE, DEFAULT_INDIA_COST_FACTOR, formatCurrency, formatInrLakhCrore, convertUsdToInr } from '../utils/currency';
import { api } from '../api/client';

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  // INR is default currency as required
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('user_currency') || 'INR';
  });

  const [rate, setRate] = useState(DEFAULT_USD_TO_INR_RATE);
  const [costFactor, setCostFactor] = useState(DEFAULT_INDIA_COST_FACTOR);

  // Sync conversion parameters dynamically from backend configuration
  useEffect(() => {
    api.checkHealth()
      .then((data) => {
        if (data?.conversion_config?.usd_to_inr_rate) {
          setRate(Number(data.conversion_config.usd_to_inr_rate));
        }
        if (data?.conversion_config?.india_cost_factor) {
          setCostFactor(Number(data.conversion_config.india_cost_factor));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem('user_currency', currency);
  }, [currency]);

  const toggleCurrency = () => {
    setCurrency((prev) => (prev === 'INR' ? 'USD' : 'INR'));
  };

  /**
   * Helper to format any value based on current currency setting.
   * If value is in USD, converts to INR if current currency is INR.
   */
  const formatValue = (usdVal, options = {}) => {
    if (usdVal === null || usdVal === undefined || isNaN(usdVal)) return '—';
    if (currency === 'INR') {
      const inrVal = convertUsdToInr(usdVal, rate, costFactor);
      return formatCurrency(inrVal, 'INR', options);
    }
    return formatCurrency(usdVal, 'USD', options);
  };

  /**
   * Helper to format an already converted INR value or raw USD
   */
  const formatDirect = (amount, options = {}) => {
    return formatCurrency(amount, currency, options);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        toggleCurrency,
        isINR: currency === 'INR',
        rate,
        setRate,
        costFactor,
        factor: costFactor,
        setCostFactor,
        formatValue,
        formatDirect,
        formatInrLakhCrore,
        convertUsdToInr: (usd) => convertUsdToInr(usd, rate, costFactor),
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return ctx;
}
