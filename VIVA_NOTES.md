# 🎓 College Viva Voce Study Guide: Medical Insurance Cost Prediction
## Subject: Machine Learning / Predictive Analytics
**Model Architecture:** Multiple Linear Regression (Ordinary Least Squares)  
**Target Variable:** Medical Charges (in USD, with configurable India INR translation layer)

---

## 1. What is Linear Regression and How Does it Work?

### 1.1 The Mathematical Formulation
Linear Regression is a supervised learning algorithm used for predicting a continuous numerical target variable ($y$) based on one or more independent predictor variables ($x_1, x_2, \dots, x_n$).

The equation for **Multiple Linear Regression** is:
$$y = \beta_0 + \beta_1 x_1 + \beta_2 x_2 + \dots + \beta_n x_n + \epsilon$$

Where:
- **$y$**: The dependent target variable (in this project: annual medical insurance charges in USD).
- **$\beta_0$ (Intercept)**: The expected baseline value of $y$ when all predictor variables ($x_1 \dots x_n$) are zero. In our trained pipeline, $\beta_0 \approx \$18,438.79$.
- **$\beta_1, \beta_2, \dots, \beta_n$ (Regression Coefficients / Slopes)**: The rate of change in the target variable per one-unit increase in the respective predictor, assuming all other predictors remain constant (*ceteris paribus*).
- **$x_1, \dots, x_n$**: The input features (e.g., standardized age, BMI, smoker indicator, smoker $\times$ BMI interaction).
- **$\epsilon$**: The random error term (residuals), representing unexplained variance.

### 1.2 Ordinary Least Squares (OLS) Optimization
Linear regression solves for the optimal parameters $\beta$ by minimizing the **Sum of Squared Residuals (SSR)**:
$$\text{SSR} = \sum_{i=1}^{m} (y_i - \hat{y}_i)^2 = \sum_{i=1}^{m} \left(y_i - (\beta_0 + \sum_{j=1}^{n} \beta_j x_{ij})\right)^2$$

In matrix form:
$$\mathbf{y} = \mathbf{X}\boldsymbol{\beta} + \boldsymbol{\epsilon}$$
$$\hat{\boldsymbol{\beta}} = (\mathbf{X}^T \mathbf{X})^{-1} \mathbf{X}^T \mathbf{y}$$

This closed-form analytical solution (the **Normal Equation**) calculates the unique vector $\hat{\boldsymbol{\beta}}$ that minimizes the distance between predicted values and actual data points.

---

## 2. Evaluation Metrics: What Do $R^2$, MAE, and RMSE Mean?

When the examiner asks *"How do you evaluate your regression model?"*, explain these three metrics clearly:

### 2.1 Coefficient of Determination ($R^2$ Score)
- **Formula:**
  $$R^2 = 1 - \frac{\text{SS}_{\text{res}}}{\text{SS}_{\text{tot}}} = 1 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum (y_i - \bar{y})^2}$$
- **What it means:** $R^2$ measures the **proportion of variance in the target variable that is explained by the linear model**.
- **Scale:** Unitless, typically between 0.0 (model does no better than predicting the mean) and 1.0 (perfect prediction). Can be negative if a model performs worse than the simple sample mean.
- **Our Project Result:**
  - Trivial Baseline (Mean Predictor): $R^2 \approx -0.0010$ (0%)
  - Linear Regression: **$R^2 = 0.8983$ (89.83%)** on the hold-out test set!
  - 5-Fold Cross-Validation: **$R^2 = 0.8259 \pm 0.0392$ (82.59%)**.

### 2.2 Mean Absolute Error (MAE)
- **Formula:**
  $$\text{MAE} = \frac{1}{m} \sum_{i=1}^{m} |y_i - \hat{y}_i|$$
- **What it means:** The average absolute difference between the predicted cost and the actual cost. Every error is weighted linearly with its magnitude.
- **Scale:** Expressed in the same units as the target variable (dollars or converted rupees).
- **Our Project Result:**
  - Trivial Baseline: MAE = **$9,080.77** (₹7,53,704)
  - Linear Regression: MAE = **$2,474.76** (₹2,05,405) — a **72.7% error reduction**!

### 2.3 Root Mean Squared Error (RMSE)
- **Formula:**
  $$\text{RMSE} = \sqrt{\frac{1}{m} \sum_{i=1}^{m} (y_i - \hat{y}_i)^2}$$
- **What it means:** Measures the standard deviation of the residuals. Because differences are squared before taking the root, **RMSE penalizes large errors much more severely than MAE**.
- **Our Project Result:**
  - Trivial Baseline: RMSE = **$12,012.59** (₹9,97,045)
  - Linear Regression: RMSE = **$3,829.44** (₹3,17,844) — a **68.1% error reduction**!

