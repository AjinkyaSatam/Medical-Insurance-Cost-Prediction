"""
Medical Insurance Cost Prediction - Core Feature Functions
Module: backend/features.py

Reusable, standalone business logic functions for:
1. compute_range: 95% approximate predictive interval from test residuals
2. compute_contributions: Feature contribution breakdown (coef * (x - mean_x))
3. compute_whatif: Counterfactual what-if simulation scenarios
4. compute_suggestions: Actionable, supportive cost-lowering recommendations
5. compute_risk_level / risk_level: Empirical percentile-based risk categorization
6. calculate_bmi: Height/Weight BMI formula with WHO and Indian cutoff explanations

Designed for single-record API predictions and reusable for bulk CSV evaluations.
"""

import math
import numpy as np
import pandas as pd
from backend.config import (
    USD_TO_INR_RATE,
    INDIA_COST_FACTOR,
    TARGET_BMI_UNDER_30,
    TARGET_BMI_NORMAL,
    TARGET_BMI_OBESE_THRESHOLD,
    TARGET_BMI_NORMAL_THRESHOLD,
    RISK_THRESHOLD_LOW_USD,
    RISK_THRESHOLD_HIGH_USD,
    RESIDUAL_STD_USD,
)


def to_inr(usd_val: float) -> float:
    """
    Converts USD amount to Estimated India-adjusted INR:
    estimated_inr = predicted_usd * USD_TO_INR_RATE * INDIA_COST_FACTOR
    """
    if usd_val is None or math.isnan(usd_val):
        return 0.0
    return round(float(usd_val) * USD_TO_INR_RATE * INDIA_COST_FACTOR, 2)


# ---------------------------------------------------------------------------
# 1. ESTIMATED RANGE (FEATURE 1)
# ---------------------------------------------------------------------------
def compute_range(predicted_usd: float, residual_std_usd: float = RESIDUAL_STD_USD) -> dict:
    """
    Computes approximate predictive range:
    prediction +/- 1.96 * residual standard deviation (from hold-out test residuals),
    floored at zero, converted to INR.
    
    Formula:
        low  = max(0.0, prediction - 1.96 * s_e)
        high = max(0.0, prediction + 1.96 * s_e)
    """
    std_val = float(residual_std_usd if residual_std_usd is not None else RESIDUAL_STD_USD)
    margin_usd = 1.96 * std_val

    low_usd = max(0.0, float(predicted_usd) - margin_usd)
    high_usd = max(0.0, float(predicted_usd) + margin_usd)

    low_inr = to_inr(low_usd)
    high_inr = to_inr(high_usd)
    margin_inr = to_inr(margin_usd)

    return {
        "low": low_inr,
        "high": high_inr,
        "low_usd": round(low_usd, 2),
        "high_usd": round(high_usd, 2),
        "low_inr": low_inr,
        "high_inr": high_inr,
        "margin_usd": round(margin_usd, 2),
        "margin_inr": margin_inr,
        "residual_std_usd": round(std_val, 2),
        "multiplier": 1.96,
        "explanation": (
            "Approximate range represents an empirical 95% interval derived from the model's "
            f"typical hold-out test error standard deviation ($3,802.71 / ₹{to_inr(3802.71):,.0f})."
        ),
    }


# ---------------------------------------------------------------------------
# 2. RISK LEVEL (SHARED HELPER)
# ---------------------------------------------------------------------------
def risk_level(predicted_cost: float) -> str:
    """
    Assigns an empirical risk tier ('low', 'medium', 'high') using fixed cut-offs:
    - Low Risk:    < 33rd percentile of training charges ($6,389.38)
    - Medium Risk: 33rd to 66th percentile ($6,389.38 to $13,012.21)
    - High Risk:   > 66th percentile of training charges ($13,012.21)

    Note: This is a rule-based grouping derived from training charge distribution,
    NOT an ML classifier.
    """
    pred = float(predicted_cost)
    if pred < RISK_THRESHOLD_LOW_USD:
        return "low"
    elif pred <= RISK_THRESHOLD_HIGH_USD:
        return "medium"
    else:
        return "high"


