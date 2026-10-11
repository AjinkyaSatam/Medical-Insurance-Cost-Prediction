# 🩺 Medical Insurance Cost Prediction using Machine Learning

[![Python Version](https://img.shields.io/badge/Python-3.13-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38B2AC.svg)](https://tailwindcss.com/)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E.svg)](https://scikit-learn.org/)
[![Tests](https://img.shields.io/badge/Tests-Pytest%20Passing-brightgreen.svg)](https://pytest.org/)

An end-to-end Machine Learning healthcare platform that predicts individual annual medical healthcare expenses from demographic and lifestyle variables using an audited data pipeline, feature engineering, hyperparameter-tuned gradient boosting, a **high-performance FastAPI backend**, and a **modern SaaS React dashboard**.

---

## 📌 Table of Contents
- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Repository Structure](#repository-structure)
- [Dataset Description](#dataset-description)
- [Methodology & Pipeline](#methodology--pipeline)
- [Benchmark Results](#benchmark-results)
- [Installation & Quick Start](#installation--quick-start)
- [React Dashboard Interface](#react-dashboard-interface)
- [Automated Testing](#automated-testing)
- [Limitations & Future Scope](#limitations--future-scope)

---

## 📖 Project Overview
Medical insurance underwriters rely on actuarial models to forecast claims risk and calculate annual policy premiums. Individuals frequently experience unexpected, volatile out-of-pocket costs due to opaque pricing criteria.

This project delivers:
1. **Audited Data Cleaning & Outlier Analysis:** Analysis of high-cost charges ($34,500+) demonstrating they represent clinical risk signals rather than data errors.
2. **Domain-Specific Feature Engineering:** Synergistic interaction terms (`smoker_x_bmi`), clinical BMI thresholds (`obese`, `bmi_category`), and age brackets (`age_group`).
3. **Leak-Free Preprocessing:** Embedded inside a `scikit-learn` `Pipeline` and `ColumnTransformer` fitted strictly on training data.
4. **Multi-Model Benchmarking:** Linear Regression baseline, Random Forest, Gradient Boosting, and XGBoost evaluated on raw vs. log-transformed targets.
5. **Hyperparameter Tuning:** 5-fold cross-validated `RandomizedSearchCV` yielding an optimal test $R^2$ of **0.9188** (91.88% variance explained) and MAE of **$2,123.89**.
6. **Modern SaaS Architecture:** High-speed **FastAPI backend** serving cached analytics and inferences to a beautiful **React 19 + Tailwind CSS + Recharts** dashboard.

---

## 🏗️ System Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │           React Frontend (Vite + Tailwind CSS v4)           │
 │       http://localhost:5174  (Recharts, Framer Motion)      │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                │ REST API JSON Requests (CORS)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                FastAPI Backend (Uvicorn)                    │
 │               http://localhost:8000/api                     │
 │   ├── GET  /api/health      ──> Server & asset diagnostics  │
 │   ├── POST /api/predict     ──> Pydantic validation & infer │
 │   ├── GET  /api/eda         ──> In-memory cached slices     │
 │   ├── GET  /api/metrics     ──> Leaderboard & residuals     │
 │   └── GET  /api/insights    ──> Feature importance scores   │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                │ Loads once at startup
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │             Scikit-Learn Preprocessing & Model              │
 │                  models/best_model.joblib                   │
 │   ├── FeatureEngineer (obese, bmi_category, smoker_x_bmi)   │
 │   ├── ColumnTransformer (StandardScaler, OneHotEncoder)     │
 │   └── Tuned Gradient Boosting Regressor                     │
 └─────────────────────────────────────────────────────────────┘
```

---

## 📂 Repository Structure

```text
Medical-Insurance-Cost-Prediction/
├── backend/
│   └── main.py                    # FastAPI server (CORS, Pydantic validation, cached EDA)
├── frontend/                      # Modern React + Vite application
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js          # Axios API client pointing to VITE_API_URL
│   │   ├── components/
│   │   │   ├── Layout.jsx         # Sidebar, topbar, mobile drawer & theme toggle
│   │   │   ├── Card.jsx           # Reusable styled card container
│   │   │   ├── MetricCard.jsx     # Reusable KPI card with badge & icons
│   │   │   ├── SkeletonLoader.jsx # Polished loading skeletons
│   │   │   └── ErrorState.jsx     # Friendly error state with retry
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Overview hero, project summary & quick links
│   │   │   ├── Predict.jsx        # Estimator form, USD/INR toggle, risk badge
│   │   │   ├── EDA.jsx            # Interactive charts with dynamic slice filters
│   │   │   ├── Performance.jsx    # Model leaderboard, score bars, residuals
│   │   │   └── Insights.jsx       # Feature importance & plain-English takeaways
│   │   ├── App.jsx                # React Router setup
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── data/
│   └── insurance.csv              # 1,338 records, 7 attributes
├── notebooks/
│   └── eda_and_modeling.ipynb     # Complete Jupyter notebook with plots and markdown insights
├── src/
│   ├── preprocess.py              # Data cleaning, outlier analysis, FeatureEngineer transformer
│   ├── train.py                   # Multi-model benchmarking, CV tuning, and model export
│   └── evaluate.py                # Model evaluation metrics and diagnostic figure generator
├── models/
│   ├── best_model.joblib          # Pickled end-to-end Scikit-Learn Pipeline
│   ├── metrics.json               # Full benchmark scores and parameter logs
│   └── eval_cache.json            # Cached test predictions and residual data
├── tests/
│   └── test_model.py              # Automated pytest suite (invariants, domain sanity)
├── reports/
│   └── figures/                   # Generated evaluation plots
├── requirements.txt               # Pinned Python package versions
├── README.md                      # Comprehensive project guide
└── REPORT.md                      # Formal academic college report
```

---

## 📊 Dataset Description
The dataset consists of **1,338 individual healthcare beneficiaries** with 6 independent predictors and 1 continuous target:

| Feature | Type | Description | Values / Range |
| :--- | :--- | :--- | :--- |
| `age` | Integer | Age of primary beneficiary | 18 – 64 years |
| `sex` | Categorical | Biological insurance contractor gender | `female`, `male` |
| `bmi` | Float | Body mass index ($\text{kg/m}^2$) | 15.96 – 53.13 |
| `children` | Integer | Number of dependent children/dependents | 0 – 5 |
| `smoker` | Categorical | Active tobacco smoking status | `yes`, `no` |
| `region` | Categorical | Beneficiary's residential area in the US | `northeast`, `northwest`, `southeast`, `southwest` |
| **`charges`** | **Float** | **Individual medical costs billed by health insurance** | **$1,121.87 – $63,770.43 (Target)** |

- **Missing Values:** 0 null values detected across all columns.
- **Duplicates:** 1 duplicate record detected (row 581 duplicate of row 195) and dropped, retaining 1,337 unique rows.
- **Target Outlier Policy:** 139 charges exceed the $Q3 + 1.5 \times \text{IQR}$ threshold ($34,524.78). **97.8%** of these individuals are active smokers. These entries are retained because they reflect real clinical severity and high hospital utilization.

---

## 🧠 Methodology & Pipeline

```text
[Raw Input Data] 
       │
       ▼
[MedicalInsuranceFeatureEngineer] 
   ├── obese = (bmi >= 30.0)
   ├── bmi_category = ['Underweight', 'Normal', 'Overweight', 'Obese']
   ├── age_group = ['18-29', '30-44', '45-54', '55+']
   └── smoker_x_bmi = smoker_binary * bmi
       │
       ▼
[ColumnTransformer]
   ├── Numeric Scaler (StandardScaler) -> [age, bmi, children, obese, smoker_x_bmi]
   └── Categorical Encoder (OneHotEncoder) -> [sex, smoker, region, bmi_category, age_group]
       │
       ▼
[Tuned Gradient Boosting Regressor]
   ├── n_estimators: 100
   ├── learning_rate: 0.08
   ├── max_depth: 2
   ├── subsample: 0.9
   └── min_samples_split: 10
       │
       ▼
[Predicted Annual Charge ($)]
```

---

## 🏆 Benchmark Results

| Architecture | Target Scale | 5-Fold CV $R^2$ | Train $R^2$ | Test $R^2$ | Test MAE ($) | Test RMSE ($) | Overfitting Gap |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Tuned Gradient Boosting (Selected)** | **Raw** | **0.8433** | **0.8687** | **0.9188** | **$2,123.89** | **$3,421.90** | **-0.0501** |
| Baseline Gradient Boosting | Raw | 0.8351 | 0.8954 | 0.9156 | $2,128.55 | $3,487.49 | -0.0202 |
| Random Forest (Log Target) | $\log(1+y)$ | 0.8327 | 0.9576 | 0.9115 | $1,785.17 | $3,571.27 | 0.0460 |
| Gradient Boosting (Log Target) | $\log(1+y)$ | 0.8302 | 0.8741 | 0.9158 | $1,729.31 | $3,484.92 | -0.0416 |
| Linear Regression (Baseline) | Raw | 0.8259 | 0.8366 | 0.8983 | $2,474.76 | $3,829.44 | -0.0617 |
| Random Forest (Default) | Raw | 0.8197 | 0.9735 | 0.8908 | $2,433.40 | $3,967.05 | 0.0827 |
| XGBoost (Log Target) | $\log(1+y)$ | 0.7933 | 0.9888 | 0.8485 | $2,418.02 | $4,672.82 | 0.1402 |
| XGBoost (Default) | Raw | 0.7859 | 0.9938 | 0.8509 | $2,756.41 | $4,636.55 | 0.1429 |
| Linear Regression (Log Target) | $\log(1+y)$ | 0.4729 | 0.5008 | 0.5759 | $3,711.51 | $7,819.43 | -0.0751 |

---

## 🚀 Installation & Quick Start

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.13)
- Node.js 18+ & npm (tested on Node v22)
- Git

### 2. Setup Python Dependencies
```bash
# In the project root:
pip install -r requirements.txt
```

### 3. Launch Backend API Server (FastAPI)
```bash
# Starts the API server with auto-reload on port 8000:
uvicorn backend.main:app --reload --port 8000
```
Verify the backend at: `http://localhost:8000/api/health` or interactive Swagger docs at `http://localhost:8000/docs`.

### 4. Launch React Frontend (Vite)
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5174](http://localhost:5174)** in your browser to interact with the modern dashboard! (Port 5174 is configured to prevent conflicts with other projects on 5173).

### 5. Production Build
```bash
cd frontend
npm run build
```

---

## 🖥️ React Dashboard Interface

The React frontend offers 5 pages:
1. **🏠 Home / Overview:** Project hero summary, live dataset & model KPI cards, module quick links, and methodological integrity highlights.
2. **🔮 Predict Cost:** Parameter sliders for age, BMI (with direct slider or Height/Weight calculator), children, tobacco toggle, sex and region dropdowns. Returns:
   - Forecasted annual expense formatted in **USD ($)** or **INR (₹)** (with interactive currency toggle at 1 USD = ₹83.00).
   - Monthly equivalent estimate.
   - Colored risk badge (**Low Risk**, **Moderate Risk**, **High Risk**).
   - Benchmark comparison bar vs similar demographic peers (same smoker status, age ±5).
   - Plain-English actuarial explanation and medical estimate disclaimer.
3. **📊 EDA Analytics:** Interactive Recharts visualizations:
   - Histogram distribution of raw charges with smoker/non-smoker stacked breakdown.
   - Categorical averages by smoker, gender, region, and children.
   - Scatter plots for Age vs Charges and BMI vs Charges colored by smoking status.
   - Pearson correlation heatmap table.
   - Dynamic multi-variable filters (Region multiselect, Smoking status filter, Age range slider).
4. **📈 Model Benchmark:** Transparent leaderboard comparing all 8 evaluated model configurations, CV vs Test score bar charts, predicted vs actual scatter plot ($y = x$), and residual error homoscedasticity diagnostics.
5. **💡 Actuarial Insights:** Top feature importance horizontal bar chart illustrating the **80.03%** impact of `smoker_x_bmi`, followed by structured cards detailing lifestyle savings and demographic equity.

---

## 🧪 Automated Testing
Run the automated pytest test suite:
```bash
pytest tests/test_model.py -v
```
All 5 domain-invariant and pipeline tests pass cleanly:
- `test_model_artifact_and_steps`: Verifies pipeline serialization and transformer stages.
- `test_single_prediction_positive`: Asserts individual predictions yield positive, realistic values.
- `test_smoker_cost_higher_than_non_smoker`: Validates domain invariant that a smoker's premium exceeds an otherwise identical non-smoker's premium by over $8,000.
- `test_bmi_obesity_monotonicity`: Asserts that an obese individual has higher costs than a normal-weight peer holding all else equal.
- `test_batch_prediction`: Validates vectorization on batch inputs.

---

## 🔮 Limitations & Future Scope
- **Limitations:** Dataset contains 1,338 records without longitudinal medical tracking or ICD-10 diagnostic codes.
- **Future Scope:** Integrating SHAP explanation values directly into the React UI for local attribution, expanding the REST API with JWT authentication, and deploying via Docker containers.
