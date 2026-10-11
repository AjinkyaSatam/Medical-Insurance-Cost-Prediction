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

## 7. Quick Viva Q&A Cheat Sheet

| Question | Short Viva Answer |
| :--- | :--- |
| **Q1. Which model is used in your project?** | Multiple Linear Regression fitted via Ordinary Least Squares (OLS) inside a Scikit-Learn Pipeline. |
| **Q2. What is your test $R^2$ score?** | 0.8983 (89.83% variance explained on the unseen 20% test set). |
| **Q3. Did your model overfit?** | No. Train $R^2$ is 83.66% and 5-Fold Cross-Validation $R^2$ is 82.59% ($\pm 3.92\%$). The train/test gap is small, confirming strong generalization. |
| **Q4. Why did you compare against a trivial baseline?** | A dummy regressor that always predicts the training mean ($\bar{y}$) yields an $R^2$ of 0.0% and MAE of $9,081. Comparing against it proves that our Linear Regression model delivers genuine predictive power (reducing MAE by 72.7%). |
| **Q5. How do you prevent data leakage?** | Feature scaling (`StandardScaler`) and encoding (`OneHotEncoder`) are bundled inside a Scikit-Learn `Pipeline` and fitted *only* on the training data. |
| **Q6. What does the intercept represent?** | $\beta_0 \approx \$18,438.79$ represents the expected baseline cost when all standardized features equal zero. |
| **Q7. Why did you not retrain on INR data?** | The original dataset has actual historical dollar claims. Retraining on arbitrarily converted numbers would invent data. Keeping the model in USD and adding a configurable translation layer maintains scientific integrity. |
