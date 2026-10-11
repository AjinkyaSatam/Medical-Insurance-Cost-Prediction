"""
Backend Configuration Module
Defines currency, healthcare cost adjustment factor, BMI what-if targets, and empirical risk thresholds.
All settings can be edited directly here without modifying any other codebase logic.
"""

# Currency & Healthcare Adjustment Layer
USD_TO_INR_RATE: float = 96.0  # update to current rate
INDIA_COST_FACTOR: float = 1.0  # TODO: set from a cited US vs India healthcare cost comparison

# What-If Scenario BMI Targets (Feature 3)
TARGET_BMI_UNDER_30: float = 29.9  # Target for reducing BMI to under 30 (Feature 3b)
TARGET_BMI_NORMAL: float = 24.9    # Target for reaching normal weight boundary (Feature 3c)
# Backward-compatibility aliases
TARGET_BMI_OBESE_THRESHOLD: float = TARGET_BMI_UNDER_30
TARGET_BMI_NORMAL_THRESHOLD: float = TARGET_BMI_NORMAL

# Empirical Risk Classification Thresholds (33rd and 66th percentiles of training charges)
RISK_THRESHOLD_LOW_USD: float = 6389.38   # Charges below this belong to Low Risk tier (~$6,389.38)
RISK_THRESHOLD_HIGH_USD: float = 13012.21  # Charges above this belong to High Risk tier (~$13,012.21)

# Residual Standard Deviation for Prediction Range (Feature 1)
RESIDUAL_STD_USD: float = 3802.71  # Standard deviation of hold-out test residuals ($3,802.71)