---

## 3. Why is Categorical Encoding Needed for Linear Regression?

1. **Mathematical Requirement:** Linear regression models perform matrix multiplications ($\mathbf{X}\boldsymbol{\beta}$). Strings like `"female"`, `"male"`, `"yes"`, `"no"`, or `"southeast"` cannot be mathematically multiplied or inverted.
2. **One-Hot Encoding (`OneHotEncoder`):** Creates binary indicator columns ($0$ or $1$) for each categorical category.
3. **Avoiding the Dummy Variable Trap:**
   - If a binary feature like `smoker` has two categories (`yes` and `no`), creating two columns creates perfect multicollinearity ($x_{\text{yes}} + x_{\text{no}} = 1$), causing the matrix $(\mathbf{X}^T \mathbf{X})$ to become non-invertible.
   - We use `drop='if_binary'` in `OneHotEncoder`, which drops one redundant binary column, leaving a single binary indicator (`smoker_yes`).
4. **StandardScaler:**
   - Numerical features (`age`, `bmi`, `children`) have widely different scales. Standardizing them ($z = \frac{x - \mu}{\sigma}$) ensures that regression coefficients ($\beta$) can be compared fairly to assess relative feature importance.

---

## 4. Why is the `smoker_x_bmi` Interaction Term Essential?

Linear Regression is inherently **additive**:
$$y = \beta_{\text{smoker}} \cdot \text{smoker} + \beta_{\text{bmi}} \cdot \text{bmi}$$

However, in real medical data:
- A non-smoker with a high BMI of 35 incurs only moderately elevated charges.
- A smoker with a normal BMI incurs standard smoker charges.
- **A smoker with a high BMI (BMI $\ge$ 30) experiences an exponential, synergistic claims explosion** (over $40,000).

Because raw Linear Regression cannot learn multiplicative steps on its own, domain engineering creates:
$$\text{smoker\_x\_bmi} = (\text{smoker} == \text{'yes'}) \times \text{bmi}$$
This interaction term receives the single largest positive coefficient in our model (**+$19,064.75** / ₹15,82,374), boosting $R^2$ from ~0.75 to **~0.898**!

---

## 5. Why are Results India-Based INR Estimates?

### 5.1 The Practical Problem
The model is trained on the US insurance dataset (`insurance.csv`). In the US, medical costs are priced in dollars under US billing structures. Showing raw USD figures to an Indian audience makes the predictions uninterpretable.

### 5.2 The Conversion Layer Design
Rather than arbitrarily modifying the training dataset, we implement a **clean, decoupled conversion layer** in `backend/config.py`:
```python
USD_TO_INR_RATE = 83.0   # Current exchange rate
INDIA_COST_FACTOR = 1.0  # Healthcare cost adjustment factor
```

$$\text{Estimated INR} = \text{Predicted USD} \times \text{USD\_TO\_INR\_RATE} \times \text{INDIA\_COST\_FACTOR}$$

- **Preserves Model Integrity:** The underlying Scikit-Learn pipeline remains empirically valid and mathematically sound on the original US dataset.
- **Configurable:** If exchange rates fluctuate or empirical Indian healthcare cost data is cited, updating two lines in `config.py` updates the entire application (API, charts, coefficients, and tables) without retraining.

---

## 6. Assumptions and Limitations of Linear Regression

Examiners frequently ask: *"What are the limitations of your approach?"*

1. **Assumption of Linearity:** Assumes that the relationship between features and target is linear. Although interaction features capture some non-linearities, biological processes often exhibit complex non-linear thresholds.
2. **Homoscedasticity:** OLS assumes that residual errors have constant variance across all levels of predicted values. In healthcare claims, variance typically widens at higher expenditures (heteroscedasticity).
3. **Cross-Border Generalization:** The training data originates from the United States. Indian disease profiles, hospital charge schedules, drug costs, and public healthcare programs (like Ayushman Bharat PM-JAY) differ substantially.
4. **Outlier Sensitivity:** OLS minimizes squared residuals, making it sensitive to extreme points. However, in our analysis, high-cost cases represent genuine clinical risk signals (severe illness in obese smokers) rather than measurement errors, so they were intentionally retained.

---

---

## 7. How the 5 Value-Added Analytics Features Are Calculated

Examiners love asking: *"Did you use another machine learning model for the range, what-if, or suggestions?"*
**The answer is NO.** Everything is calculated using the single saved Linear Regression pipeline, its coefficients ($\beta$), and plain mathematical formulas.