def compute_risk_level(predicted_usd: float) -> dict:
    """
    Detailed presentation metadata for the risk tier calculated by risk_level(predicted_cost).
    Returns tier label, badge color, thresholds used, and narrative explanation.
    """
    tier = risk_level(predicted_usd)

    if tier == "low":
        return {
            "risk_level": "low",
            "risk_label": "LOW RISK PROFILE",
            "risk_badge_color": "emerald",
            "threshold_used_usd": RISK_THRESHOLD_LOW_USD,
            "threshold_used_inr": to_inr(RISK_THRESHOLD_LOW_USD),
            "tier_description": (
                f"Predicted charges are below the 33rd percentile ($6,389 / ₹{to_inr(RISK_THRESHOLD_LOW_USD):,.0f}) "
                "of historical data. Typical for young, non-smoking individuals."
            ),
        }
    elif tier == "medium":
        return {
            "risk_level": "medium",
            "risk_label": "MODERATE RISK PROFILE",
            "risk_badge_color": "amber",
            "threshold_used_usd": RISK_THRESHOLD_HIGH_USD,
            "threshold_used_inr": to_inr(RISK_THRESHOLD_HIGH_USD),
            "tier_description": (
                f"Predicted charges fall between the 33rd and 66th percentiles ($6,389–$13,012 / "
                f"₹{to_inr(RISK_THRESHOLD_LOW_USD):,.0f}–₹{to_inr(RISK_THRESHOLD_HIGH_USD):,.0f}). "
                "Typical for middle-aged adults with standard health baseline."
            ),
        }
    else:
        return {
            "risk_level": "high",
            "risk_label": "HIGH RISK PROFILE",
            "risk_badge_color": "rose",
            "threshold_used_usd": RISK_THRESHOLD_HIGH_USD,
            "threshold_used_inr": to_inr(RISK_THRESHOLD_HIGH_USD),
            "tier_description": (
                f"Predicted charges exceed the 66th percentile ($13,012 / ₹{to_inr(RISK_THRESHOLD_HIGH_USD):,.0f}). "
                "Driven primarily by active smoking status and/or clinical obesity."
            ),
        }


