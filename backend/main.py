"""
FastAPI Backend for Medical Insurance Cost Prediction
Connects to trained Scikit-Learn pipeline and serves analytics for React frontend.
"""

import os
import sys
import json
from typing import Literal, Optional, List
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure root directory is in sys.path so src imports function without modifications
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from src.preprocess import MedicalInsuranceFeatureEngineer

app = FastAPI(
    title="Medical Insurance Cost Prediction API",
    description="High-performance REST API serving Scikit-Learn predictions, EDA, model benchmarks, and actuarial insights.",
    version="1.0.0"
)

# Enable CORS for React Frontend (supporting all local dev origins and ports)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175",
        "http://localhost:3000", "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for cached assets
MODEL = None
DATA_DF = None
METRICS_DATA = None
EVAL_CACHE = None


@app.on_event("startup")
def load_assets():
    """Load model, dataset, metrics, and eval cache once at application startup."""
    global MODEL, DATA_DF, METRICS_DATA, EVAL_CACHE
    
    model_path = os.path.join(ROOT_DIR, "models", "best_model.joblib")
    data_path = os.path.join(ROOT_DIR, "data", "insurance.csv")
    metrics_path = os.path.join(ROOT_DIR, "models", "metrics.json")
    eval_cache_path = os.path.join(ROOT_DIR, "models", "eval_cache.json")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}")
    MODEL = joblib.load(model_path)
    print(f"[*] Successfully loaded trained pipeline from {model_path}")

    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset file not found at {data_path}")
    DATA_DF = pd.read_csv(data_path).drop_duplicates().reset_index(drop=True)
    print(f"[*] Successfully loaded clean dataset: {len(DATA_DF)} records")

    if os.path.exists(metrics_path):
        with open(metrics_path, "r", encoding="utf-8") as f:
            METRICS_DATA = json.load(f)
        print(f"[*] Loaded metrics from {metrics_path}")

    if os.path.exists(eval_cache_path):
        with open(eval_cache_path, "r", encoding="utf-8") as f:
            EVAL_CACHE = json.load(f)
        print(f"[*] Loaded evaluation cache from {eval_cache_path}")


# ---------------------------------------------------------
# Pydantic Schemas for Request & Response
# ---------------------------------------------------------
class PredictRequest(BaseModel):
    age: int = Field(..., ge=18, le=100, description="Age in years (18-100)")
    sex: Literal["female", "male"] = Field(..., description="Biological sex ('female' or 'male')")
    bmi: float = Field(..., ge=10.0, le=60.0, description="Body Mass Index (10.0-60.0 kg/m²)")
    children: int = Field(..., ge=0, le=10, description="Number of dependent children (0-10)")
    smoker: Literal["no", "yes"] = Field(..., description="Tobacco smoking status ('no' or 'yes')")
    region: Literal["northeast", "northwest", "southeast", "southwest"] = Field(..., description="US geographic region")


class PredictResponse(BaseModel):
    predicted_cost: float
    risk_level: Literal["low", "medium", "high"]
    risk_label: str
    risk_badge_color: str
    average_cost_for_similar_profiles: float
    cohort_difference: float
    overall_dataset_average: float
    monthly_equivalent: float
    explanation: str
    input_received: PredictRequest


# ---------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------
@app.get("/api/health")
def health_check():
    """Verify backend status and assets loading."""
    return {
        "status": "healthy",
        "model_loaded": MODEL is not None,
        "dataset_records": len(DATA_DF) if DATA_DF is not None else 0,
        "metrics_loaded": METRICS_DATA is not None,
        "eval_cache_loaded": EVAL_CACHE is not None,
    }


