"""
Medical Insurance Cost Prediction - Model Training & Hyperparameter Tuning Module
Author: College ML Project Team
License: MIT
"""

import os
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, KFold, cross_val_score, RandomizedSearchCV
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor
from sklearn.compose import TransformedTargetRegressor
from sklearn.metrics import r2_score, mean_absolute_error, root_mean_squared_error

import sys
# Ensure src can import sibling modules when run directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from src.preprocess import load_and_clean_data, build_full_pipeline, flag_charge_outliers


RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)


def evaluate_model_performance(model, X_train, y_train, X_test, y_test, cv_kfold):
    """
    Evaluates a model or pipeline returning train/test R2, MAE, RMSE,
    and 5-fold cross-validation R2 score.
    """
    # Fit model on training data only
    model.fit(X_train, y_train)

    train_preds = model.predict(X_train)
    test_preds = model.predict(X_test)

    train_r2 = float(r2_score(y_train, train_preds))
    test_r2 = float(r2_score(y_test, test_preds))
    train_mae = float(mean_absolute_error(y_train, train_preds))
    test_mae = float(mean_absolute_error(y_test, test_preds))
    train_rmse = float(root_mean_squared_error(y_train, train_preds))
    test_rmse = float(root_mean_squared_error(y_test, test_preds))

    cv_scores = cross_val_score(model, X_train, y_train, cv=cv_kfold, scoring="r2", n_jobs=-1)
    cv_r2_mean = float(np.mean(cv_scores))
    cv_r2_std = float(np.std(cv_scores))

    return {
        "train_r2": round(train_r2, 4),
        "test_r2": round(test_r2, 4),
        "train_mae": round(train_mae, 2),
        "test_mae": round(test_mae, 2),
        "train_rmse": round(train_rmse, 2),
        "test_rmse": round(test_rmse, 2),
        "cv_r2_mean": round(cv_r2_mean, 4),
        "cv_r2_std": round(cv_r2_std, 4),
        "train_test_r2_gap": round(train_r2 - test_r2, 4),
    }