# ---------------------------------------------------------------------------
# 3. FACTOR CONTRIBUTIONS BREAKDOWN (FEATURE 2)
# ---------------------------------------------------------------------------
def compute_contributions(
    person_dict: dict,
    pipeline,
    training_means: np.ndarray,
    feature_names: list,
    coefs: np.ndarray,
    intercept: float
) -> dict:
    """
    Computes each input's mathematical contribution to this individual's estimate,
    relative to the average training profile:
        contribution_j = coef_j * (x_j - mean_x_j)
        
    Transformed columns are grouped back to the 6 original inputs:
    - age (age, age_group_*)
    - sex (sex_male)
    - bmi (bmi, obese, bmi_category_*)
    - children (children)
    - smoker (smoker_yes)
    - region (region_*)
    The interaction term smoker_x_bmi is attributed 50% to smoker and 50% to bmi.
    
    Mathematical Invariant Verified:
        average_prediction + sum(contributions) == person_prediction
    """
    # 1. Transform single person input
    person_df = pd.DataFrame([{
        "age": int(person_dict["age"]),
        "sex": str(person_dict["sex"]),
        "bmi": float(person_dict["bmi"]),
        "children": int(person_dict["children"]),
        "smoker": str(person_dict["smoker"]),
        "region": str(person_dict["region"]),
    }])

    # Preprocessing pipeline (feature engineer + ColumnTransformer)
    transformed_x = pipeline[:-1].transform(person_df)[0]
    person_pred_usd = float(pipeline.predict(person_df)[0])

    # 2. Base prediction for the average profile across training dataset
    # base_pred = intercept + sum(coefs * training_means)
    base_pred_usd = float(intercept + np.dot(coefs, training_means))

    # 3. Calculate column-level contributions
    diff_from_mean = transformed_x - training_means
    col_contributions = coefs * diff_from_mean

    # 4. Group back to original 6 inputs
    grouped = {
        "age": 0.0,
        "sex": 0.0,
        "bmi": 0.0,
        "children": 0.0,
        "smoker": 0.0,
        "region": 0.0,
    }

    field_labels = {
        "age": "Age & Chronological Progression",
        "sex": "Biological Sex",
        "bmi": "Body Mass Index & Obesity Tier",
        "children": "Dependent Children Count",
        "smoker": "Tobacco Smoking Status",
        "region": "US Dataset Region",
    }

    for name, contrib in zip(feature_names, col_contributions):
        val = float(contrib)
        if name.startswith("age"):
            grouped["age"] += val
        elif name.startswith("sex"):
            grouped["sex"] += val
        elif name.startswith("bmi"):
            grouped["bmi"] += val
        elif name == "obese":
            grouped["bmi"] += val
        elif name.startswith("region"):
            grouped["region"] += val
        elif name == "children":
            grouped["children"] += val
        elif name == "smoker_yes":
            grouped["smoker"] += val
        elif name == "smoker_x_bmi":
            # Joint interaction term: 50% to smoker, 50% to bmi
            grouped["smoker"] += 0.5 * val
            grouped["bmi"] += 0.5 * val
        else:
            # Fallback
            if "smoker" in name:
                grouped["smoker"] += val
            elif "bmi" in name:
                grouped["bmi"] += val
            elif "age" in name:
                grouped["age"] += val
            else:
                grouped["region"] += val

    # 5. Verify mathematical identity
    total_grouped_contributions = sum(grouped.values())
    reconstructed_pred = base_pred_usd + total_grouped_contributions
    error = abs(reconstructed_pred - person_pred_usd)
    is_verified = error < 0.05

    # 6. Format result items
    items = []
    for field, amount_usd in grouped.items():
        c_usd = round(amount_usd, 2)
        c_inr = to_inr(c_usd)
        items.append({
            "field": field,
            "label": field_labels.get(field, field.capitalize()),
            "contribution_usd": c_usd,
            "contribution_inr": c_inr,
            "impact": "increases" if c_usd >= 0 else "decreases",
            "sign": "+" if c_usd >= 0 else "-",
            "abs_contribution_usd": abs(c_usd),
            "abs_contribution_inr": abs(c_inr),
        })

    # Sort descending by absolute impact
    items.sort(key=lambda x: x["abs_contribution_usd"], reverse=True)

    return {
        "base_prediction_usd": round(base_pred_usd, 2),
        "base_prediction_inr": to_inr(base_pred_usd),
        "person_prediction_usd": round(person_pred_usd, 2),
        "person_prediction_inr": to_inr(person_pred_usd),
        "total_contributions_usd": round(total_grouped_contributions, 2),
        "total_contributions_inr": to_inr(total_grouped_contributions),
        "contributions": items,
        "is_mathematically_verified": is_verified,
        "verification_delta_usd": round(error, 6),
    }


