# 🩺 Medical Insurance Cost Prediction using Linear Regression (with India INR Conversion Layer)

[![Python Version](https://img.shields.io/badge/Python-3.13-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB.svg)](https://react.dev/)
[![Scikit-Learn](https://img.shields.io/badge/ML-Linear%20Regression-F7931E.svg)](https://scikit-learn.org/)
[![Tests](https://img.shields.io/badge/Tests-Pytest%20Passing-brightgreen.svg)](https://pytest.org/)

An academic machine learning project predicting annual medical insurance charges using **Multiple Linear Regression (Ordinary Least Squares)**. The project features domain-specific feature engineering, an 80/20 stratified split, 5-fold cross-validation, a configurable **India INR conversion layer**, a high-performance **FastAPI backend**, and an interactive **React dashboard**.

---

## 📌 Table of Contents
- [Project Overview](#-project-overview)
- [Linear Regression Model & Performance](#-linear-regression-model--performance)
- [India INR Conversion Layer](#-india-inr-conversion-layer)
- [System Architecture](#-system-architecture)
- [Repository Structure](#-repository-structure)
- [Dataset Description](#-dataset-description)
- [Installation & Run Commands](#-installation--run-commands)
- [Limitations & Future Scope](#-limitations--future-scope)
- [College Viva Reference](#-college-viva-reference)

---

## 📖 Project Overview

Medical insurance underwriters rely on statistical models to price coverage risk and calculate annual policy premiums. This project was developed strictly according to college academic curriculum requirements focusing on **Linear Regression**:

1. **Pure Linear Regression Focus:** The project uses **Ordinary Least Squares (OLS) Linear Regression** as its single, dedicated model.
2. **Domain-Specific Feature Engineering:** Includes obesity categorization (`obese`, `bmi_category`), age groups (`age_group`), and the crucial interaction term (`smoker_x_bmi`) capturing the compounding health hazard of smoking with high body mass.
3. **Leak-Free Preprocessing Pipeline:** Combining `MedicalInsuranceFeatureEngineer`, `StandardScaler`, `OneHotEncoder`, and `LinearRegression` into an end-to-end `scikit-learn` `Pipeline`.
4. **Configurable India INR Conversion Layer:** Connects the model (trained on empirical US medical billing data) to Indian Rupee (INR) cost projections using configurable currency and healthcare cost adjustment factors.
5. **Modern Full-Stack Dashboard:** A FastAPI REST backend coupled with a responsive React 19 + Tailwind CSS + Recharts user interface.

---

## 📊 Linear Regression Model & Performance

The model is trained on raw insurance charges (`data/insurance.csv`) using an 80/20 train/test split stratified on smoking status (`random_state=42`).

### 1. Benchmark Metrics vs. Trivial Mean Baseline

| Metric | Trivial Mean Baseline | Multiple Linear Regression | Absolute Improvement |
| :--- | :---: | :---: | :---: |
| **Train $R^2$** | 0.0000 (0.0%) | **0.8366 (83.66%)** | +83.66% |
| **Test $R^2$** | -0.0010 (0.0%) | **0.8983 (89.83%)** | **+89.83%** |
| **5-Fold CV $R^2$** | — | **0.8259 (82.59% ± 3.92%)** | High Generalization |
| **Test MAE** | $9,080.77 (₹7,53,704) | **$2,474.76 (₹2,05,405)** | **72.7% error reduction** |
| **Test RMSE** | $12,012.59 (₹9,97,045) | **$3,829.44 (₹3,17,844)** | **68.1% error reduction** |

### 2. Regression Equation & Key Coefficients

The fitted model follows the multiple linear regression formula:
$$\hat{y} = \beta_0 + \sum_{i=1}^{n} \beta_i x_i$$

- **Intercept ($\beta_0$):** **$18,438.79** (₹15,30,420)
- **Top Feature Coefficients:**
  - `smoker_x_bmi`: **+$19,064.75** (₹15,82,374) — Strongest synergistic risk factor
  - `age`: **+$3,849.24** (₹3,19,487) — Predictable linear chronological progression
  - `obese`: **+$2,123.38** (₹1,76,241) — Clinical obesity threshold impact (BMI ≥ 30)
  - `children`: **+$879.83** (₹73,026) — Dependent coverage adjustment

---

## 🇮🇳 India INR Conversion Layer

Because the model is trained on the empirical US `insurance.csv` dataset, presenting raw dollar predictions directly to Indian users is counter-intuitive. Rather than corrupting the model's learned weights, a transparent **conversion layer** is implemented in `backend/config.py`:

```python
# backend/config.py
USD_TO_INR_RATE: float = 83.0      # Current exchange rate
INDIA_COST_FACTOR: float = 1.0     # Healthcare cost purchasing power adjustment
```

### Conversion Formula:
$$\text{Estimated INR} = \text{Predicted USD} \times \text{USD\_TO\_INR\_RATE} \times \text{INDIA\_COST\_FACTOR}$$

- **Editable Configuration:** Both parameters can be adjusted directly in `backend/config.py` without modifying any other code.
- **Applied System-Wide:** Converted figures are displayed across predictions, peer cohort averages, EDA charts (axes, bins, tooltips), and regression coefficients.
- **Dual Display:** Frontend defaults to **INR** (formatted via `Intl.NumberFormat('en-IN')` with Lakh/Crore annotations) with a live toggle to view original **USD** amounts.

---

## 🏗️ System Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │           React Frontend (Vite + Tailwind CSS)              │
 │       http://localhost:5174  (Recharts, Lucide Icons)       │
 │   • INR Default with USD Toggle (Intl.NumberFormat)         │
 │   • How This Is Calculated Card & Disclaimers               │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                │ REST API JSON Requests
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                FastAPI Backend (Uvicorn)                    │
 │               http://localhost:8000/api                     │
 │   ├── backend/config.py     ──> USD_TO_INR_RATE, COST_FACTOR│
 │   ├── POST /api/predict     ──> Linear Regression + 5 Feats │
 │   ├── POST /api/whatif      ──> Counterfactual simulations  │
 │   ├── POST /api/bmi-calculate─> BMI formula & Asian cutoffs │
 │   ├── GET  /api/metrics     ──> Baseline vs Model diagnostic│
 │   ├── GET  /api/insights    ──> Coefficients in INR & USD   │
 │   └── GET  /api/eda         ──> Converted EDA distributions │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                │ Loads pipeline at startup
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │           Scikit-Learn Linear Regression Pipeline           │
 │                  models/best_model.joblib                   │
 │   ├── FeatureEngineer (obese, bmi_category, smoker_x_bmi)   │
 │   ├── ColumnTransformer (StandardScaler, OneHotEncoder)     │
 │   └── LinearRegression() (Ordinary Least Squares)           │
 └─────────────────────────────────────────────────────────────┘
```

---

## 💡 Five Value-Added Analytics Features (Linear Regression Powered)

All five features are computed using plain mathematical formulas, the trained Linear Regression pipeline, and empirical dataset statistics (no additional ML classifiers):

### 1. Feature 1 — Estimated Predictive Range (95% Error Interval)
- **Mathematical Formula:**
  $$\text{Interval}_{\text{USD}} = \left[\max\left(0,\, \hat{y} - 1.96 \cdot s_e\right),\; \hat{y} + 1.96 \cdot s_e\right]$$
- **Hold-out Test Residual Std Dev ($s_e$):** **$3,802.71** (₹3,65,060 at ₹96.0/$)
- **Presentation:** Displayed as `"Likely range: Rs X - Rs Y"` on the prediction result card, labelled `"approximate range"` with an interactive tooltip explaining that it reflects the model's typical regression error on unseen data. Floored at ₹0 to prevent impossible negative insurance claims.

### 2. Feature 2 — Factor Contribution Breakdown
- **Mathematical Formula (relative to average training profile):**
  $$\text{Contribution}_j = \beta_j \cdot (x_j - \bar{x}_j)$$
- **Column Grouping:** Transformed columns are mapped directly back to the 6 original inputs:
  - `age`: `age` + `age_group_*`
  - `sex`: `sex_male`
  - `bmi`: `bmi` + `obese` + `bmi_category_*` + $50\%$ of `smoker_x_bmi`
  - `children`: `children`
  - `smoker`: `smoker_yes` + $50\%$ of `smoker_x_bmi`
  - `region`: `region_*`
- **Mathematical Invariant:**
  $$\text{Average Prediction} + \sum_{j=1}^{6} \text{Contribution}_j = \text{Person's Prediction}$$
  Automatically verified in code and tested via pytest ($\Delta < \$0.05$).
- **Visualization:** Horizontal divergent bar chart with positive contributions in rose (raises cost) and negative in emerald (lowers cost), labeled in plain English and converted to INR with Lakh/Crore short forms.

### 3. Feature 3 — Counterfactual What-If Scenarios
- **API Endpoint:** `POST /api/whatif`
- Re-runs the saved pipeline changing exactly ONE modifiable factor:
  - **a) Smoking Cessation:** `smoker` $\rightarrow$ `"no"` (only if currently a smoker)
  - **b) Exit Clinical Obesity:** `bmi` $\rightarrow$ `TARGET_BMI_UNDER_30` ($29.9$, only if BMI $\ge 30$)
  - **c) Reach Normal Weight:** `bmi` $\rightarrow$ `TARGET_BMI_NORMAL` ($24.9$, only if BMI $> 24.9$)
- **Guaranteed Positive Savings:** A scenario is omitted if savings $\le 0$.
- **Card Note:** *"Model-based estimate of an association in the dataset, not a guarantee."*

### 4. Feature 4 — Physiological BMI Calculator & Indian Guidelines
- **Formula:** $\text{BMI} = \text{round}\left(\frac{\text{weight\_kg}}{(\text{height\_cm}/100)^2},\, 1\right)$
- **Validation:** Strict physiological ranges (Height: 100–250 cm, Weight: 20–300 kg).
- **Guidelines Comparison:**
  - **WHO / US Dataset:** Normal ($18.5 - 24.9$), Overweight ($25.0 - 29.9$), Obese ($\ge 30.0$).
  - **Indian Consensus (ICMR & Ministry of Health):** Overweight ($\ge 23.0\text{ kg/m}^2$) and Obese ($\ge 25.0\text{ kg/m}^2$) due to South Asian population visceral fat profiles.

### 5. Feature 5 — How the Customer Can Lower Their Estimate
- **Respectful & Supportive Tone:** No shaming language.
- Ordered by estimated saving descending (e.g. *"Quit smoking: could lower your estimate by about Rs X"*).
- Only includes modifiable factors (smoking status, BMI).
- Explicit notice that fixed demographic factors (age, biological sex, region, children) cannot and should not be changed and are not judged.
- If profile has no modifiable drivers: *"Your profile has no major modifiable cost drivers in this model."*
- Mandatory disclaimer: *"General information only, not medical advice. Consult a doctor before making health changes."*

### Shared Helper — Rule-Based Risk Stratification (`risk_level`)
- **Cutoffs (33rd and 66th empirical percentiles of training charges):**
  - **Low Risk:** $< \$6,389.38$ ($<\text{₹}6,13,380$)
  - **Moderate Risk:** $\$6,389.38 - \$13,012.21$ ($\text{₹}6,13,380 - \text{₹}12,49,172$)
  - **High Risk:** $> \$13,012.21$ ($>\text{₹}12,49,172$)
- Rule-based grouping helper used in `/api/predict` and `/api/predict-batch` — **NOT an ML classifier**.

### 6. Feature 6 — Bulk CSV Upload & Batch Inference
- **API Endpoints:**
  - `POST /api/predict-batch` (Multipart form-data)
  - `GET /api/sample-bulk-csv` (Download sample CSV template)
- **Limits & Privacy:**
  - Max **2 MB** file size and max **5,000 rows**.
  - **Processed strictly in-memory** using Python `io.StringIO` and `csv.DictReader`; uploaded files are **never saved to disk or persistent storage**.
- **Accepted Columns (Case-insensitive, whitespace trimmed):**
  - `name` (optional beneficiary identifier)
  - `age` (18–100)
  - `sex` (`male` / `female` / `m` / `f`)
  - `bmi` (10.0–60.0) — *Fallback: if `bmi` is omitted but `height_cm` and `weight_kg` exist, BMI is computed automatically via the standard formula!*
  - `children` (0–10)
  - `smoker` (`yes` / `no` / `y` / `n` / `true` / `false`)
  - `region` (`southwest`, `southeast`, `northwest`, `northeast`)
- **Row-Level Validation Without Crashing:**
  - Evaluates each row independently against physiological and categorical constraints.
  - Malformed rows or out-of-bound values are collected into an `errors` table (`row`, `column`, `reason`).
  - Valid rows continue processing without failing the batch.
- **Batch Output Per Row:**
  - Beneficiary details, `estimated_cost_inr`, 95% interval (`low`, `high`), `risk_level` (rule-based low/medium/high), `top_cost_driver` (largest positive linear contribution), and `short_suggestion`.
- **Aggregate Summary Metrics:**
  - Rows processed, rows skipped, average estimate (₹ and $), total estimate (₹ and $), and count by risk tier.
- **Spreadsheet Formula Injection Guard (CSV Export):**
  - When exporting results to CSV on the frontend, any text cell starting with `=`, `+`, `-`, or `@` is prefixed with a single quote (`'`) to neutralize Dynamic Data Exchange (DDE) and formula execution in Microsoft Excel or Google Sheets.
- **Official Sample Template:**
  - Available at `data/sample_bulk.csv` or via `GET /api/sample-bulk-csv`. Includes 8 diverse profiles (6 valid scenarios including height/weight fallback and casing variations, 1 out-of-range age row, and 1 blank required field row to demonstrate resilient error reporting).

---

## 📂 Repository Structure

```text
Medical-Insurance-Cost-Prediction/
├── backend/
│   ├── config.py                  # Configurable conversion settings (USD_TO_INR_RATE, INDIA_COST_FACTOR)
│   └── main.py                    # FastAPI server serving predictions and analytics
├── data/
│   └── insurance.csv              # Original US insurance dataset (1,338 records, untouched)
├── frontend/                      # Modern React + Vite application
│   ├── src/
│   │   ├── api/client.js          # Axios API client
│   │   ├── context/
│   │   │   └── CurrencyContext.jsx# Global currency provider (INR default, USD toggle)
│   │   ├── utils/
│   │   │   └── currency.js        # Indian number formatting (en-IN, Lakh/Crore)
│   │   ├── components/
│   │   │   ├── Layout.jsx         # Navigation sidebar, currency toggle, header
│   │   │   ├── Card.jsx           # Card container
│   │   │   └── MetricCard.jsx     # Reusable KPI card
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Overview & project summary
│   │   │   ├── Predict.jsx        # Estimator form, calculation cards, disclaimers
│   │   │   ├── EDA.jsx            # Interactive charts with converted INR axes
│   │   │   ├── Performance.jsx    # Baseline vs Linear Regression benchmark
│   │   │   └── Insights.jsx       # Ranked coefficients & plain-English cards
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── models/
│   ├── best_model.joblib          # Trained Linear Regression pipeline
│   ├── metrics.json               # Evaluation metrics, coefficients, residuals (USD)
│   ├── eval_cache.json            # Test set predictions for diagnostics
│   └── archive/                   # Archived older models
├── src/
│   ├── preprocess.py              # Cleaning, feature engineering, and pipeline definition
│   ├── train.py                   # Linear Regression training, baseline comparison, metrics export
│   └── evaluate.py                # Diagnostic plotting script (predicted vs actual, residuals)
├── tests/
│   ├── test_model.py              # Automated pytest suite (positive charges, smoker monotonicity)
│   └── test_samples.py            # Sample inference validation script (3 profiles)
├── requirements.txt               # Python package dependencies (xgboost/shap removed)
├── README.md                      # Complete project documentation
└── VIVA_NOTES.md                  # Comprehensive viva & oral examination study guide
```

---

## 🚀 Installation & Run Commands

### 1. Prerequisites
- Python 3.10+ (Tested on Python 3.13)
- Node.js 18+ and npm

### 2. Environment Setup
```bash
# Clone the repository
git clone https://github.com/AjinkyaSatam/Medical-Insurance-Cost-Prediction.git
cd Medical-Insurance-Cost-Prediction

# Install Python dependencies
pip install -r requirements.txt

# Install Frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Train Model & Run Tests
```bash
# Train Linear Regression pipeline and export metrics
python src/train.py

# Generate evaluation diagnostic figures
python src/evaluate.py

# Run pytest unit tests
pytest
```

### 4. Start the Application
Run the backend and frontend in separate terminals:

**Terminal 1 — FastAPI Backend:**
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
API Documentation will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

**Terminal 2 — React Frontend:**
```bash
cd frontend
npm run dev
```
Dashboard will be available at: [http://localhost:5174](http://localhost:5174)

---

## ⚠️ Limitations & Future Scope

### Limitations
1. **US Training Data:** The model is trained on a public dataset of 1,338 US beneficiaries. Healthcare consumption habits, provider billing practices, and baseline disease incidence differ from India.
2. **Linearity Assumption:** Linear regression models additive linear relationships. While our domain feature engineering (`smoker_x_bmi`) models the crucial synergistic interaction, complex non-linear nuances remain uncaptured.
3. **Adjustment Factor is an Assumption:** The `INDIA_COST_FACTOR` is a high-level macroeconomic multiplier rather than an empirical clinical micro-costing study.
4. **Geographic Specificity:** The `region` field reflects US geographic quadrants (northeast, northwest, southeast, southwest). Indian cities and tier-based hospital categorization are not present in the data.

### Future Scope
1. **Retraining on Indian Datasets:** Retrain the model on Indian claims data from the Insurance Regulatory and Development Authority of India (IRDAI) or public hospital datasets.
2. **Tier-City Micro-Costing:** Incorporate city classifications (Metro, Tier-1, Tier-2) to capture private hospital room-rent caps and regional treatment variances.
3. **Ayushman Bharat Integration:** Align cost projections with Ayushman Bharat PM-JAY package rates.

---

## 🎓 College Viva Reference

For comprehensive explanations of the mathematical formulation, coefficient interpretations, assumptions of linear regression, evaluation metrics, and sample questions for your oral examination, please refer to:

👉 **[`VIVA_NOTES.md`](./VIVA_NOTES.md)**
