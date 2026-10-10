"""
Medical Insurance Cost Prediction - Data Cleaning & Preprocessing Module
Author: College ML Project Team
License: MIT
"""

import os
import pandas as pd
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.pipeline import Pipeline


def load_and_clean_data(filepath: str = "data/insurance.csv") -> pd.DataFrame:
    """
    Loads insurance dataset, inspects shape, dtypes, missing values,
    and removes duplicate records.
    
    Parameters:
        filepath (str): Path to insurance.csv file
        
    Returns:
        pd.DataFrame: Cleaned dataset
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Dataset not found at {filepath}")

    df = pd.read_csv(filepath)
    print(f"[*] Initial dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")

    # Check for missing values
    missing_count = df.isnull().sum().sum()
    if missing_count > 0:
        print(f"[!] Found {missing_count} missing values. Imputing...")
        df = df.dropna()
    else:
        print("[*] No missing values detected in dataset.")

    # Check for duplicates
    dup_count = df.duplicated().sum()
    if dup_count > 0:
        print(f"[*] Found {dup_count} duplicate row(s). Removing duplicates...")
        df = df.drop_duplicates().reset_index(drop=True)
    else:
        print("[*] No duplicate rows detected.")

    print(f"[*] Clean dataset ready: {df.shape[0]} rows, {df.shape[1]} columns")
    return df


def flag_charge_outliers(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """
    Flags outliers in target variable 'charges' using IQR method.
    DO NOT drop these outliers because high-charge cases reflect genuine
    medical risk factors (especially smoking and obesity), not data errors.
    
    Parameters:
        df (pd.DataFrame): Dataset containing 'charges'
        
    Returns:
        tuple: (annotated DataFrame with 'is_outlier_charge', outlier summary stats)
    """
    df_copy = df.copy()
    q1 = df_copy["charges"].quantile(0.25)
    q3 = df_copy["charges"].quantile(0.75)
    iqr = q3 - q1
    upper_bound = q3 + (1.5 * iqr)
    lower_bound = max(0, q1 - (1.5 * iqr))

    df_copy["is_charge_outlier"] = (df_copy["charges"] > upper_bound) | (df_copy["charges"] < lower_bound)
    outlier_count = int(df_copy["is_charge_outlier"].sum())
    
    # Analyze outlier characteristics
    outliers = df_copy[df_copy["is_charge_outlier"]]
    smoker_outlier_pct = float((outliers["smoker"] == "yes").mean() * 100) if outlier_count > 0 else 0.0

    summary = {
        "q1": float(q1),
        "q3": float(q3),
        "iqr": float(iqr),
        "upper_bound": float(upper_bound),
        "lower_bound": float(lower_bound),
        "outlier_count": outlier_count,
        "outlier_percentage": round((outlier_count / len(df_copy)) * 100, 2),
        "smoker_proportion_among_outliers_pct": round(smoker_outlier_pct, 2),
        "explanation": (
            f"There are {outlier_count} charges above ${upper_bound:.2f}. "
            f"{smoker_outlier_pct:.1f}% of these high-cost individuals are smokers. "
            "These data points represent genuine clinical severity and risk signals, "
            "so they are retained to avoid biasing the predictive model."
        )
    }
    return df_copy, summary


class MedicalInsuranceFeatureEngineer(BaseEstimator, TransformerMixin):
    """
    Custom Scikit-Learn Transformer for Domain-Specific Feature Engineering:
    1. obese (binary): bmi >= 30.0
    2. bmi_category (categorical): Underweight, Normal, Overweight, Obese
    3. age_group (categorical): 18-29, 30-44, 45-54, 55+
    4. smoker_x_bmi (continuous interaction): (smoker == 'yes') * bmi
    """

    def __init__(self):
        pass

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        # Handle DataFrame or 2D array input
        if not isinstance(X, pd.DataFrame):
            # Assume original columns order if passed as ndarray
            cols = ["age", "sex", "bmi", "children", "smoker", "region"]
            X_df = pd.DataFrame(X, columns=cols)
        else:
            X_df = X.copy()

        # 1. Obese flag (BMI >= 30 is medical threshold for clinical obesity)
        X_df["obese"] = (X_df["bmi"].astype(float) >= 30.0).astype(int)

        # 2. BMI Category binning
        X_df["bmi_category"] = pd.cut(
            X_df["bmi"].astype(float),
            bins=[-float("inf"), 18.5, 24.9, 29.9, float("inf")],
            labels=["Underweight", "Normal", "Overweight", "Obese"]
        ).astype(str)

        # 3. Age Group binning
        X_df["age_group"] = pd.cut(
            X_df["age"].astype(float),
            bins=[0, 29, 44, 54, 150],
            labels=["18-29", "30-44", "45-54", "55+"]
        ).astype(str)

        # 4. Interaction Term: Smoker x BMI (strongest synergistic effect on cost)
        is_smoker = (X_df["smoker"].astype(str).str.lower().str.strip() == "yes").astype(float)
        X_df["smoker_x_bmi"] = is_smoker * X_df["bmi"].astype(float)

        return X_df


def build_preprocessor() -> ColumnTransformer:
    """
    Constructs a ColumnTransformer that encodes and scales features:
    - Numeric features: StandardScaler
    - Categorical features: OneHotEncoder (binary features encoded with drop='if_binary')
    """
    numeric_features = ["age", "bmi", "children", "obese", "smoker_x_bmi"]
    categorical_features = ["sex", "smoker", "region", "bmi_category", "age_group"]

    numeric_transformer = StandardScaler()
    categorical_transformer = OneHotEncoder(
        drop="if_binary",
        handle_unknown="ignore",
        sparse_output=False
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_features),
            ("cat", categorical_transformer, categorical_features),
        ],
        remainder="drop",
        verbose_feature_names_out=False
    )
    return preprocessor


def build_full_pipeline(regressor=None) -> Pipeline:
    """
    Assembles complete end-to-end Pipeline combining:
    1. Feature Engineering
    2. Scaling & Encoding
    3. Regressor (optional)
    """
    steps = [
        ("feature_engineer", MedicalInsuranceFeatureEngineer()),
        ("preprocessor", build_preprocessor()),
    ]
    if regressor is not None:
        steps.append(("regressor", regressor))

    return Pipeline(steps=steps)


if __name__ == "__main__":
    data = load_and_clean_data("data/insurance.csv")
    _, stats = flag_charge_outliers(data)
    print("\n--- Outlier Analysis ---")
    print(stats["explanation"])
    
    pipe = build_full_pipeline()
    X = data.drop(columns=["charges"])
    X_transformed = pipe.fit_transform(X)
    print(f"\nTransformed feature matrix shape: {X_transformed.shape}")
    feature_names = pipe.named_steps["preprocessor"].get_feature_names_out()
    print("Transformed features:", list(feature_names))
