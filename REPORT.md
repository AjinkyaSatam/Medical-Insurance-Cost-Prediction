# ACADEMIC PROJECT REPORT

## MEDICAL INSURANCE COST PREDICTION USING LINEAR REGRESSION WITH INDIA INR CONVERSION LAYER

**Academic Degree:** Bachelor of Technology / Bachelor of Engineering in Computer Science  
**Subject:** Machine Learning Mini Project  
**Author:** College ML Project Team  
**Dataset:** US Medical Insurance Beneficiary Dataset (`insurance.csv`)  
**Target Variable:** Annual Medical Charges (`charges` in USD)  

---

### TABLE OF CONTENTS
1. [Abstract](#1-abstract)
2. [Problem Statement](#2-problem-statement)
3. [Objectives](#3-objectives)
4. [Dataset Description & Preprocessing](#4-dataset-description--preprocessing)
5. [Methodology & Architecture](#5-methodology--architecture)
6. [Results and Discussion](#6-results-and-discussion)
7. [India INR Conversion Layer](#7-india-inr-conversion-layer)
8. [Conclusion & Future Scope](#8-conclusion--future-scope)
9. [Viva Voce Preparation & Technical Questions](#9-viva-voce-preparation--technical-questions)

---

### 1. ABSTRACT
Health insurance pricing traditionally relies on actuarial tables, which evaluate demographic cohorts using aggregate statistical techniques. This project implements an end-to-end Machine Learning system based strictly on **Multiple Linear Regression (Ordinary Least Squares)** to predict individual annual healthcare charges.

Using a public dataset of 1,338 policyholders across the United States, we perform exploratory data analysis, audit medical charge outliers, engineer clinical interaction terms (`smoker_x_bmi`, obesity classification, and age cohorts), and construct an automated Scikit-Learn `ColumnTransformer` and `Pipeline` to eliminate data leakage.

The pipeline is trained on raw medical charges using an 80/20 train-test split stratified on smoker status. Compared to a trivial mean baseline ($R^2 \approx 0.0\%$, MAE $\approx \$9,081$), Linear Regression achieves a **Train $R^2$ of 0.8366**, a **Test $R^2$ of 0.8983** (89.83% variance explained), **5-Fold Cross-Validation $R^2$ of 0.8259 $\pm$ 0.0392**, a **Test MAE of $2,474.76** (a 72.7% error reduction), and a **Test RMSE of $3,829.44**. Furthermore, a configurable India INR conversion layer translates predictions into Indian Rupees without corrupting the underlying empirical weights. The system is served via a FastAPI backend and an interactive React dashboard.

---

### 2. PROBLEM STATEMENT
Accurate medical insurance pricing is critical for both insurance underwriters and policyholders:
- **For Insurers:** Underestimating individual claim liability risks leads to financial insolvency, while overcharging premiums reduces customer acquisition and market competitiveness.
- **For Policyholders:** The lack of transparent pricing methodologies prevents patients from understanding how personal lifestyle modifications (such as smoking cessation or weight loss) impact healthcare costs.
- **Syllabus Focus:** This project focuses on **Linear Regression**, providing full mathematical interpretability through regression coefficients ($\beta$) rather than opaque black-box ensembles.

---

### 3. OBJECTIVES
1. **Linear Regression Exclusivity:** To implement Ordinary Least Squares Linear Regression as the sole learning algorithm, in full alignment with the college syllabus.
2. **Domain-Driven Feature Engineering:** To construct relevant clinical features including obesity flags (`bmi >= 30`), BMI categories, age brackets, and the critical `smoker_x_bmi` interaction term.
3. **Leak-Free Preprocessing Pipeline:** To wrap transformations inside a unified Scikit-Learn `Pipeline` fitted exclusively on training splits to prevent data leakage.
4. **Baseline Comparison:** To evaluate Linear Regression against a trivial mean predictor to demonstrate genuine predictive lift.
5. **India INR Conversion Layer:** To implement a configurable translation layer mapping US dollar predictions into Indian Rupees (INR) using exchange rates and cost factors.
6. **Full-Stack Deployment:** To build a FastAPI REST API and a modern React dashboard.

---

### 4. DATASET DESCRIPTION & PREPROCESSING
The dataset comprises **1,338 individual beneficiaries** (`data/insurance.csv`):
- `age`: Age of policyholder (18 to 64 years; Mean: 39.2 years)
- `sex`: Biological sex (`female`, `male`)
- `bmi`: Body Mass Index (15.96 to 53.13 kg/m²; Mean: 30.66 kg/m²)
- `children`: Dependent children covered (0 to 5)
- `smoker`: Tobacco smoking status (`yes`, `no`)
- `region`: US residential quadrant (`northeast`, `northwest`, `southeast`, `southwest`)
- `charges`: Annual medical expenses ($1,121.87 to $63,770.43; Mean: $13,270.42)

**Outlier Analysis:** 139 charges exceed $34,524.78. Over 97.8% of these high-cost individuals are smokers. These points represent genuine clinical severity and risk signals, so they are retained in the dataset.

---

### 5. RESULTS AND BENCHMARKS

| Model | Train $R^2$ | Test $R^2$ | 5-Fold CV $R^2$ | Test MAE | Test RMSE |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Mean Baseline** | 0.0000 | -0.0010 | — | $9,080.77 (₹7,53,704) | $12,012.59 (₹9,97,045) |
| **Linear Regression** | **0.8366** | **0.8983** | **0.8259** | **$2,474.76 (₹2,05,405)** | **$3,829.44 (₹3,17,844)** |

Linear Regression explains **89.83% of the variance** in hold-out test charges, cutting MAE by 72.7%.

---

### 6. INDIA INR CONVERSION LAYER
Configured in `backend/config.py`:
- `USD_TO_INR_RATE = 83.0`
- `INDIA_COST_FACTOR = 1.0`

$$\text{Estimated INR} = \text{Predicted USD} \times 83.0 \times 1.0$$

The frontend defaults to INR with Indian number formatting (`Intl.NumberFormat('en-IN')`) and Lakh/Crore short forms, along with a USD toggle.

---

### 7. CONCLUSION
Multiple Linear Regression, supported by appropriate domain feature engineering (specifically the `smoker_x_bmi` interaction term), achieves high predictive accuracy ($R^2 \approx 89.8\%$) while maintaining total parametric interpretability. The India INR conversion layer makes the application practical for Indian academic evaluation without modifying the underlying empirical training data.