@app.post("/api/predict", response_model=PredictResponse)
def predict_insurance_cost(payload: PredictRequest):
    """
    Executes identical prediction logic and cohort benchmarking as the Streamlit app.
    """
    if MODEL is None or DATA_DF is None:
        raise HTTPException(status_code=500, detail="Server assets not loaded.")

    # 1. Construct single-record DataFrame matching pipeline requirements
    input_data = pd.DataFrame([{
        "age": payload.age,
        "sex": payload.sex,
        "bmi": float(payload.bmi),
        "children": payload.children,
        "smoker": payload.smoker,
        "region": payload.region
    }])

    # 2. Execute pipeline inference
    try:
        raw_pred = float(MODEL.predict(input_data)[0])
        predicted_cost = round(max(0.0, raw_pred), 2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model inference failed: {str(e)}")

    # 3. Determine Risk Classification (matching Streamlit app criteria)
    if predicted_cost < 10000:
        risk_level = "low"
        risk_label = "LOW RISK PROFILE"
        risk_badge_color = "emerald"
        risk_desc = "Standard preventative healthcare exposure. Low historical probability of severe claims."
    elif predicted_cost <= 25000:
        risk_level = "medium"
        risk_label = "MODERATE RISK PROFILE"
        risk_badge_color = "amber"
        risk_desc = "Moderate actuarial risk. Typical for older age brackets or pre-obesity BMI ranges."
    else:
        risk_level = "high"
        risk_label = "HIGH RISK PROFILE"
        risk_badge_color = "rose"
        risk_desc = "Elevated actuarial risk profile primarily driven by tobacco use and/or clinical obesity."

    # 4. Cohort Benchmark Calculation (Same smoking status, Age +/- 5 years)
    cohort = DATA_DF[(DATA_DF["smoker"] == payload.smoker) & (DATA_DF["age"].between(payload.age - 5, payload.age + 5))]
    if len(cohort) > 0:
        cohort_avg = round(float(cohort["charges"].mean()), 2)
    else:
        cohort_avg = round(float(DATA_DF[DATA_DF["smoker"] == payload.smoker]["charges"].mean()), 2)

    overall_avg = round(float(DATA_DF["charges"].mean()), 2)
    cohort_diff = round(predicted_cost - cohort_avg, 2)
    monthly_cost = round(predicted_cost / 12, 2)

    # 5. Formulate plain-English actuarial explanation
    reasons = []
    if payload.smoker == "yes":
        reasons.append("active smoking status contributes approximately $15,000-$25,000 in baseline premium loading")
    else:
        reasons.append("non-smoker status preserves a favorable baseline health rate")

    if payload.bmi >= 30.0:
        if payload.smoker == "yes":
            reasons.append(f"BMI of {payload.bmi:.1f} triggers the high-risk obesity interaction threshold (BMI ≥ 30)")
        else:
            reasons.append(f"clinical obesity (BMI {payload.bmi:.1f} ≥ 30) adds moderate cardiovascular/metabolic risk")
    elif payload.bmi >= 25.0:
        reasons.append(f"BMI of {payload.bmi:.1f} is in the overweight bracket with mild premium impact")
    else:
        reasons.append(f"BMI of {payload.bmi:.1f} falls in the optimal healthy weight range")

    reasons.append(f"age ({payload.age} years) adds standard chronological healthcare cost progression (~$260/year)")

    explanation = f"Estimated based on: {'; '.join(reasons)}. {risk_desc}"

    return PredictResponse(
        predicted_cost=predicted_cost,
        risk_level=risk_level,
        risk_label=risk_label,
        risk_badge_color=risk_badge_color,
        average_cost_for_similar_profiles=cohort_avg,
        cohort_difference=cohort_diff,
        overall_dataset_average=overall_avg,
        monthly_equivalent=monthly_cost,
        explanation=explanation,
        input_received=payload
    )


@app.get("/api/eda")
def get_eda_data(
    region: Optional[List[str]] = Query(default=None),
    smoker: Optional[List[str]] = Query(default=None),
    age_min: Optional[int] = Query(default=None),
    age_max: Optional[int] = Query(default=None)
):
    """
    Computes sliced EDA dataset and distribution histograms for React interactive charts.
    """
    if DATA_DF is None:
        raise HTTPException(status_code=500, detail="Dataset not loaded.")

    filtered_df = DATA_DF.copy()

    if isinstance(region, list) and len(region) > 0:
        filtered_df = filtered_df[filtered_df["region"].isin(region)]
    elif isinstance(region, str):
        filtered_df = filtered_df[filtered_df["region"] == region]

    if isinstance(smoker, list) and len(smoker) > 0:
        filtered_df = filtered_df[filtered_df["smoker"].isin(smoker)]
    elif isinstance(smoker, str):
        filtered_df = filtered_df[filtered_df["smoker"] == smoker]

    if isinstance(age_min, int):
        filtered_df = filtered_df[filtered_df["age"] >= age_min]
    if isinstance(age_max, int):
        filtered_df = filtered_df[filtered_df["age"] <= age_max]

    total_records = len(filtered_df)
    if total_records == 0:
        return {
            "total_records": 0,
            "charges_distribution": [],
            "averages_by_category": {},
            "scatter_age": [],
            "scatter_bmi": [],
            "correlation_matrix": []
        }

    # 1. Charges Histogram (30 equal-width bins)
    charges = filtered_df["charges"].values
    min_c, max_c = float(np.min(charges)), float(np.max(charges))
    bins = np.linspace(min_c, max_c, 31)
    
    hist_data = []
    for i in range(len(bins) - 1):
        low, high = bins[i], bins[i + 1]
        mask = (charges >= low) & (charges <= high) if i == len(bins) - 2 else (charges >= low) & (charges < high)
        subset = filtered_df[mask]
        smokers_c = int((subset["smoker"] == "yes").sum())
        nonsmokers_c = int((subset["smoker"] == "no").sum())
        hist_data.append({
            "bin_label": f"${int(low):,}-${int(high):,}",
            "bin_center": round((low + high) / 2, 2),
            "total": int(len(subset)),
            "smokers": smokers_c,
            "non_smokers": nonsmokers_c,
        })

    # 2. Average charges by categorical variables
    averages_by_category = {
        "smoker": filtered_df.groupby("smoker")["charges"].agg(["mean", "median", "count"]).reset_index().rename(
            columns={"mean": "average", "smoker": "category"}
        ).round(2).to_dict(orient="records"),
        "sex": filtered_df.groupby("sex")["charges"].agg(["mean", "median", "count"]).reset_index().rename(
            columns={"mean": "average", "sex": "category"}
        ).round(2).to_dict(orient="records"),
        "region": filtered_df.groupby("region")["charges"].agg(["mean", "median", "count"]).reset_index().rename(
            columns={"mean": "average", "region": "category"}
        ).round(2).to_dict(orient="records"),
        "children": filtered_df.groupby("children")["charges"].agg(["mean", "median", "count"]).reset_index().rename(
            columns={"mean": "average", "children": "category"}
        ).round(2).to_dict(orient="records")
    }

    # 3. Scatter Points: Age vs Charges and BMI vs Charges
    # Downsample if too large, but 1338 is completely lightweight for React
    scatter_age = filtered_df[["age", "charges", "smoker", "bmi"]].rename(
        columns={"charges": "cost"}
    ).round({"cost": 2, "bmi": 2}).to_dict(orient="records")

    scatter_bmi = filtered_df[["bmi", "charges", "smoker", "age"]].rename(
        columns={"charges": "cost"}
    ).round({"cost": 2, "bmi": 2}).to_dict(orient="records")

    # 4. Correlation Matrix
    corr_df = filtered_df[["age", "bmi", "children", "charges"]].copy()
    corr_df["smoker"] = (filtered_df["smoker"] == "yes").astype(int)
    corr_df["sex"] = (filtered_df["sex"] == "male").astype(int)
    corr_matrix = corr_df.corr().round(3)
    
    correlation_list = []
    for var1 in corr_matrix.columns:
        for var2 in corr_matrix.columns:
            correlation_list.append({
                "var1": var1,
                "var2": var2,
                "correlation": float(corr_matrix.loc[var1, var2])
            })

    return {
        "total_records": total_records,
        "dataset_size_overall": len(DATA_DF),
        "mean_charges": round(float(filtered_df["charges"].mean()), 2),
        "median_charges": round(float(filtered_df["charges"].median()), 2),
        "min_charges": round(min_c, 2),
        "max_charges": round(max_c, 2),
        "charges_distribution": hist_data,
        "averages_by_category": averages_by_category,
        "scatter_age": scatter_age,
        "scatter_bmi": scatter_bmi,
        "correlation_matrix": correlation_list,
        "available_regions": list(DATA_DF["region"].unique()),
        "available_smokers": list(DATA_DF["smoker"].unique()),
        "age_bounds": {"min": int(DATA_DF["age"].min()), "max": int(DATA_DF["age"].max())}
    }


@app.get("/api/metrics")
def get_metrics_data():
    """
    Returns model benchmark leaderboard, final evaluation metrics,
    and predicted-vs-actual / residuals diagnostic points.
    """
    if METRICS_DATA is None:
        raise HTTPException(status_code=500, detail="Metrics data not loaded.")

    # Leaderboard comparison
    raw_comp = METRICS_DATA.get("comparison_table", {})
    leaderboard = []
    for name, metrics in raw_comp.items():
        leaderboard.append({
            "model_name": name,
            "cv_r2_mean": metrics.get("cv_r2_mean"),
            "cv_r2_std": metrics.get("cv_r2_std"),
            "train_r2": metrics.get("train_r2"),
            "test_r2": metrics.get("test_r2"),
            "test_mae": metrics.get("test_mae"),
            "test_rmse": metrics.get("test_rmse"),
            "train_test_r2_gap": metrics.get("train_test_r2_gap"),
            "target_transform": metrics.get("target_transform", "raw")
        })

    # Sort by cv_r2_mean descending
    leaderboard.sort(key=lambda x: x["cv_r2_mean"] if x["cv_r2_mean"] is not None else -1, reverse=True)

    # Diagnostic points from EVAL_CACHE
    pred_vs_actual = []
    residuals = []
    residual_hist = []

    if EVAL_CACHE:
        y_test = EVAL_CACHE.get("y_test", [])
        y_pred = EVAL_CACHE.get("y_pred", [])
        res = EVAL_CACHE.get("residuals", [])

        for i in range(len(y_test)):
            pred_vs_actual.append({
                "actual": round(float(y_test[i]), 2),
                "predicted": round(float(y_pred[i]), 2)
            })
            residuals.append({
                "predicted": round(float(y_pred[i]), 2),
                "residual": round(float(res[i]), 2)
            })

        # Residual distribution histogram (25 bins)
        res_arr = np.array(res)
        min_r, max_r = float(np.min(res_arr)), float(np.max(res_arr))
        r_bins = np.linspace(min_r, max_r, 26)
        for i in range(len(r_bins) - 1):
            low, high = r_bins[i], r_bins[i + 1]
            count = int(((res_arr >= low) & (res_arr < high)).sum())
            residual_hist.append({
                "bin_center": round((low + high) / 2, 2),
                "bin_label": f"${int(low):,}-${int(high):,}",
                "count": count
            })

    return {
        "final_model": METRICS_DATA.get("final_model"),
        "best_params": METRICS_DATA.get("best_params"),
        "final_metrics": METRICS_DATA.get("final_metrics"),
        "overfitting_diagnosis": METRICS_DATA.get("overfitting_diagnosis"),
        "leaderboard": leaderboard,
        "predicted_vs_actual": pred_vs_actual,
        "residuals": residuals,
        "residual_distribution": residual_hist
    }


@app.get("/api/insights")
def get_insights_data():
    """
    Returns feature importance rankings and structured actuarial takeaways.
    """
    if METRICS_DATA is None:
        raise HTTPException(status_code=500, detail="Metrics data not loaded.")

    raw_features = METRICS_DATA.get("feature_importances", [])
    
    # Feature descriptions mapping for non-technical users
    descriptions = {
        "smoker_x_bmi": "Interaction multiplier between tobacco use and BMI. Overweight smokers face compounding disease hazards.",
        "age": "Biological aging trajectory adding predictable base costs per calendar year.",
        "smoker_yes": "Direct baseline loading for tobacco consumption independent of body weight.",
        "bmi": "Direct physical weight contribution reflecting strain on cardiovascular and joint systems.",
        "children": "Marginal family dependent coverage adjustment.",
        "region_southwest": "Regional healthcare utilization and provider cost variances in the Southwest.",
        "region_northeast": "Regional billing and provider cost adjustments in the Northeast.",
        "sex_male": "Biological gender cost variance (statistically negligible across cohorts).",
        "bmi_category_Overweight": "Discrete risk tier for BMI between 25.0 and 29.9.",
        "age_group_45-54": "Mid-to-senior age demographic tier cost differential."
    }

    feature_importance_list = []
    for item in raw_features:
        f_name = item["feature"]
        importance_val = item["importance"]
        feature_importance_list.append({
            "feature": f_name,
            "importance": round(float(importance_val), 4),
            "percentage": round(float(importance_val) * 100, 2),
            "description": descriptions.get(f_name, "Model covariate contributing to cost estimation.")
        })

    key_findings = [
        {
            "id": "finding_1",
            "title": "The Smoker × BMI Compounding Risk Factor",
            "stat": "80.03% Importance",
            "summary": "The interaction feature smoker_x_bmi accounts for 80.03% of total predictive power. Non-smokers with high BMI see gradual cost escalation, whereas smokers who cross the clinical obesity threshold (BMI ≥ 30) experience an immediate non-linear surge into the $35,000–$50,000 range.",
            "type": "primary"
        },
        {
            "id": "finding_2",
            "title": "Predictable Biological Aging Trajectory",
            "stat": "11.09% Importance",
            "summary": "Chronological age is the second most impactful factor, adding approximately $250–$280 in baseline annual medical expenditure per year of life across all demographics.",
            "type": "secondary"
        },
        {
            "id": "finding_3",
            "title": "Demographic Parity Across Gender and Region",
            "stat": "< 0.4% Importance",
            "summary": "Biological gender and geographic region combined contribute less than 0.4% to predictive variance. Healthcare costs in this population are driven by biometrics and behavioral choices rather than location or sex.",
            "type": "neutral"
        },
        {
            "id": "finding_4",
            "title": "Clinical Smoking Cessation Benefit",
            "stat": "~$24,000/yr Savings",
            "summary": "Transitioning from smoking to non-smoking reduces forecasted annual premium liability by $15,000 to over $30,000 for individuals with high BMIs.",
            "type": "actionable"
        }
    ]

    return {
        "final_model": METRICS_DATA.get("final_model"),
        "feature_importance": feature_importance_list,
        "key_findings": key_findings
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