# ---------------------------------------------------------------------------
# 4. WHAT-IF SCENARIOS (FEATURE 3)
# ---------------------------------------------------------------------------
def compute_whatif(person_dict: dict, pipeline) -> list:
    """
    Simulates counterfactual what-if scenarios by re-running the saved pipeline
    with exactly ONE input changed:
      a) smoker -> non-smoker (only if currently smoker == 'yes')
      b) BMI reduced to under 30 (only if currently bmi >= 30.0)
      c) BMI reduced to 24.9 (only if currently bmi > 24.9)
      
    Returns a scenario ONLY if the simulated cost saving is strictly greater than 0.
    """
    # Baseline prediction for this person
    base_df = pd.DataFrame([{
        "age": int(person_dict["age"]),
        "sex": str(person_dict["sex"]),
        "bmi": float(person_dict["bmi"]),
        "children": int(person_dict["children"]),
        "smoker": str(person_dict["smoker"]),
        "region": str(person_dict["region"]),
    }])
    current_cost_usd = float(pipeline.predict(base_df)[0])
    current_cost_inr = to_inr(current_cost_usd)

    scenarios = []

    # Scenario A: Smoking Cessation (if currently smoker)
    if str(person_dict.get("smoker", "")).lower() == "yes":
        mod_df = base_df.copy()
        mod_df["smoker"] = "no"
        new_cost_usd = float(pipeline.predict(mod_df)[0])
        saving_usd = current_cost_usd - new_cost_usd
        if saving_usd > 0.01:
            new_cost_inr = to_inr(new_cost_usd)
            saving_inr = current_cost_inr - new_cost_inr
            scenarios.append({
                "id": "quit_smoking",
                "title": "Smoking Cessation",
                "action": "Quit smoking completely",
                "parameter_changed": "smoker",
                "before_value": "Smoker (Yes)",
                "after_value": "Non-Smoker (No)",
                "current_cost_usd": round(current_cost_usd, 2),
                "current_cost_inr": current_cost_inr,
                "new_cost_usd": round(new_cost_usd, 2),
                "new_cost_inr": new_cost_inr,
                "new_estimate_usd": round(new_cost_usd, 2),
                "new_estimate_inr": new_cost_inr,
                "saving_usd": round(saving_usd, 2),
                "saving_inr": saving_inr,
                "note": "Model-based estimate of an association in the dataset, not a guarantee.",
            })

    # Scenario B: Reduce BMI below 30 (if currently BMI >= 30.0)
    current_bmi = float(person_dict.get("bmi", 0.0))
    if current_bmi >= 30.0:
        mod_df = base_df.copy()
        mod_df["bmi"] = TARGET_BMI_UNDER_30  # 29.9
        new_cost_usd = float(pipeline.predict(mod_df)[0])
        saving_usd = current_cost_usd - new_cost_usd
        if saving_usd > 0.01:
            new_cost_inr = to_inr(new_cost_usd)
            saving_inr = current_cost_inr - new_cost_inr
            scenarios.append({
                "id": "reduce_bmi_under_30",
                "title": "Cross Below Obesity Threshold",
                "action": f"Reduce BMI to under 30 ({TARGET_BMI_UNDER_30} kg/m²)",
                "parameter_changed": "bmi",
                "before_value": f"{current_bmi:.1f} kg/m² (Clinically Obese)",
                "after_value": f"{TARGET_BMI_UNDER_30:.1f} kg/m² (Overweight)",
                "current_cost_usd": round(current_cost_usd, 2),
                "current_cost_inr": current_cost_inr,
                "new_cost_usd": round(new_cost_usd, 2),
                "new_cost_inr": new_cost_inr,
                "new_estimate_usd": round(new_cost_usd, 2),
                "new_estimate_inr": new_cost_inr,
                "saving_usd": round(saving_usd, 2),
                "saving_inr": saving_inr,
                "note": "Model-based estimate of an association in the dataset, not a guarantee.",
            })

    # Scenario C: Reach Normal Weight (if currently BMI > 24.9)
    if current_bmi > TARGET_BMI_NORMAL:
        mod_df = base_df.copy()
        mod_df["bmi"] = TARGET_BMI_NORMAL  # 24.9
        new_cost_usd = float(pipeline.predict(mod_df)[0])
        saving_usd = current_cost_usd - new_cost_usd
        if saving_usd > 0.01:
            new_cost_inr = to_inr(new_cost_usd)
            saving_inr = current_cost_inr - new_cost_inr
            scenarios.append({
                "id": "reach_normal_bmi",
                "title": "Achieve Normal BMI Range",
                "action": f"Reduce BMI to normal threshold ({TARGET_BMI_NORMAL} kg/m²)",
                "parameter_changed": "bmi",
                "before_value": f"{current_bmi:.1f} kg/m²",
                "after_value": f"{TARGET_BMI_NORMAL:.1f} kg/m² (Normal)",
                "current_cost_usd": round(current_cost_usd, 2),
                "current_cost_inr": current_cost_inr,
                "new_cost_usd": round(new_cost_usd, 2),
                "new_cost_inr": new_cost_inr,
                "new_estimate_usd": round(new_cost_usd, 2),
                "new_estimate_inr": new_cost_inr,
                "saving_usd": round(saving_usd, 2),
                "saving_inr": saving_inr,
                "note": "Model-based estimate of an association in the dataset, not a guarantee.",
            })

    # Sort scenarios by saving descending
    scenarios.sort(key=lambda x: x["saving_usd"], reverse=True)
    return scenarios


