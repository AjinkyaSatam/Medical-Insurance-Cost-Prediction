"""
Medical Insurance Cost Prediction - Model Evaluation & Visualization Module
Author: College ML Project Team
License: MIT
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from src.preprocess import load_and_clean_data, MedicalInsuranceFeatureEngineer


def evaluate_saved_model(
    model_path: str = "models/best_model.joblib",
    metrics_path: str = "models/metrics.json",
    cache_path: str = "models/eval_cache.json",
    output_dir: str = "reports/figures"
):
    """
    Loads saved model, evaluation cache, and metrics.
    Generates comparison tables, residual plots, predicted vs actual plots,
    and feature importance charts.
    """
    os.makedirs(output_dir, exist_ok=True)
    sns.set_theme(style="whitegrid", palette="muted")
    plt.rcParams.update({"font.size": 11, "figure.autolayout": True})

    # 1. Load metrics
    if not os.path.exists(metrics_path):
        raise FileNotFoundError(f"Metrics not found at {metrics_path}. Please run src/train.py first.")

    with open(metrics_path, "r") as f:
        metrics_data = json.load(f)

    print("=" * 70)
    print("SAVED MODEL SUMMARY & METRICS")
    print("=" * 70)
    print(f"Final Selected Model: {metrics_data['final_model']}")
    print(f"Best Hyperparameters: {metrics_data['best_params']}")
    final_m = metrics_data["final_metrics"]
    print(f"Train R2 Score:       {final_m['train_r2']:.4f}")
    print(f"Test R2 Score:        {final_m['test_r2']:.4f}")
    print(f"5-Fold CV R2 Score:   {final_m['cv_r2_mean']:.4f} (+/- {final_m['cv_r2_std']:.4f})")
    print(f"Test MAE:             ${final_m['test_mae']:.2f}")
    print(f"Test RMSE:            ${final_m['test_rmse']:.2f}")
    print(f"Train/Test Gap:       {final_m['train_test_r2_gap']:.4f}")
    print(f"Overfitting Analysis: {metrics_data['overfitting_diagnosis']}")

    # 2. Model Comparison Table
    comp_dict = metrics_data["comparison_table"]
    comp_df = pd.DataFrame(comp_dict).T[[
        "cv_r2_mean", "cv_r2_std", "train_r2", "test_r2", "test_mae", "test_rmse", "train_test_r2_gap"
    ]].sort_values(by="cv_r2_mean", ascending=False)

    print("\n--- COMPLETE BENCHMARK COMPARISON TABLE ---")
    print(comp_df.to_string())

    # 3. Plot 1: Model Comparison Bar Chart (CV R2 and Test R2)
    plt.figure(figsize=(10, 5))
    plot_models = [m for m in comp_df.index if "Tuned" not in m]  # Base models + Log versions
    sub_df = comp_df.loc[plot_models].sort_values(by="test_r2", ascending=True)

    y_pos = np.arange(len(sub_df))
    plt.barh(y_pos - 0.2, sub_df["cv_r2_mean"], height=0.4, label="5-Fold CV R²", color="#3b82f6")
    plt.barh(y_pos + 0.2, sub_df["test_r2"], height=0.4, label="Test R²", color="#10b981")
    plt.yticks(y_pos, sub_df.index)
    plt.xlabel("R² Score (Higher is Better)")
    plt.title("Model Performance Benchmark: CV vs Test R² Score", fontsize=13, weight="bold")
    plt.xlim(0.4, 1.0)
    plt.legend(loc="lower right")
    comp_plot_path = os.path.join(output_dir, "model_comparison.png")
    plt.savefig(comp_plot_path, dpi=300)
    plt.close()
    print(f"[*] Saved model comparison chart: {comp_plot_path}")

    # 4. Load eval cache for scatter & residual plots
    if os.path.exists(cache_path):
        with open(cache_path, "r") as f:
            cache = json.load(f)
        y_test = np.array(cache["y_test"])
        y_pred = np.array(cache["y_pred"])
        residuals = np.array(cache["residuals"])
    else:
        # Fallback: recompute from clean dataset
        model = joblib.load(model_path)
        data = load_and_clean_data("data/insurance.csv")
        y_test = data["charges"].values[-268:]
        X_test = data.drop(columns=["charges"]).iloc[-268:]
        y_pred = model.predict(X_test)
        residuals = y_test - y_pred

    # Plot 2: Predicted vs Actual Scatter Plot
    plt.figure(figsize=(8, 6))
    plt.scatter(y_test, y_pred, alpha=0.6, color="#2563eb", edgecolors="w", s=50, label="Predictions")
    min_val = min(y_test.min(), y_pred.min())
    max_val = max(y_test.max(), y_pred.max())
    plt.plot([min_val, max_val], [min_val, max_val], "r--", lw=2, label="Perfect Fit (y = x)")
    plt.xlabel("Actual Charges ($)", fontsize=11)
    plt.ylabel("Predicted Charges ($)", fontsize=11)
    plt.title(f"Predicted vs Actual Charges ({metrics_data['final_model']})\nTest R²: {final_m['test_r2']:.4f} | MAE: ${final_m['test_mae']:.2f}", fontsize=12, weight="bold")
    plt.legend()
    pred_act_path = os.path.join(output_dir, "predicted_vs_actual.png")
    plt.savefig(pred_act_path, dpi=300)
    plt.close()
    print(f"[*] Saved predicted vs actual chart: {pred_act_path}")

    # Plot 3: Residuals Diagnostic Plots (Scatter & Histogram)
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    # Residuals vs Predicted
    axes[0].scatter(y_pred, residuals, alpha=0.6, color="#059669", edgecolors="w", s=45)
    axes[0].axhline(0, color="red", linestyle="--", lw=2)
    axes[0].set_xlabel("Predicted Charges ($)")
    axes[0].set_ylabel("Residuals (Actual - Predicted) ($)")
    axes[0].set_title("Residuals vs Predicted Charges", fontsize=12, weight="bold")

    # Residual Distribution
    sns.histplot(residuals, kde=True, ax=axes[1], color="#0284c7", bins=25)
    axes[1].axvline(0, color="red", linestyle="--", lw=1.5)
    axes[1].set_xlabel("Residual Error ($)")
    axes[1].set_ylabel("Frequency")
    axes[1].set_title("Residual Error Distribution (Near-Normal)", fontsize=12, weight="bold")

    residual_path = os.path.join(output_dir, "residuals_plot.png")
    plt.savefig(residual_path, dpi=300)
    plt.close()
    print(f"[*] Saved residual diagnostics: {residual_path}")

    # Plot 4: Feature Importance
    feat_imps = metrics_data.get("feature_importances", [])
    if feat_imps:
        feat_df = pd.DataFrame(feat_imps).head(10).sort_values(by="importance", ascending=True)
        plt.figure(figsize=(9, 5))
        plt.barh(feat_df["feature"], feat_df["importance"], color="#4f46e5")
        plt.xlabel("Relative Importance Score", fontsize=11)
        plt.title(f"Top 10 Feature Importances ({metrics_data['final_model']})", fontsize=12, weight="bold")
        feat_path = os.path.join(output_dir, "feature_importance.png")
        plt.savefig(feat_path, dpi=300)
        plt.close()
        print(f"[*] Saved feature importance chart: {feat_path}")

    print("\n[SUCCESS] All evaluation plots and diagnostics generated successfully!")


if __name__ == "__main__":
    evaluate_saved_model()
