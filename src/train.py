"""
Medical Insurance Cost Prediction - Model Training Module
Model: Multiple Linear Regression (Ordinary Least Squares)

Why Linear Regression?
-----------------------
Linear Regression models the relationship between dependent variable (charges)
and independent features as a linear equation:
    y = b0 + b1*x1 + b2*x2 + ... + bn*xn

Where:
- y: predicted insurance charges (in USD)
- b0: intercept (baseline charge when all standardized features are zero)
- b1..bn: regression coefficients (change in y per unit increase in each feature, ceteris paribus)

This script trains Linear Regression on raw medical insurance charges,
evaluates performance using 5-fold cross-validation and an 80/20 train-test split,
compares it against a trivial mean baseline, extracts coefficients, and saves the artifacts.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, KFold, cross_val_score
from sklearn.linear_model import LinearRegression
from sklearn.dummy import DummyRegressor
from sklearn.metrics import r2_score, mean_absolute_error, root_mean_squared_error

import sys
# Ensure src can import sibling modules when run directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from src.preprocess import load_and_clean_data, build_full_pipeline, flag_charge_outliers


RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)


def evaluate_predictions(y_true, y_pred):
    """
    Computes key regression evaluation metrics:
    - R² Score: Coefficient of determination (proportion of variance explained)
    - MAE: Mean Absolute Error (average magnitude of errors in dollars)
    - RMSE: Root Mean Squared Error (penalizes larger errors more heavily)
    """
    return {
        "r2": round(float(r2_score(y_true, y_pred)), 4),
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 2),
        "rmse": round(float(root_mean_squared_error(y_true, y_pred)), 2),
    }


def run_training_pipeline(data_path="data/insurance.csv", models_dir="models"):
    """
    Executes training for Linear Regression on the raw charges target:
    1. Loads cleaned data and inspects medical charge outliers.
    2. Performs an 80/20 train/test split stratified on smoker.
    3. Evaluates a trivial mean baseline (predicts training mean).
    4. Trains the Linear Regression pipeline (Feature Engineering + Scaling + OneHot + OLS).
    5. Performs 5-Fold Cross Validation.
    6. Extracts coefficients and intercept for viva and actuarial explanation.
    7. Saves the trained pipeline and evaluation metrics.
    """
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(os.path.join(models_dir, "archive"), exist_ok=True)

    print("=" * 70)
    print("STEP 1: LOADING & INSPECTING CLEAN DATA")
    print("=" * 70)
    df = load_and_clean_data(data_path)
    _, outlier_stats = flag_charge_outliers(df)
    print(f"[*] Outlier Note: {outlier_stats['explanation']}")

    # Features (X) and Target (y) - Raw target only
    X = df.drop(columns=["charges"])
    y = df["charges"]

    # STEP 2: Stratified 80/20 train/test split on smoker status
    # Stratification ensures both train and test sets have the identical proportion of smokers (~20.5%)
    print("\n" + "=" * 70)
    print("STEP 2: TRAIN/TEST SPLIT (80/20, Stratified on smoker, Seed=42)")
    print("=" * 70)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=RANDOM_STATE, stratify=X["smoker"]
    )
    print(f"[*] Training records: {X_train.shape[0]} | Testing records: {X_test.shape[0]}")
    print(f"[*] Train smoker ratio: {(X_train['smoker'] == 'yes').mean():.1%}")
    print(f"[*] Test smoker ratio:  {(X_test['smoker'] == 'yes').mean():.1%}")

    # 5-Fold Cross Validation Setup
    cv_kfold = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    # STEP 3: TRIVIAL BASELINE (Predict Training Mean)
    # A dummy baseline to prove that Linear Regression learns genuine relationships
    print("\n" + "=" * 70)
    print("STEP 3: TRIVIAL BASELINE (Mean Predictor)")
    print("=" * 70)
    baseline_model = DummyRegressor(strategy="mean")
    baseline_model.fit(X_train, y_train)
    baseline_train_preds = baseline_model.predict(X_train)
    baseline_test_preds = baseline_model.predict(X_test)

    baseline_train_metrics = evaluate_predictions(y_train, baseline_train_preds)
    baseline_test_metrics = evaluate_predictions(y_test, baseline_test_preds)

    baseline_metrics = {
        "train_r2": baseline_train_metrics["r2"],
        "test_r2": baseline_test_metrics["r2"],
        "train_mae": baseline_train_metrics["mae"],
        "test_mae": baseline_test_metrics["mae"],
        "train_rmse": baseline_train_metrics["rmse"],
        "test_rmse": baseline_test_metrics["rmse"],
    }
    print(f"[*] Baseline Train R²: {baseline_metrics['train_r2']:.4f} | Test R²: {baseline_metrics['test_r2']:.4f}")
    print(f"[*] Baseline Test MAE: ${baseline_metrics['test_mae']:.2f} | Test RMSE: ${baseline_metrics['test_rmse']:.2f}")

    # STEP 4: TRAIN LINEAR REGRESSION PIPELINE
    print("\n" + "=" * 70)
    print("STEP 4: TRAINING LINEAR REGRESSION PIPELINE")
    print("=" * 70)
    # Pipeline contains: Feature Engineering -> ColumnTransformer (StandardScaler + OneHotEncoder) -> LinearRegression
    pipeline = build_full_pipeline(regressor=LinearRegression())

    # Fit pipeline on training data only to prevent data leakage
    pipeline.fit(X_train, y_train)

    train_preds = pipeline.predict(X_train)
    test_preds = pipeline.predict(X_test)

    train_m = evaluate_predictions(y_train, train_preds)
    test_m = evaluate_predictions(y_test, test_preds)

    # 5-Fold Cross Validation R² score on training set
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv_kfold, scoring="r2", n_jobs=-1)
    cv_r2_mean = float(np.mean(cv_scores))
    cv_r2_std = float(np.std(cv_scores))

    model_metrics = {
        "train_r2": train_m["r2"],
        "test_r2": test_m["r2"],
        "train_mae": train_m["mae"],
        "test_mae": test_m["mae"],
        "train_rmse": train_m["rmse"],
        "test_rmse": test_m["rmse"],
        "cv_r2_mean": round(cv_r2_mean, 4),
        "cv_r2_std": round(cv_r2_std, 4),
        "train_test_r2_gap": round(train_m["r2"] - test_m["r2"], 4),
    }

    print("\n--- LINEAR REGRESSION PERFORMANCE ---")
    print(f"Train R² Score: {model_metrics['train_r2']:.4f}")
    print(f"Test R² Score:  {model_metrics['test_r2']:.4f}")
    print(f"5-Fold CV R²:   {model_metrics['cv_r2_mean']:.4f} (+/- {model_metrics['cv_r2_std']:.4f})")
    print(f"Train MAE:      ${model_metrics['train_mae']:.2f}")
    print(f"Test MAE:       ${model_metrics['test_mae']:.2f}")
    print(f"Train RMSE:     ${model_metrics['train_rmse']:.2f}")
    print(f"Test RMSE:      ${model_metrics['test_rmse']:.2f}")

    # STEP 5: COEFFICIENTS & INTERCEPT EXTRACTION
    print("\n" + "=" * 70)
    print("STEP 5: EXTRACTING LINEAR REGRESSION COEFFICIENTS & INTERCEPT")
    print("=" * 70)
    preprocessor = pipeline.named_steps["preprocessor"]
    feature_names = list(preprocessor.get_feature_names_out())
    linear_model = pipeline.named_steps["regressor"]
    raw_coefficients = linear_model.coef_
    intercept = float(linear_model.intercept_)

    coefficients_dict = {}
    coefficients_list = []
    for name, coef in zip(feature_names, raw_coefficients):
        c_val = round(float(coef), 2)
        coefficients_dict[name] = c_val
        coefficients_list.append({
            "feature": name,
            "coefficient": c_val,
            "abs_coefficient": abs(c_val)
        })

    # Sort descending by absolute coefficient value
    coefficients_list.sort(key=lambda item: item["abs_coefficient"], reverse=True)

    print(f"[*] Intercept (b0): ${intercept:.2f}")
    print("[*] Top 8 Coefficients:")
    for item in coefficients_list[:8]:
        print(f"    - {item['feature']:<30}: {item['coefficient']:>10.2f}")

    # STEP 6: SAVE ARTIFACTS
    print("\n" + "=" * 70)
    print("STEP 6: SAVING MODEL & METRICS ARTIFACTS")
    print("=" * 70)
    model_path = os.path.join(models_dir, "best_model.joblib")
    metrics_path = os.path.join(models_dir, "metrics.json")
    cache_path = os.path.join(models_dir, "eval_cache.json")

    # Save pipeline
    joblib.dump(pipeline, model_path)
    print(f"[*] Saved Linear Regression pipeline to: {model_path}")

    # Test set predictions and residuals
    residuals = y_test.values - test_preds
    pred_vs_actual = [
        {"actual": round(float(a), 2), "predicted": round(float(p), 2)}
        for a, p in zip(y_test, test_preds)
    ]
    residuals_points = [
        {"predicted": round(float(p), 2), "residual": round(float(r), 2)}
        for p, r in zip(test_preds, residuals)
    ]

    # Save evaluation cache for compatibility
    eval_cache = {
        "y_test": [round(float(v), 2) for v in y_test.tolist()],
        "y_pred": [round(float(v), 2) for v in test_preds.tolist()],
        "residuals": [round(float(v), 2) for v in residuals.tolist()],
    }
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(eval_cache, f, indent=2)
    print(f"[*] Saved evaluation cache to: {cache_path}")

    # Comprehensive metrics dictionary (USD)
    export_metrics = {
        "model_name": "Linear Regression",
        "algorithm": "Ordinary Least Squares (OLS)",
        "final_metrics": model_metrics,
        "baseline_metrics": baseline_metrics,
        "intercept": round(intercept, 2),
        "coefficients": coefficients_dict,
        "coefficients_list": coefficients_list,
        "predicted_vs_actual": pred_vs_actual,
        "residuals": residuals_points,
        "outlier_stats": outlier_stats,
    }

    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(export_metrics, f, indent=2)
    print(f"[*] Saved metrics and coefficients to: {metrics_path}")

    print("\n[SUCCESS] Linear Regression training pipeline completed successfully!")
    return pipeline, export_metrics


if __name__ == "__main__":
    run_training_pipeline()