# ---------------------------------------------------------------------------
# 5. ACTIONABLE RECOMMENDATIONS / HOW TO LOWER (FEATURE 5)
# ---------------------------------------------------------------------------
def compute_suggestions(whatif_scenarios: list, person_dict: dict) -> dict:
    """
    Constructs actionable, respectful guidance on how a customer can lower their estimate,
    derived directly from the what-if results and rules (no new ML model).
    
    Principles:
    - Lists changeable factors only (smoking status, BMI).
    - Clarifies that unchangeable factors (age, sex, region, children) are not judged.
    - Supportive, neutral tone with no shaming language.
    - Disclaims that estimates are general information, not medical advice.
    """
    actionable_items = []

    for sc in whatif_scenarios:
        if sc["id"] == "quit_smoking":
            actionable_items.append({
                "title": "Tobacco Cessation",
                "suggestion": f"Quit smoking: could lower your annual estimate by about ₹{sc['saving_inr']:,.0f} (${sc['saving_usd']:,.2f}).",
                "saving_inr": sc["saving_inr"],
                "saving_usd": sc["saving_usd"],
                "icon": "shield",
            })
        elif sc["id"] == "reduce_bmi_under_30":
            actionable_items.append({
                "title": "Obesity Step De-escalation",
                "suggestion": f"Lower BMI below 30 ({TARGET_BMI_OBESE_THRESHOLD} kg/m²): could lower your estimate by about ₹{sc['saving_inr']:,.0f} (${sc['saving_usd']:,.2f}) by exiting the high-risk interaction step.",
                "saving_inr": sc["saving_inr"],
                "saving_usd": sc["saving_usd"],
                "icon": "trending-down",
            })
        elif sc["id"] == "reach_normal_bmi":
            actionable_items.append({
                "title": "Healthy BMI Range",
                "suggestion": f"Reach the normal BMI boundary ({TARGET_BMI_NORMAL_THRESHOLD} kg/m²): could lower your estimate by about ₹{sc['saving_inr']:,.0f} (${sc['saving_usd']:,.2f}).",
                "saving_inr": sc["saving_inr"],
                "saving_usd": sc["saving_usd"],
                "icon": "heart",
            })

    # Sort by saving descending
    actionable_items.sort(key=lambda x: x["saving_usd"], reverse=True)

    has_actions = len(actionable_items) > 0
    empty_message = "Your profile has no major modifiable cost drivers in this model. You are already in the favorable non-smoking and healthy-weight tier."

    unchangeable_note = (
        "Note on fixed factors: Age, biological sex, US dataset region, and dependent children "
        "cannot and should not be changed. They represent standard demographic context and are not judged."
    )

    disclaimer = "General information only, not medical advice. Consult a doctor before making health changes."

    return {
        "has_modifiable_factors": has_actions,
        "items": actionable_items,
        "positive_message": empty_message if not has_actions else None,
        "unchangeable_factors_note": unchangeable_note,
        "medical_disclaimer": disclaimer,
    }


