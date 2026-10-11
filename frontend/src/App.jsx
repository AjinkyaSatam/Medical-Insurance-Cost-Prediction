import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { CurrencyProvider } from './context/CurrencyContext';
import Home from './pages/Home';
import Predict from './pages/Predict';
import EDA from './pages/EDA';
import Performance from './pages/Performance';
import Insights from './pages/Insights';

export default function App() {
  return (
    <CurrencyProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/predict" element={<Predict />} />
            <Route path="/eda" element={<EDA />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </CurrencyProvider>
  );
}
