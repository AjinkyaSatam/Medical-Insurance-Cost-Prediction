# ACADEMIC PROJECT REPORT

## MEDICAL INSURANCE COST PREDICTION USING MACHINE LEARNING

**Academic Degree:** Bachelor of Technology / Bachelor of Engineering in Computer Science  
**Subject:** Machine Learning Mini Project  
**Author:** Final Year Mini Project Team  
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
7. [Conclusion](#7-conclusion)
8. [Future Scope](#8-future-scope)
9. [Viva Voce Preparation & Key Technical Questions](#9-viva-voce-preparation--key-technical-questions)

---

### 1. ABSTRACT
Health insurance pricing traditionally relies on actuarial tables, which evaluate demographic cohorts using aggregate statistical techniques. With the advent of machine learning, health insurers can generate personalized, data-driven cost predictions that capture complex, non-linear interactions between lifestyle behaviors and biometric attributes. 

This project develops an end-to-end machine learning system that accurately forecasts annual medical expenditures. Using a public dataset of 1,338 policyholders across the United States, we perform exploratory data analysis, handle target distribution skewness, engineer clinical interaction terms (`smoker_x_bmi`, obesity classification, and age cohorts), and construct an automated Scikit-Learn `ColumnTransformer` and `Pipeline` to eliminate data leakage. 

We benchmark four primary regression algorithms—Ordinary Least Squares Linear Regression, Random Forest Regressor, Gradient Boosting Regressor, and Extreme Gradient Boosting (XGBoost)—across raw and log-transformed target specifications. Hyperparameter tuning via 5-fold cross-validated `RandomizedSearchCV` produced a final **Gradient Boosting Regressor** achieving a **Test $R^2$ score of 0.9188**, **Mean Absolute Error (MAE) of $2,123.89**, and **Root Mean Squared Error (RMSE) of $3,421.90**. Feature importance analysis demonstrates that the interaction term `smoker_x_bmi` accounts for **80.03%** of model predictive weight, followed by chronological age (**11.09%**). Finally, the trained model is serialized via `joblib`, validated using an automated `pytest` suite, and integrated into an interactive four-page `Streamlit` dashboard for real-time risk assessment and demographic benchmarking.

---

### 2. PROBLEM STATEMENT
Accurate medical insurance pricing is critical for both insurance underwriters and policyholders:
- **For Insurers:** Underestimating individual claim liability risks leads to financial insolvency, while overcharging premiums reduces customer acquisition and market competitiveness.
- **For Policyholders:** The lack of transparent pricing methodologies prevents patients from understanding how personal lifestyle modifications (such as smoking cessation or weight loss) impact healthcare costs.
- **The Analytical Challenge:** Medical expenditures are characterized by extreme positive skewness, heavy tails, and sharp non-linear step functions (e.g., the combination of high BMI and smoking produces exponential claims increases rather than additive ones). Standard linear models struggle to fit these interactions without explicit feature engineering.

---

### 3. OBJECTIVES
The primary technical and academic objectives of this project are:
1. **Data Cleaning & Anomaly Auditing:** To load, profile, and clean the 1,338-row dataset, handling duplicate records and evaluating outliers in medical charges using the Interquartile Range (IQR) rule while retaining clinical risk signals.
2. **Exploratory Data Analysis (EDA):** To visualize univariate distributions, bivariate relationships, and multivariate correlations using Matplotlib, Seaborn, and Plotly, extracting plain-English empirical insights.
3. **Domain-Driven Feature Engineering:** To construct relevant features including obesity flags (`bmi >= 30`), clinical BMI categories, age brackets, and the critical `smoker_x_bmi` interaction term.
4. **Leak-Free Preprocessing Pipeline:** To wrap transformations inside a unified Scikit-Learn `Pipeline` fitted exclusively on training splits to prevent data leakage.
5. **Model Benchmarking & Comparison:** To train and evaluate Linear Regression (baseline), Random Forest, Gradient Boosting, and XGBoost on both raw and $\log(1+y)$ target spaces.
6. **Cross-Validated Hyperparameter Optimization:** To tune shallow tree ensembles using `RandomizedSearchCV` on a 5-fold cross-validation scheme to prevent overfitting.
7. **Model Interpretability & Feature Attribution:** To analyze feature importance scores and explain the actuarial significance of the top predictors.
8. **Deployment & Quality Assurance:** To serialize the trained pipeline to `best_model.joblib`, validate core domain invariants via automated `pytest` unit tests, and build an interactive 4-page Streamlit dashboard.

---

### 4. DATASET DESCRIPTION & PREPROCESSING

#### 4.1 Dataset Profiling
The dataset comprises **1,338 individual beneficiaries** with 6 predictor attributes and 1 continuous target (`charges`):
- `age`: Age of primary policyholder (18 to 64 years; Mean: 39.2 years).
- `sex`: Biological contractor gender (`female`: 662, `male`: 676).
- `bmi`: Body Mass Index in $\text{kg/m}^2$ (Min: 15.96, Max: 53.13; Mean: 30.66).
- `children`: Dependent child count (0 to 5; Median: 1 child).
- `smoker`: Current tobacco consumption (`no`: 1,064 [79.5%], `yes`: 274 [20.5%]).
- `region`: Beneficiary residential area in the United States (`northeast`, `northwest`, `southeast`, `southwest`).
- `charges`: Annual individual health medical costs in USD (Target). Min: $1,121.87, Max: $63,770.43; Mean: $13,270.42; Median: $9,382.03.

#### 4.2 Data Cleansing & Missing Values
- **Missing Values:** The dataset contains zero missing values (`0 nulls`), eliminating the need for missing data imputation.
- **Duplicates:** One exact duplicate row (record index 581 matching index 195: a 19-year-old male, non-smoker, BMI 30.59, 0 children, charges $1,639.56) was identified and removed, producing a clean sample of **1,337 rows**.

#### 4.3 Target Outlier Investigation
Evaluating the target variable using the standard Tukey Interquartile Range method ($Q1 = \$4,740.29$, $Q3 = \$16,639.91$, $\text{IQR} = \$11,899.63$):
$$\text{Upper Fence} = Q3 + (1.5 \times \text{IQR}) = \$34,524.78$$
There are **139 records** whose charges exceed this upper fence (10.4% of total records).  
Crucially, **97.8% of these high-cost records belong to active smokers**. These observations represent authentic, high-severity clinical scenarios (major surgeries, chronic pulmonary disease, cancer treatments). Dropping them would cause the model to underestimate risk for the highest-cost policyholders. Consequently, all 139 outliers were retained.

---

### 5. METHODOLOGY & ARCHITECTURE

#### 5.1 Stratified Train/Test Splitting
Because active smokers constitute only ~20.5% of the total dataset, a simple random split could introduce sampling imbalance. An **80/20 train/test split** was performed using stratified sampling on `smoker` (`random_state=42`), producing:
- **Training Set:** 1,069 records (20.5% smokers)
- **Testing Set:** 268 records (20.5% smokers)

#### 5.2 Feature Engineering
Four features were created:
1. `obese`: Binary flag set to 1 if $\text{BMI} \ge 30.0$ (World Health Organization clinical threshold for Class I obesity), else 0.
2. `bmi_category`: Discrete categorization: `Underweight` ($<18.5$), `Normal` ($18.5 - 24.9$), `Overweight` ($25.0 - 29.9$), and `Obese` ($\ge 30.0$).
3. `age_group`: Demographic groupings: `18-29`, `30-44`, `45-54`, `55+`.
4. `smoker_x_bmi`: Interaction term multiplying the binary smoking indicator ($1 \text{ or } 0$) by continuous BMI ($\text{kg/m}^2$). This allows linear and tree models to capture the combined impact of smoking and obesity on health risk.

#### 5.3 Unified Pipeline Architecture
To eliminate data leakage, preprocessing was configured via Scikit-Learn's `ColumnTransformer`:
- **Numeric Features (`age`, `bmi`, `children`, `obese`, `smoker_x_bmi`):** Normalized using `StandardScaler` fitted strictly on `X_train`.
- **Categorical Features (`sex`, `smoker`, `region`, `bmi_category`, `age_group`):** One-hot encoded using `OneHotEncoder(drop='if_binary', handle_unknown='ignore', sparse_output=False)`.

The complete workflow was packaged as an atomic pipeline:
$$\text{Raw Features} \longrightarrow \text{FeatureEngineer} \longrightarrow \text{ColumnTransformer} \longrightarrow \text{Tuned Regressor}$$

---

### 6. RESULTS AND DISCUSSION

#### 6.1 Multi-Model Benchmarking
Candidate models were evaluated across raw charges and $\log(1+\text{charges})$ targets. 5-fold cross-validation scores on the training set and hold-out test metrics were tracked:

| Model Architecture | Target Representation | 5-Fold CV $R^2$ | Train $R^2$ | Test $R^2$ | Test MAE ($) | Test RMSE ($) | Overfitting Gap |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Tuned Gradient Boosting** | **Raw** | **0.8433** | **0.8687** | **0.9188** | **$2,123.89** | **$3,421.90** | **-0.0501** |
| Gradient Boosting (Default) | Raw | 0.8351 | 0.8954 | 0.9156 | $2,128.55 | $3,487.49 | -0.0202 |
| Random Forest (Log Target) | $\log(1+y)$ | 0.8327 | 0.9576 | 0.9115 | $1,785.17 | $3,571.27 | +0.0460 |
| Gradient Boosting (Log Target) | $\log(1+y)$ | 0.8302 | 0.8741 | 0.9158 | $1,729.31 | $3,484.92 | -0.0416 |
| Linear Regression (Baseline) | Raw | 0.8259 | 0.8366 | 0.8983 | $2,474.76 | $3,829.44 | -0.0617 |
| Random Forest (Default) | Raw | 0.8197 | 0.9735 | 0.8908 | $2,433.40 | $3,967.05 | +0.0827 |
| XGBoost (Log Target) | $\log(1+y)$ | 0.7933 | 0.9888 | 0.8485 | $2,418.02 | $4,672.82 | +0.1402 |
| XGBoost (Default) | Raw | 0.7859 | 0.9938 | 0.8509 | $2,756.41 | $4,636.55 | +0.1429 |
| Linear Regression (Log Target) | $\log(1+y)$ | 0.4729 | 0.5008 | 0.5759 | $3,711.51 | $7,819.43 | -0.0751 |

#### 6.2 Key Observations
1. **Raw Target vs. Log Target Performance:**  
   While training on $\log(1+y)$ reduced test MAE for tree ensembles (down to $\$1,729.31$ for log Gradient Boosting), it penalized the higher dollar charges, resulting in slightly lower overall cross-validated $R^2$ (0.8302 vs 0.8351). Linear Regression performed poorly under log transformation ($R^2 = 0.5759$) due to severe underestimation when exponentiating extreme predictions.
2. **Overfitting Analysis in Default Trees:**  
   Default Random Forest ($97.35\%$ train $R^2$ vs $89.08\%$ test $R^2$) and default XGBoost ($99.38\%$ train $R^2$ vs $85.09\%$ test $R^2$) exhibited substantial variance and overfit the 1,069 training examples.
3. **Hyperparameter Tuning Impact:**  
   Restricting tree depth via `RandomizedSearchCV` (`max_depth=2`, `learning_rate=0.08`, `subsample=0.9`, `n_estimators=100`) reduced model variance. The resulting **Tuned Gradient Boosting Regressor** achieved a **5-fold CV $R^2$ of 0.8433** and a hold-out **Test $R^2$ of 0.9188** with a train-to-test gap of $-0.0501$, confirming strong generalization.

#### 6.3 Feature Importance Attribution
Evaluating feature importance within the final Gradient Boosting model:
1. `smoker_x_bmi` (**80.03%**): Dominates overall tree splits, capturing the compounding effect of smoking and obesity.
2. `age` (**11.09%**): Represents steady, linear biological risk escalation over time.
3. `smoker_yes` (**5.16%**): Baseline cost floor associated with tobacco consumption.
4. `bmi` (**2.33%**): Direct physical weight contribution independent of smoking.
5. `children` (**0.97%**): Incremental cost adjustments associated with family size.
6. `region` and `sex` combined account for **$<0.4\%$** of model weight, indicating demographic equality in healthcare claims once lifestyle risk factors are controlled for.

---

### 7. CONCLUSION
This project successfully implemented an end-to-end Machine Learning pipeline for Medical Insurance Cost Prediction. The key takeaways are:
1. Outliers in healthcare claims data represent genuine clinical risk signals and must not be blindly dropped.
2. Domain-driven interaction features (`smoker_x_bmi`) significantly enhance predictive accuracy, enabling even linear baselines to achieve $R^2 \approx 0.90$.
3. Regularizing tree depth (`max_depth=2`) in gradient boosted ensembles prevents overfitting on small datasets ($N=1,338$), yielding a final model with **$R^2 = 0.9188$** and **$\text{MAE} = \$2,123.89$**.
4. The deployment pipeline was packaged in Scikit-Learn, verified with automated `pytest` unit tests, and integrated into a four-page interactive `Streamlit` dashboard.

---

### 8. FUTURE SCOPE
1. **Clinical & Prescription History Integration:** Incorporating electronic health records (EHR) and ICD-10 diagnostic codes to improve prediction granularity.
2. **Local Model Explainability via SHAP:** Integrating real-time TreeSHAP explanations into the web dashboard to show policyholders the exact dollar contribution of each lifestyle factor.
3. **Microservice API Architecture:** Containerizing the inference pipeline using Docker and FastAPI for scalable cloud deployment.
4. **Longitudinal Risk Modeling:** Transitioning from cross-sectional annual snapshots to recurrent or survival models predicting multi-year chronic disease onset.

---

### 9. VIVA VOCE PREPARATION & KEY TECHNICAL QUESTIONS

#### Question 1: Why did you choose NOT to remove the 139 outliers identified in the `charges` column?
**Answer:** In healthcare insurance, high charges are not measurement or data entry errors; they represent genuine high-cost medical events (major hospitalizations, complex surgeries, chronic illness). In our dataset, **97.8%** of these outlier charges belong to active smokers with elevated BMIs. Dropping these records would artificially truncate the target distribution, leading the model to severely underestimate costs for high-risk individuals.

#### Question 2: Why did your tuned Gradient Boosting model use shallow trees (`max_depth=2`) instead of deeper trees?
**Answer:** With only 1,069 training examples, deep decision trees quickly memorize idiosyncratic noise and overfit (as seen in our default XGBoost, which reached 99.38% train $R^2$ but fell to 85.09% test $R^2$). Constraining `max_depth=2` creates shallow stumps that capture primary interaction effects without memorizing sample-specific noise, improving 5-fold CV $R^2$ to 0.8433 and test $R^2$ to 0.9188.

#### Question 3: What is data leakage and how did your pipeline architecture prevent it?
**Answer:** Data leakage occurs when information from outside the training dataset (such as test set statistics) influences the model during training, leading to overly optimistic evaluation metrics. We prevented leakage by encapsulating all transformations (StandardScaler, OneHotEncoder, and custom feature engineering) inside a Scikit-Learn `Pipeline` and `ColumnTransformer`. The pipeline was fitted strictly on `X_train` during training and cross-validation, and subsequently used to transform `X_test` without re-fitting.

#### Question 4: What is the significance of engineering the `smoker_x_bmi` interaction term?
**Answer:** Exploratory data analysis revealed that BMI has a non-linear effect on charges: for non-smokers, higher BMI produces only mild cost increases, whereas for smokers, crossing the clinical obesity threshold ($\text{BMI} \ge 30$) triggers an abrupt jump from ~$15,000 to over $40,000. Engineering `smoker_x_bmi` makes this interaction explicit, accounting for **80.03%** of our final model's predictive importance.

#### Question 5: Why did you split the dataset using stratification on the `smoker` column?
**Answer:** Active smokers comprise only ~20.5% of the 1,338 records. A standard random split risks uneven representation across the train and test sets. Stratifying on `smoker` ensures that both `X_train` and `X_test` maintain the exact 20.5% smoker proportion, avoiding distribution shift and stabilizing cross-validation metrics.