# ---------------------------------------------------------------------------
# 6. BMI CALCULATOR (FEATURE 4)
# ---------------------------------------------------------------------------
def calculate_bmi(height_cm: float, weight_kg: float) -> dict:
    """
    Calculates BMI: weight / (height/100)^2, rounded to 1 decimal.
    Validates ranges: height 100-250 cm, weight 20-300 kg.
    Provides WHO standard categories and highlights Indian/Asian consensus guidelines.
    """
    if height_cm < 100 or height_cm > 250:
        raise ValueError(f"Height must be between 100 and 250 cm. Received: {height_cm}")
    if weight_kg < 20 or weight_kg > 300:
        raise ValueError(f"Weight must be between 20 and 300 kg. Received: {weight_kg}")

    height_m = height_cm / 100.0
    raw_bmi = weight_kg / (height_m ** 2)
    bmi = round(raw_bmi, 1)

    # WHO Standard (used in US dataset)
    if bmi < 18.5:
        who_category = "Underweight"
        who_badge = "amber"
    elif bmi <= 24.9:
        who_category = "Normal weight"
        who_badge = "emerald"
    elif bmi <= 29.9:
        who_category = "Overweight"
        who_badge = "amber"
    else:
        who_category = "Clinically Obese (BMI ≥ 30)"
        who_badge = "rose"

    # Indian Guidelines (ICMR / Ministry of Health Consensus)
    # Uses cutoffs of 23 for overweight and 25 for obesity
    if bmi < 18.5:
        indian_category = "Underweight"
    elif bmi <= 22.9:
        indian_category = "Normal weight"
    elif bmi <= 24.9:
        indian_category = "Overweight"
    else:
        indian_category = "Obese"

    indian_guidelines_note = (
        "Note on Indian Guidelines: Consensus guidelines for Asian Indians (ICMR & Ministry of Health) "
        "define overweight at BMI ≥ 23 kg/m² and obesity at BMI ≥ 25 kg/m² (compared to Western/WHO cutoffs "
        "of 25 and 30) due to higher body fat percentage and cardiovascular risk at lower BMIs in South Asian populations."
    )

    return {
        "height_cm": height_cm,
        "weight_kg": weight_kg,
        "bmi": bmi,
        "who_category": who_category,
        "who_badge": who_badge,
        "indian_category": indian_category,
        "indian_guidelines_note": indian_guidelines_note,
    }


# ---------------------------------------------------------------------------
# 7. BULK CSV RECORD NORMALIZATION & PREDICTION (BATCH FEATURE)
# ---------------------------------------------------------------------------
def normalize_sex(val: str) -> str:
    """Normalizes sex to 'male' or 'female' (accepts male/female/m/f, case-insensitive)."""
    s = str(val).strip().lower()
    if s in ("male", "m"):
        return "male"
    elif s in ("female", "f"):
        return "female"
    raise ValueError(f"Invalid biological sex '{val}'. Expected 'male', 'female', 'm', or 'f'.")


def normalize_smoker(val: str) -> str:
    """Normalizes smoker status to 'yes' or 'no' (accepts yes/no/y/n/true/false/1/0)."""
    s = str(val).strip().lower()
    if s in ("yes", "y", "true", "1"):
        return "yes"
    elif s in ("no", "n", "false", "0"):
        return "no"
    raise ValueError(f"Invalid smoking status '{val}'. Expected 'yes', 'no', 'y', 'n', 'true', or 'false'.")


def normalize_region(val: str) -> str:
    """Normalizes region to lowercase quadrant ('southwest', 'southeast', 'northwest', 'northeast')."""
    s = str(val).strip().lower()
    if s in ("southwest", "southeast", "northwest", "northeast"):
        return s
    raise ValueError(f"Invalid region '{val}'. Expected 'southwest', 'southeast', 'northwest', or 'northeast'.")


