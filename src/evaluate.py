"""
Medical Insurance Cost Prediction - Model Evaluation & Diagnostic Visualization Module
Model: Linear Regression (Ordinary Least Squares)
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
    Loads saved Linear Regression model, evaluation cache, and metrics.
    Generates comparison tables, residual plots, predicted vs actual plots,
    and coefficients charts.
    """
    os.makedirs(output_dir, exist_ok=True)
    sns.set_theme(style="whitegrid", palette="muted")
    plt.rcParams.update({"font.size": 11, "figure.autolayout": True})

    # 1. Load metrics
    if not os.path.exists(metrics_path):
        raise FileNotFoundError(f"Metrics not found at {metrics_path}. Please run src/train.py first.")

    with open(metrics_path, "r", encoding="utf-8") as f:
        metrics_data = json.load(f)

    print("=" * 70)
    print("SAVED LINEAR REGRESSION SUMMARY & METRICS")
    print("=" * 70)
    print(f"Model Name:           {metrics_data.get('model_name', 'Linear Regression')}")
    print(f"Algorithm:            {metrics_data.get('algorithm', 'Ordinary Least Squares')}")
    print(f"Intercept (b0):       ${metrics_data.get('intercept', 0.0):.2f}")
    
    final_m = metrics_data["final_metrics"]
    base_m = metrics_data.get("baseline_metrics", {})
    print(f"Train R² Score:       {final_m['train_r2']:.4f} (Baseline: {base_m.get('train_r2', 0.0):.4f})")
    print(f"Test R² Score:        {final_m['test_r2']:.4f} (Baseline: {base_m.get('test_r2', 0.0):.4f})")
    print(f"5-Fold CV R² Score:   {final_m['cv_r2_mean']:.4f} (+/- {final_m['cv_r2_std']:.4f})")
    print(f"Train MAE:            ${final_m['train_mae']:.2f} (Baseline: ${base_m.get('train_mae', 0.0):.2f})")
    print(f"Test MAE:             ${final_m['test_mae']:.2f} (Baseline: ${base_m.get('test_mae', 0.0):.2f})")
    print(f"Train RMSE:           ${final_m['train_rmse']:.2f} (Baseline: ${base_m.get('train_rmse', 0.0):.2f})")
    print(f"Test RMSE:            ${final_m['test_rmse']:.2f} (Baseline: ${base_m.get('test_rmse', 0.0):.2f})")

    # 2. Plot 1: Baseline vs Linear Regression Comparison Bar Chart
    plt.figure(figsize=(9, 4.5))
    categories = ["Train R²", "Test R²", "5-Fold CV R²"]
    base_vals = [base_m.get("train_r2", 0.0), base_m.get("test_r2", 0.0), 0.0]
    lr_vals = [final_m["train_r2"], final_m["test_r2"], final_m["cv_r2_mean"]]

    x = np.arange(len(categories))
    width = 0.35
    plt.bar(x - width/2, base_vals, width, label="Mean Baseline", color="#94a3b8")
    plt.bar(x + width/2, lr_vals, width, label="Linear Regression", color="#2563eb")
    plt.ylabel("R² Score (Coefficient of Determination)")
    plt.title("Performance Comparison: Mean Baseline vs Linear Regression", fontsize=12, weight="bold")
    plt.xticks(x, categories)
    plt.ylim(-0.05, 1.0)
    plt.legend()
    comp_plot_path = os.path.join(output_dir, "model_comparison.png")
    plt.savefig(comp_plot_path, dpi=300)
    plt.close()
    print(f"[*] Saved model comparison chart: {comp_plot_path}")

    # 3. Load eval cache for scatter & residual plots
    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            cache = json.load(f)
        y_test = np.array(cache["y_test"])
        y_pred = np.array(cache["y_pred"])
        residuals = np.array(cache["residuals"])
    else:
        # Fallback from metrics
        p_vs_a = metrics_data.get("predicted_vs_actual", [])
        y_test = np.array([pt["actual"] for pt in p_vs_a])
        y_pred = np.array([pt["predicted"] for pt in p_vs_a])
        residuals = y_test - y_pred

    # Plot 2: Predicted vs Actual Scatter Plot
    plt.figure(figsize=(8, 6))
    plt.scatter(y_test, y_pred, alpha=0.6, color="#2563eb", edgecolors="w", s=50, label="Test Samples")
    min_val = min(y_test.min(), y_pred.min())
    max_val = max(y_test.max(), y_pred.max())
    plt.plot([min_val, max_val], [min_val, max_val], "r--", lw=2, label="Perfect Line (y = x)")
    plt.xlabel("Actual Charges ($)", fontsize=11)
    plt.ylabel("Predicted Charges ($)", fontsize=11)
    plt.title(f"Predicted vs Actual Charges (Linear Regression)\nTest R²: {final_m['test_r2']:.4f} | Test MAE: ${final_m['test_mae']:.2f}", fontsize=12, weight="bold")
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
    axes[1].set_title("Residual Error Distribution", fontsize=12, weight="bold")

    residual_path = os.path.join(output_dir, "residuals_plot.png")
    plt.savefig(residual_path, dpi=300)
    plt.close()
    print(f"[*] Saved residual diagnostics: {residual_path}")

    # Plot 4: Top Coefficients Chart
    coef_list = metrics_data.get("coefficients_list", [])
    if coef_list:
        top_coefs = coef_list[:10]
        c_df = pd.DataFrame(top_coefs).sort_values(by="coefficient", ascending=True)
        colors = ["#ef4444" if val < 0 else "#10b981" for val in c_df["coefficient"]]
        plt.figure(figsize=(9, 5))
        plt.barh(c_df["feature"], c_df["coefficient"], color=colors)
        plt.xlabel("Linear Regression Coefficient (USD)", fontsize=11)
        plt.title("Top Feature Coefficients in Linear Regression Pipeline", fontsize=12, weight="bold")
        feat_path = os.path.join(output_dir, "coefficients.png")
        plt.savefig(feat_path, dpi=300)
        plt.close()
        print(f"[*] Saved coefficients chart: {feat_path}")

    print("\n[SUCCESS] All evaluation plots and diagnostics generated successfully!")


if __name__ == "__main__":
    evaluate_saved_model()