def run_training_pipeline(data_path="data/insurance.csv", models_dir="models"):
    """
    Executes complete training, evaluation, comparison, tuning, and saving pipeline.
    """
    os.makedirs(models_dir, exist_ok=True)
    print("=" * 70)
    print("STEP 1 & 2: LOADING & INSPECTING CLEAN DATA")
    print("=" * 70)
    df = load_and_clean_data(data_path)
    _, outlier_stats = flag_charge_outliers(df)
    print(f"[*] Outlier Note: {outlier_stats['explanation']}")

    X = df.drop(columns=["charges"])
    y = df["charges"]

    # STEP 4: Stratified 80/20 train/test split on smoker
    print("\n" + "=" * 70)
    print("STEP 4: TRAIN/TEST SPLIT (80/20, Stratified on smoker, Seed=42)")
    print("=" * 70)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=RANDOM_STATE, stratify=X["smoker"]
    )
    print(f"[*] Training records: {X_train.shape[0]} | Testing records: {X_test.shape[0]}")
    print(f"[*] Train smoker ratio: {(X_train['smoker'] == 'yes').mean():.1%}")
    print(f"[*] Test smoker ratio:  {(X_test['smoker'] == 'yes').mean():.1%}")

    cv_kfold = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    # Candidate models for raw target
    raw_models = {
        "Linear Regression (Baseline)": LinearRegression(),
        "Random Forest": RandomForestRegressor(n_estimators=100, random_state=RANDOM_STATE),
        "Gradient Boosting": GradientBoostingRegressor(random_state=RANDOM_STATE),
        "XGBoost": XGBRegressor(n_estimators=100, random_state=RANDOM_STATE, verbosity=0),
    }

    results = {}
    print("\n" + "=" * 70)
    print("STEP 4 & 5: TRAINING & COMPARING MODELS (Raw Target vs Log1p Target)")
    print("=" * 70)

    # 1. Train on raw target
    for name, reg in raw_models.items():
        print(f"[*] Training {name} on raw target...")
        pipe = build_full_pipeline(regressor=reg)
        metrics = evaluate_model_performance(pipe, X_train, y_train, X_test, y_test, cv_kfold)
        metrics["target_transform"] = "raw"
        results[name] = metrics

    # 2. Train on log1p target with inverse expm1 transformation
    log_models = {
        "Linear Regression (Log Target)": LinearRegression(),
        "Random Forest (Log Target)": RandomForestRegressor(n_estimators=100, random_state=RANDOM_STATE),
        "Gradient Boosting (Log Target)": GradientBoostingRegressor(random_state=RANDOM_STATE),
        "XGBoost (Log Target)": XGBRegressor(n_estimators=100, random_state=RANDOM_STATE, verbosity=0),
    }

    for name, reg in log_models.items():
        print(f"[*] Training {name} on log1p target...")
        base_pipe = build_full_pipeline(regressor=reg)
        trans_pipe = TransformedTargetRegressor(
            regressor=base_pipe,
            func=np.log1p,
            inverse_func=np.expm1
        )
        metrics = evaluate_model_performance(trans_pipe, X_train, y_train, X_test, y_test, cv_kfold)
        metrics["target_transform"] = "log1p"
        results[name] = metrics

    # Display comparison table
    comparison_df = pd.DataFrame(results).T[[
        "cv_r2_mean", "cv_r2_std", "train_r2", "test_r2",
        "test_mae", "test_rmse", "train_test_r2_gap", "target_transform"
    ]]
    comparison_df.sort_values(by="cv_r2_mean", ascending=False, inplace=True)
    print("\n--- MODEL COMPARISON TABLE ---")
    print(comparison_df.to_string())

    # STEP 6: HYPERPARAMETER TUNING
    print("\n" + "=" * 70)
    print("STEP 6: HYPERPARAMETER TUNING (RandomizedSearchCV on top 2 models)")
    print("=" * 70)

    # Model 1: Gradient Boosting Pipeline
    gb_pipe = build_full_pipeline(regressor=GradientBoostingRegressor(random_state=RANDOM_STATE))
    gb_param_dist = {
        "regressor__n_estimators": [100, 150, 200, 250],
        "regressor__learning_rate": [0.03, 0.05, 0.08, 0.1],
        "regressor__max_depth": [2, 3, 4],
        "regressor__min_samples_split": [4, 6, 10],
        "regressor__min_samples_leaf": [2, 4, 6],
        "regressor__subsample": [0.8, 0.9, 1.0],
    }

    print("[*] Tuning Gradient Boosting...")
    search_gb = RandomizedSearchCV(
        gb_pipe,
        param_distributions=gb_param_dist,
        n_iter=25,
        cv=cv_kfold,
        scoring="r2",
        random_state=RANDOM_STATE,
        n_jobs=-1
    )
    search_gb.fit(X_train, y_train)
    gb_best_cv = float(search_gb.best_score_)
    print(f"    -> Best GB CV R2: {gb_best_cv:.4f}")
    print(f"    -> Best GB Params: {search_gb.best_params_}")

    # Model 2: Random Forest Pipeline
    rf_pipe = build_full_pipeline(regressor=RandomForestRegressor(random_state=RANDOM_STATE))
    rf_param_dist = {
        "regressor__n_estimators": [100, 150, 200],
        "regressor__max_depth": [3, 4, 5, 6],
        "regressor__min_samples_split": [4, 6, 10],
        "regressor__min_samples_leaf": [2, 4, 6],
        "regressor__max_features": ["sqrt", 0.7, 1.0],
    }

    print("[*] Tuning Random Forest...")
    search_rf = RandomizedSearchCV(
        rf_pipe,
        param_distributions=rf_param_dist,
        n_iter=20,
        cv=cv_kfold,
        scoring="r2",
        random_state=RANDOM_STATE,
        n_jobs=-1
    )
    search_rf.fit(X_train, y_train)
    rf_best_cv = float(search_rf.best_score_)
    print(f"    -> Best RF CV R2: {rf_best_cv:.4f}")
    print(f"    -> Best RF Params: {search_rf.best_params_}")

    # Choose final model strictly by CV R2 score
    if gb_best_cv >= rf_best_cv:
        best_search = search_gb
        final_model_name = "Tuned Gradient Boosting Regressor"
        best_params = search_gb.best_params_
    else:
        best_search = search_rf
        final_model_name = "Tuned Random Forest Regressor"
        best_params = search_rf.best_params_

    best_pipeline = best_search.best_estimator_
    print(f"\n[*] Final Selected Model: {final_model_name}")

    # Evaluate final model on test set
    final_metrics = evaluate_model_performance(best_pipeline, X_train, y_train, X_test, y_test, cv_kfold)
    final_metrics["model_name"] = final_model_name
    final_metrics["best_params"] = {k: str(v) for k, v in best_params.items()}
    results[final_model_name] = final_metrics

    print("\n--- FINAL MODEL TEST PERFORMANCE ---")
    print(f"Test R2 Score:  {final_metrics['test_r2']:.4f}")
    print(f"Test MAE:       ${final_metrics['test_mae']:.2f}")
    print(f"Test RMSE:      ${final_metrics['test_rmse']:.2f}")
    print(f"Train R2 Score: {final_metrics['train_r2']:.4f}")
    print(f"5-Fold CV R2:   {final_metrics['cv_r2_mean']:.4f} (+/- {final_metrics['cv_r2_std']:.4f})")
    print(f"Overfitting Gap (Train R2 - Test R2): {final_metrics['train_test_r2_gap']:.4f}")

    # Overfitting check comment
    if abs(final_metrics["train_test_r2_gap"]) < 0.08:
        overfit_comment = "Excellent generalization. The train/test gap is small, confirming shallow tree constraints successfully prevented overfitting on this 1,338-row dataset."
    else:
        overfit_comment = "Noticeable divergence between train and test scores indicating slight variance/overfitting."
    print(f"[*] Overfitting Diagnosis: {overfit_comment}")

    # STEP 7: FEATURE IMPORTANCE
    print("\n" + "=" * 70)
    print("STEP 7: FEATURE IMPORTANCE")
    print("=" * 70)
    preprocessor = best_pipeline.named_steps["preprocessor"]
    feature_names = preprocessor.get_feature_names_out()
    importances = best_pipeline.named_steps["regressor"].feature_importances_

    feature_imp_df = pd.DataFrame({
        "feature": feature_names,
        "importance": importances
    }).sort_values(by="importance", ascending=False).reset_index(drop=True)

    print(feature_imp_df.head(10).to_string())

    top_feature_list = feature_imp_df.to_dict(orient="records")

    # STEP 8: SAVE ARTIFACTS
    print("\n" + "=" * 70)
    print("STEP 8: SAVING TRAINED PIPELINE & METRICS")
    print("=" * 70)

    model_path = os.path.join(models_dir, "best_model.joblib")
    metrics_path = os.path.join(models_dir, "metrics.json")

    joblib.dump(best_pipeline, model_path)
    print(f"[*] Saved best pipeline to: {model_path}")

    # Save test sample predictions for evaluate.py and dashboard
    test_preds = best_pipeline.predict(X_test)
    eval_cache = {
        "y_test": y_test.tolist(),
        "y_pred": test_preds.tolist(),
        "residuals": (y_test - test_preds).tolist(),
    }
    with open(os.path.join(models_dir, "eval_cache.json"), "w") as f:
        json.dump(eval_cache, f, indent=2)

    export_metrics = {
        "final_model": final_model_name,
        "best_params": final_metrics["best_params"],
        "final_metrics": final_metrics,
        "overfitting_diagnosis": overfit_comment,
        "comparison_table": results,
        "feature_importances": top_feature_list,
        "outlier_stats": outlier_stats,
    }

    with open(metrics_path, "w") as f:
        json.dump(export_metrics, f, indent=2)
    print(f"[*] Saved metrics and artifacts to: {metrics_path}")

    print("\n[SUCCESS] Training pipeline completed successfully!")
    return best_pipeline, export_metrics


if __name__ == "__main__":
    run_training_pipeline()