def validate_and_normalize_row(raw_row: dict, row_num: int) -> tuple:
    """
    Validates a single CSV record against domain constraints.
    Returns:
      (normalized_dict, None) if valid
      (None, list_of_errors) if invalid
    Each error item has: {"row": row_num, "column": col, "reason": reason}
    """
    cleaned_row = {
        str(k).strip().lower(): (str(v).strip() if v is not None else "")
        for k, v in raw_row.items()
        if k is not None
    }
    errors = []

    # Optional name
    name = cleaned_row.get("name", "")

    # 1. Age (18 - 100)
    age_str = cleaned_row.get("age", "")
    age_val = None
    if not age_str:
        errors.append({"row": row_num, "column": "age", "reason": "Age is required and cannot be blank."})
    else:
        try:
            age_val = int(float(age_str))
            if age_val < 18 or age_val > 100:
                errors.append({"row": row_num, "column": "age", "reason": f"Age must be between 18 and 100 years (received {age_val})."})
        except (ValueError, TypeError):
            errors.append({"row": row_num, "column": "age", "reason": f"Age must be a valid integer number (received '{age_str}')."})

    # 2. Sex (male/female)
    sex_str = cleaned_row.get("sex", "")
    sex_val = None
    if not sex_str:
        errors.append({"row": row_num, "column": "sex", "reason": "Sex is required and cannot be blank."})
    else:
        try:
            sex_val = normalize_sex(sex_str)
        except ValueError as e:
            errors.append({"row": row_num, "column": "sex", "reason": str(e)})

    # 3. BMI (10.0 - 60.0) or derive from height_cm (100-250) and weight_kg (20-300)
    bmi_str = cleaned_row.get("bmi", "")
    bmi_val = None
    if bmi_str:
        try:
            bmi_val = round(float(bmi_str), 1)
            if bmi_val < 10.0 or bmi_val > 60.0:
                errors.append({"row": row_num, "column": "bmi", "reason": f"BMI must be between 10.0 and 60.0 kg/m² (received {bmi_val})."})
        except (ValueError, TypeError):
            errors.append({"row": row_num, "column": "bmi", "reason": f"BMI must be a valid numerical value (received '{bmi_str}')."})
    else:
        # Check height_cm and weight_kg fallback
        h_str = cleaned_row.get("height_cm", "")
        w_str = cleaned_row.get("weight_kg", "")
        if h_str and w_str:
            try:
                h_val = float(h_str)
                w_val = float(w_str)
                bmi_calc = calculate_bmi(h_val, w_val)
                bmi_val = bmi_calc["bmi"]
            except ValueError as e:
                errors.append({"row": row_num, "column": "bmi", "reason": f"Cannot derive BMI from height/weight: {str(e)}"})
        else:
            errors.append({"row": row_num, "column": "bmi", "reason": "BMI is required (or provide height_cm and weight_kg)."})

    # 4. Children (0 - 10)
    children_str = cleaned_row.get("children", "")
    children_val = None
    if children_str == "":
        errors.append({"row": row_num, "column": "children", "reason": "Children count is required and cannot be blank."})
    else:
        try:
            children_val = int(float(children_str))
            if children_val < 0 or children_val > 10:
                errors.append({"row": row_num, "column": "children", "reason": f"Children count must be between 0 and 10 (received {children_val})."})
        except (ValueError, TypeError):
            errors.append({"row": row_num, "column": "children", "reason": f"Children must be a valid integer number (received '{children_str}')."})

    # 5. Smoker (yes/no)
    smoker_str = cleaned_row.get("smoker", "")
    smoker_val = None
    if not smoker_str:
        errors.append({"row": row_num, "column": "smoker", "reason": "Smoker status is required and cannot be blank."})
    else:
        try:
            smoker_val = normalize_smoker(smoker_str)
        except ValueError as e:
            errors.append({"row": row_num, "column": "smoker", "reason": str(e)})

    # 6. Region (southwest/southeast/northwest/northeast)
    region_str = cleaned_row.get("region", "")
    region_val = None
    if not region_str:
        errors.append({"row": row_num, "column": "region", "reason": "Region is required and cannot be blank."})
    else:
        try:
            region_val = normalize_region(region_str)
        except ValueError as e:
            errors.append({"row": row_num, "column": "region", "reason": str(e)})

    if errors:
        return None, errors

    normalized_record = {
        "name": name,
        "age": age_val,
        "sex": sex_val,
        "bmi": bmi_val,
        "children": children_val,
        "smoker": smoker_val,
        "region": region_val,
    }
    return normalized_record, []