### 7.1 Feature 1 — Estimated Predictive Range
- **Formula:**
  $$\text{Range}_{\text{USD}} = \left[\max\left(0,\, \hat{y} - 1.96 \cdot s_e\right),\; \hat{y} + 1.96 \cdot s_e\right]$$
  $$\text{Range}_{\text{INR}} = \text{Range}_{\text{USD}} \times \text{USD\_TO\_INR\_RATE} \times \text{INDIA\_COST\_FACTOR}$$
- **What is $s_e$?** The sample standard deviation of hold-out test residuals ($y_{\text{test}} - \hat{y}_{\text{test}}$), equal to **$3,802.71** (ddof=1).
- **Why 1.96?** In a normal distribution, $\pm 1.96$ standard deviations covers approximately $95\%$ of the probability mass. This provides an empirical predictive interval representing the model's typical prediction error.
- **Why floor at 0?** Linear regression can technically predict negative lower bounds for young healthy individuals; flooring at 0 prevents impossible negative medical claims.

### 7.2 Feature 2 — Factor Contributions Breakdown
- **Mathematical Formula:**
  $$\text{Contribution}_j = \beta_j \cdot (x_j - \bar{x}_j)$$
  Where $\beta_j$ is the regression coefficient, $x_j$ is the transformed standardized feature for this individual, and $\bar{x}_j$ is the mean of feature $j$ across the training set.
- **Grouping Back to 6 Original Inputs:**
  - One-hot region columns (`region_northeast`, `region_northwest`, etc.) sum under `region`.
  - Age groups (`age_group_*`) and standardized `age` sum under `age`.
  - Obese indicators (`obese`, `bmi_category_*`) and standardized `bmi` sum under `bmi`.
  - Binary `sex_male` sums under `sex`.
  - Binary `smoker_yes` sums under `smoker`.
  - The joint interaction term `smoker_x_bmi` is attributed 50% to `smoker` and 50% to `bmi`.
- **Proof of Mathematical Identity:**
  $$\hat{y}_{\text{person}} = \beta_0 + \sum_{j} \beta_j x_j = \left(\beta_0 + \sum_{j} \beta_j \bar{x}_j\right) + \sum_{j} \beta_j (x_j - \bar{x}_j) = \hat{y}_{\text{average}} + \sum_{j} \text{Contribution}_j$$
  This identity is verified in code and unit tested with zero discrepancy ($\Delta < \$0.05$).

### 7.3 Feature 3 — What-If Counterfactual Simulations
- **Mechanism:** Re-evaluates the trained pipeline modifying exactly ONE input:
  - *Quit Smoking:* Sets `smoker = 'no'` (only if currently `'yes'`).
  - *Exit Obesity:* Sets `bmi = TARGET_BMI_UNDER_30` ($29.9$, only if BMI $\ge 30$).
  - *Reach Normal Weight:* Sets `bmi = TARGET_BMI_NORMAL` ($24.9$, only if BMI $> 24.9$).
- **Filtering:** A scenario is included *only* if savings $> 0$. For non-smokers with standard BMI, savings would be $\le 0$, so scenarios are omitted.
- **Guarantee Disclaimer:** Always carries the note: *"Model-based estimate of an association in the dataset, not a guarantee."*

### 7.4 Feature 4 — Physiological BMI Calculator & Indian Guidelines
- **Formula:** $\text{BMI} = \text{round}\left(\frac{\text{weight\_kg}}{(\text{height\_cm}/100)^2},\, 1\right)$
- **Input Validation:** Enforces physiological limits ($100 \le \text{height} \le 250\text{ cm}$, $20 \le \text{weight} \le 300\text{ kg}$).
- **Why Do Indian Guidelines Differ from the US Dataset?**
  - **WHO / US Dataset Cutoffs:** Overweight at BMI $\ge 25$, Obesity at BMI $\ge 30$.
  - **Consensus Guidelines for Asian Indians (ICMR & MoHFW):** Overweight at BMI $\ge 23$, Obesity at BMI $\ge 25$.
  - **Clinical Reason:** South Asians experience elevated visceral adiposity, insulin resistance, and cardiovascular morbidity at substantially lower BMIs compared to Caucasian populations.

### 7.5 Feature 5 — How to Lower Your Estimated Cost (Actionable Tips)
- **Derived purely from What-If savings:** Sorted descending by estimated rupee saving.
- **Focuses strictly on modifiable factors:** Smoking and BMI.
- **Ethical & Supportive Design:** Clearly notes that fixed demographic factors (age, biological sex, geographic region, children) cannot and should not be changed and are not judged. No shaming language is used.
- **Medical Disclaimer:** *"General information only, not medical advice. Consult a doctor before making health changes."*

