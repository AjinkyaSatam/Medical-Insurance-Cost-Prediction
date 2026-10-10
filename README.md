# 🩺 Medical Insurance Cost Prediction using Machine Learning

[![Python Version](https://img.shields.io/badge/Python-3.13-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Streamlit](https://img.shields.io/badge/App-Streamlit-FF4B4B.svg)](https://streamlit.io/)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E.svg)](https://scikit-learn.org/)
[![Tests](https://img.shields.io/badge/Tests-Pytest%20Passing-brightgreen.svg)](https://pytest.org/)

An end-to-end Machine Learning college mini project that predicts individual annual medical healthcare expenses from demographic and lifestyle variables using an audited data pipeline, feature engineering, and hyperparameter-tuned gradient boosting.

---

## 📌 Table of Contents
- [Project Overview](#project-overview)
- [Repository Structure](#repository-structure)
- [Dataset Description](#dataset-description)
- [Methodology & Pipeline](#methodology--pipeline)
- [Benchmark Results](#benchmark-results)
- [Installation & Quick Start](#installation--quick-start)
- [Streamlit Dashboard](#streamlit-dashboard)
- [Automated Testing](#automated-testing)
- [Project Visuals & Diagnostics](#project-visuals--diagnostics)
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
6. **Interactive Dashboard:** 4-page Streamlit application with cost prediction, dynamic demographic cohort comparison, interactive EDA, and actuarial insights.

---

## 📂 Repository Structure

```text
insurance-cost-prediction/
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
├── app/
│   └── dashboard.py               # 4-page Streamlit dashboard
├── tests/
│   └── test_model.py              # Automated pytest suite (invariants, domain sanity)
├── reports/
│   └── figures/                   # Generated evaluation plots
├── requirements.txt               # Pinned package versions
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

- **Stratified Train/Test Split:** 80% training (1,069 rows), 20% testing (268 rows), stratified by `smoker` to preserve the ~20.5% active smoker distribution.
- **Cross-Validation:** 5-fold cross-validation with fixed seed (`random_state=42`).

---

## 🏆 Benchmark Results

The candidate architectures were benchmarked across raw and log-transformed targets:

| Architecture | Target Scale | 5-Fold CV $R^2$ | Train $R^2$ | Test $R^2$ | Test MAE ($) | Test RMSE ($) | Overfitting Gap |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Tuned Gradient Boosting** | **Raw** | **0.8433** | **0.8687** | **0.9188** | **$2,123.89** | **$3,421.90** | **-0.0501** |
| Gradient Boosting | Raw | 0.8351 | 0.8954 | 0.9156 | $2,128.55 | $3,487.49 | -0.0202 |
| Random Forest (Log Target) | $\log(1+y)$ | 0.8327 | 0.9576 | 0.9115 | $1,785.17 | $3,571.27 | 0.0460 |
| Gradient Boosting (Log Target) | $\log(1+y)$ | 0.8302 | 0.8741 | 0.9158 | $1,729.31 | $3,484.92 | -0.0416 |
| Linear Regression (Baseline) | Raw | 0.8259 | 0.8366 | 0.8983 | $2,474.76 | $3,829.44 | -0.0617 |
| Random Forest | Raw | 0.8197 | 0.9735 | 0.8908 | $2,433.40 | $3,967.05 | 0.0827 |
| XGBoost (Log Target) | $\log(1+y)$ | 0.7933 | 0.9888 | 0.8485 | $2,418.02 | $4,672.82 | 0.1402 |
| XGBoost | Raw | 0.7859 | 0.9938 | 0.8509 | $2,756.41 | $4,636.55 | 0.1429 |
| Linear Regression (Log Target) | $\log(1+y)$ | 0.4729 | 0.5008 | 0.5759 | $3,711.51 | $7,819.43 | -0.0751 |

### Key Takeaways:
- **Best Architecture:** **Tuned Gradient Boosting Regressor** (`CV R2 = 0.8433`, `Test R2 = 0.9188`).
- **Overfitting Prevention:** By restricting tree depth to `max_depth=2` and applying `subsample=0.9`, the train/test gap is kept small, outperforming deep tree models that overfit on the 1,069 training points.
- **Top Feature Importances:**
  1. `smoker_x_bmi` (**80.03%**): The synergistic interaction between smoking and BMI is the dominant predictor.
  2. `age` (**11.09%**): Natural baseline health expenditure escalation over time.
  3. `smoker_yes` (**5.16%**): Direct baseline smoking hazard.
  4. `bmi` (**2.33%**): Direct weight contribution.

---

## 🚀 Installation & Quick Start

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.13)
- Git

### 2. Clone Repository & Setup Environment
```bash
git clone https://github.com/your-username/insurance-cost-prediction.git
cd insurance-cost-prediction

# Create and activate virtual environment (optional but recommended)
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate
```

### 3. Install Pinned Dependencies
```bash
pip install -r requirements.txt
```

### 4. Train Models & Save Pipeline
```bash
python src/train.py
```

### 5. Generate Diagnostics & Evaluation Figures
```bash
python src/evaluate.py
```

### 6. Run the Pytest Suite
```bash
pytest tests/test_model.py -v
```

### 7. Launch Interactive Dashboard
```bash
streamlit run app/dashboard.py
```

---

## 🖥️ Streamlit Dashboard
The web dashboard provides 4 pages:
1. **🔮 Predict Cost:** Form input for demographic parameters, real-time BMI calculator, predicted annual charge, risk category badge (Low, Moderate, High), and peer cohort benchmark comparison.
2. **📊 Exploratory Data Analysis:** Plotly charts with dynamic multi-variable filters (region, smoking status, age range), raw vs. log-transformed distributions, and plain-English takeaways.
3. **📈 Model Performance:** Complete model comparison leaderboard, cross-validation metrics, predicted vs. actual scatter plot, and residual diagnostic analysis.
4. **💡 Actuarial Insights:** Top feature importance bar chart and plain-English takeaways on lifestyle risk and pricing implications.

---

## 🧪 Automated Testing
The project includes automated validation via pytest (`tests/test_model.py`):
- `test_model_artifact_and_steps`: Asserts pipeline serialization and internal transformers.
- `test_single_prediction_positive`: Asserts individual predictions yield positive, realistic values.
- `test_smoker_cost_higher_than_non_smoker`: Validates domain invariant that a smoker's premium exceeds an otherwise identical non-smoker's premium by over $8,000.
- `test_bmi_obesity_monotonicity`: Asserts that an obese individual has higher costs than a normal-weight peer holding all else equal.
- `test_batch_prediction`: Validates vectorization on batch inputs.

---

## 📈 Project Visuals & Diagnostics
All diagnostic figures are generated by `src/evaluate.py` and saved under `reports/figures/`:
- `model_comparison.png`: Cross-validation vs test $R^2$ scores across all tested models.
- `predicted_vs_actual.png`: Scatter plot of actual vs model predicted charges showing adherence along $y = x$.
- `residuals_plot.png`: Homoscedasticity scatter plot and near-normal residual error distribution.
- `feature_importance.png`: Feature importance bar chart highlighting `smoker_x_bmi` and `age`.

---

## 🔮 Limitations & Future Scope

### Limitations
1. **Limited Geographic & Clinical Granularity:** The dataset lacks specific medical diagnostic codes (ICD-10), prescription history, family history, and detailed regional zip codes.
2. **Static Pricing Horizon:** The dataset reflects cross-sectional annual snapshot expenses rather than longitudinal tracking across decades.
3. **Small Sample Size:** 1,338 records require aggressive regularization to prevent tree-based models from memorizing specific sample outliers.

### Future Scope
1. **Deep Learning & Tabular Neural Nets:** Experimenting with TabNet or FT-Transformer architectures on expanded hospital datasets.
2. **SHAP & LIME Explanations:** Integrating SHAP values into the Streamlit dashboard for real-time local prediction explanations.
3. **REST API Deployment:** Packaging the scikit-learn pipeline into a FastAPI microservice and containerizing with Docker for Kubernetes deployment.
4. **Multi-Horizon Actuarial Forecasting:** Modeling 5-year and 10-year cumulative health expense risk.