def process_single_record(
    person_dict: dict,
    pipeline,
    training_means: np.ndarray,
    feature_names: list,
    coefs: np.ndarray,
    intercept: float,
) -> dict:
    """
    Evaluates one beneficiary profile using the Linear Regression pipeline and features.py helpers.
    Guarantees exact mathematical agreement between single /api/predict and bulk /api/predict-batch results.
    """
    # 1. Pipeline prediction
    input_df = pd.DataFrame([{
        "age": int(person_dict["age"]),
        "sex": str(person_dict["sex"]),
        "bmi": float(person_dict["bmi"]),
        "children": int(person_dict["children"]),
        "smoker": str(person_dict["smoker"]),
        "region": str(person_dict["region"]),
    }])
    raw_pred = float(pipeline.predict(input_df)[0])
    predicted_usd = round(max(0.0, raw_pred), 2)
    estimated_inr = to_inr(predicted_usd)

    # 2. Predictive range (Feature 1)
    range_data = compute_range(predicted_usd, RESIDUAL_STD_USD)

    # 3. Risk tier (Rule-based empirical grouping)
    tier = risk_level(predicted_usd)

    # 4. Factor contributions (Feature 2)
    contrib_data = compute_contributions(
        person_dict=person_dict,
        pipeline=pipeline,
        training_means=training_means,
        feature_names=feature_names,
        coefs=coefs,
        intercept=intercept,
    )
    # Find top cost driver (largest positive contribution)
    positives = [c for c in contrib_data["contributions"] if c["contribution_usd"] > 0]
    if positives:
        positives.sort(key=lambda x: x["contribution_usd"], reverse=True)
        top_driver = positives[0]["label"]
    else:
        top_driver = "None (All factors below average)"

    # 5. What-if counterfactuals (Feature 3) & suggestions (Feature 5)
    whatif_scenarios = compute_whatif(person_dict=person_dict, pipeline=pipeline)
    sug_data = compute_suggestions(whatif_scenarios=whatif_scenarios, person_dict=person_dict)
    if sug_data["items"]:
        short_suggestion = sug_data["items"][0]["suggestion"]
    else:
        short_suggestion = sug_data.get("positive_message") or "Optimal profile (no modifiable cost drivers)"

    return {
        "name": person_dict.get("name", ""),
        "age": person_dict["age"],
        "sex": person_dict["sex"],
        "bmi": person_dict["bmi"],
        "children": person_dict["children"],
        "smoker": person_dict["smoker"],
        "region": person_dict["region"],
        "predicted_usd": predicted_usd,
        "estimated_cost": estimated_inr,
        "estimated_cost_inr": estimated_inr,
        "estimated_cost_usd": predicted_usd,
        "low": range_data["low"],
        "high": range_data["high"],
        "low_usd": range_data["low_usd"],
        "high_usd": range_data["high_usd"],
        "risk_level": tier,
        "top_cost_driver": top_driver,
        "short_suggestion": short_suggestion,
        "range": range_data,
        "breakdown": contrib_data,
        "whatif": whatif_scenarios,
        "suggestions": sug_data,
    }