### 7.6 Shared Helper — Empirical Risk Levels (`risk_level`)
- **Cutoffs:** Computed once from empirical training set charge percentiles:
  - **Low Risk:** $< 33\text{rd percentile}$ ($\$6,389.38$ / $\text{₹}6,13,380$)
  - **Moderate Risk:** $33\text{rd}$ to $66\text{th percentile}$ ($\$6,389.38 - \$13,012.21$ / $\text{₹}6,13,380 - \text{₹}12,49,172$)
  - **High Risk:** $> 66\text{th percentile}$ ($\$13,012.21$ / $\text{₹}12,49,172$)
- **Examiner Note:** Stress that this is a **rule-based grouping heuristic**, NOT a classifier or secondary machine learning model. Both single `/api/predict` and batch `/api/predict-batch` call the exact same `risk_level` function in `backend/features.py`, ensuring consistent risk stratification across all interfaces.

### 7.7 Feature 6 — How Batch CSV Scoring Works (In-Memory Processing)
- **Zero Disk Persistence:** The uploaded multipart CSV stream is read directly into memory via `io.StringIO` and parsed with `csv.DictReader`. At no point is the upload written to disk, protecting user data privacy.
- **Fail-Safe Row Validation:** The parser validates each row independently against physiological and categorical constraints (e.g., age 18–100, BMI 10–60, children 0–10). If a row is corrupted (e.g., negative BMI or empty smoker), it is recorded in an `errors` list with its row number, column name, and explanation, while all valid rows proceed to scoring without crashing the server.
- **Exact Single-Batch Equivalence:** Each valid row is passed to `process_single_record()`, which invokes the exact same Scikit-Learn `pipeline.predict()`, `compute_range()`, `compute_contributions()`, `compute_whatif()`, and `compute_suggestions()` functions as the single prediction endpoint. Single and batch scores match to the exact decimal.
- **DDE / Formula Injection Guard on Export:** In spreadsheet applications (Excel, Calc), cells starting with `=`, `+`, `-`, or `@` can execute external commands or formulas (CSV Injection / Dynamic Data Exchange attacks). When exporting results to CSV on the frontend, any text value starting with these characters is escaped with a prepended single quote (`'`), rendering it inert plain text.

---

## 8. Quick Viva Q&A Cheat Sheet

| Question | Short Viva Answer |
| :--- | :--- |
| **Q1. Which model is used in your project?** | Multiple Linear Regression fitted via Ordinary Least Squares (OLS) inside a Scikit-Learn Pipeline. |
| **Q2. What is your test $R^2$ score?** | 0.8983 (89.83% variance explained on the unseen 20% test set). |
| **Q3. Did your model overfit?** | No. Train $R^2$ is 83.66% and 5-Fold Cross-Validation $R^2$ is 82.59% ($\pm 3.92\%$). The train/test gap is small, confirming strong generalization. |
| **Q4. Why did you compare against a trivial baseline?** | A dummy regressor predicting the training mean ($\bar{y}$) yields an $R^2$ of 0.0% and MAE of $9,081. Our Linear Regression reduces MAE by 72.7% to $2,475. |
| **Q5. How do you prevent data leakage?** | Feature scaling (`StandardScaler`) and encoding (`OneHotEncoder`) are bundled inside a Scikit-Learn `Pipeline` fitted *only* on the training split. |
| **Q6. What does the intercept represent?** | $\beta_0 \approx \$18,438.79$ represents the expected baseline cost when all standardized features equal zero. |
| **Q7. How is the estimated range calculated?** | Prediction $\pm 1.96 \times s_e$ ($s_e = \$3,802.71$ residual standard deviation), floored at 0 and converted to INR. |
| **Q8. How does factor breakdown prove its accuracy?** | We compute $\beta_j (x_j - \bar{x}_j)$ for each factor and mathematically verify that base prediction + sum of contributions equals the person's prediction. |
| **Q9. Did you train a classifier for risk levels?** | No. Risk levels are determined by fixed rule-based cutoffs at the 33rd and 66th empirical percentiles of historical training charges ($<\$6.38k$ Low, $\$6.38k-\$13.01k$ Medium, $>\$13.01k$ High). |
| **Q10. How does the batch CSV prediction endpoint guarantee consistency with single predictions?** | Both endpoints call the exact same `process_single_record()` helper in `backend/features.py`, using the identical pipeline and INR conversion rate. |
| **Q11. How does the application handle invalid or corrupted rows in bulk uploads?** | It uses non-crashing row-level validation: invalid rows are recorded in an error log with row number, column, and reason, while valid rows are processed and scored normally. |
| **Q12. What is formula injection and how does your CSV export protect against it?** | If exported text cells start with `=`, `+`, `-`, or `@`, spreadsheet programs can execute malicious formulas. We prepend a single quote (`'`) to neutralise formula execution. |
