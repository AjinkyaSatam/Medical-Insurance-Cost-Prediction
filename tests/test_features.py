"""
Unit & Integration Tests for Medical Insurance Cost Features (Features 1 - 5 & Risk Level)
Using pytest.
"""

import os
import sys
import joblib
import numpy as np
import pandas as pd
import pytest

# Ensure repository root is on sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from src.preprocess import MedicalInsuranceFeatureEngineer
from backend.config import (
    USD_TO_INR_RATE,
    INDIA_COST_FACTOR,
    TARGET_BMI_UNDER_30,
    TARGET_BMI_NORMAL,
    RISK_THRESHOLD_LOW_USD,
    RISK_THRESHOLD_HIGH_USD,
    RESIDUAL_STD_USD,
)
from backend.features import (
    to_inr,
    compute_range,
    risk_level,
    compute_risk_level,
    compute_contributions,
    compute_whatif,
    compute_suggestions,
    calculate_bmi,
)


@pytest.fixture(scope="module")
def model():
    model_path = os.path.join(ROOT_DIR, "models", "best_model.joblib")
    assert os.path.exists(model_path), f"Model not found at {model_path}"
    return joblib.load(model_path)


@pytest.fixture(scope="module")
def model_assets(model):
    """Computes training means, coefficients, and feature names for contribution tests."""
    data_path = os.path.join(ROOT_DIR, "data", "insurance.csv")
    df = pd.read_csv(data_path).drop_duplicates().reset_index(drop=True)
    X = df.drop(columns=["charges"])
    X_transformed = model[:-1].transform(X)
    training_means = np.mean(X_transformed, axis=0)
    feature_names = list(model.named_steps["preprocessor"].get_feature_names_out())
    coefs = model.named_steps["regressor"].coef_
    intercept = float(model.named_steps["regressor"].intercept_)
    return {
        "training_means": training_means,
        "feature_names": feature_names,
        "coefs": coefs,
        "intercept": intercept,
    }


# ===========================================================================
# 1. FEATURE 1: ESTIMATED RANGE TESTS (low <= prediction <= high)
# ===========================================================================
def test_estimated_range_bounds():
    """Verify that low <= prediction <= high holds across various predictions."""
    test_cases = [1200.0, 5000.0, 15000.0, 35000.0, 48000.0]

    for pred_usd in test_cases:
        res = compute_range(predicted_usd=pred_usd, residual_std_usd=RESIDUAL_STD_USD)
        
        # In USD
        assert res["low_usd"] <= pred_usd <= res["high_usd"], (
            f"Failed: {res['low_usd']} <= {pred_usd} <= {res['high_usd']}"
        )
        assert res["low_usd"] >= 0.0, "low_usd must be floored at 0"

        # In INR
        pred_inr = to_inr(pred_usd)
        assert res["low"] <= pred_inr <= res["high"], (
            f"Failed INR range: {res['low']} <= {pred_inr} <= {res['high']}"
        )
        assert res["low"] >= 0.0, "low in INR must be floored at 0"
        assert res["low_inr"] == res["low"]
        assert res["high_inr"] == res["high"]


def test_estimated_range_floor_at_zero():
    """Verify that low is properly floored at zero for very low predictions."""
    res = compute_range(predicted_usd=500.0, residual_std_usd=RESIDUAL_STD_USD)
    # 500 - 1.96 * 3802.71 is negative, so must floor at 0
    assert res["low_usd"] == 0.0
    assert res["low"] == 0.0
    assert res["high_usd"] > 500.0


# ===========================================================================
# 2. FEATURE 2: FACTOR CONTRIBUTIONS SUM MATCHES PREDICTION
# ===========================================================================
def test_contributions_sum_matches_prediction(model, model_assets):
    """
    Verify the fundamental mathematical invariant of Linear Regression:
    average_prediction + sum(contributions) == person_prediction (within rounding).
    """
    profiles = [
        {"age": 20, "sex": "female", "bmi": 22.0, "children": 0, "smoker": "no", "region": "northwest"},
        {"age": 55, "sex": "male", "bmi": 35.5, "children": 1, "smoker": "yes", "region": "southeast"},
        {"age": 40, "sex": "female", "bmi": 26.5, "children": 2, "smoker": "no", "region": "southwest"},
        {"age": 62, "sex": "male", "bmi": 31.0, "children": 3, "smoker": "no", "region": "northeast"},
    ]

    for p in profiles:
        breakdown = compute_contributions(
            person_dict=p,
            pipeline=model,
            training_means=model_assets["training_means"],
            feature_names=model_assets["feature_names"],
            coefs=model_assets["coefs"],
            intercept=model_assets["intercept"],
        )

        base_usd = breakdown["base_prediction_usd"]
        total_contrib_usd = breakdown["total_contributions_usd"]
        person_usd = breakdown["person_prediction_usd"]

        # Mathematical verification
        reconstructed = base_usd + total_contrib_usd
        error = abs(reconstructed - person_usd)
        assert error < 0.05, (
            f"Contribution sum does not match prediction for {p}: "
            f"base={base_usd} + sum={total_contrib_usd} = {reconstructed} vs pred={person_usd} (err={error})"
        )
        assert breakdown["is_mathematically_verified"] is True
        assert len(breakdown["contributions"]) == 6  # 6 original input fields


# ===========================================================================
# 3. FEATURE 3: WHAT-IF SCENARIOS (saving > 0 and omitting inapplicable)
# ===========================================================================
def test_whatif_saving_positive_and_omits_inapplicable(model):
    """
    Verify:
    1. For a young non-smoker with normal BMI (22), NO scenarios apply (empty list).
    2. For a smoker with high BMI (35.5), all 3 scenarios apply and savings are > 0.
    3. For an overweight non-smoker (BMI 28.5), smoker scenario is omitted,
       under 30 is omitted (since < 30), and only normal BMI applies.
    """
    # 1. Non-smoker with normal BMI: nothing to reduce
    young_healthy = {
        "age": 20, "sex": "female", "bmi": 22.0, "children": 0, "smoker": "no", "region": "northwest"
    }
    scenarios_healthy = compute_whatif(young_healthy, model)
    assert len(scenarios_healthy) == 0, f"Expected 0 scenarios for healthy person, got {len(scenarios_healthy)}"

    # 2. Older smoker with high BMI (35.5): all 3 apply
    older_smoker = {
        "age": 55, "sex": "male", "bmi": 35.5, "children": 1, "smoker": "yes", "region": "southeast"
    }
    scenarios_smoker = compute_whatif(older_smoker, model)
    scenario_ids = [s["id"] for s in scenarios_smoker]
    assert "quit_smoking" in scenario_ids
    assert "reduce_bmi_under_30" in scenario_ids
    assert "reach_normal_bmi" in scenario_ids

    for sc in scenarios_smoker:
        assert sc["saving_usd"] > 0, f"Scenario {sc['id']} has non-positive saving_usd: {sc['saving_usd']}"
        assert sc["saving_inr"] > 0, f"Scenario {sc['id']} has non-positive saving_inr: {sc['saving_inr']}"
        assert sc["new_cost_usd"] < sc["current_cost_usd"], "New cost must be less than current cost"
        assert "Model-based estimate of an association in the dataset, not a guarantee." in sc["note"]

    # 3. Obese non-smoker (BMI 35.0): quit smoking omitted, but both BMI scenarios apply with positive savings
    obese_nonsmoker = {
        "age": 40, "sex": "male", "bmi": 35.0, "children": 2, "smoker": "no", "region": "southwest"
    }
    scenarios_obese = compute_whatif(obese_nonsmoker, model)
    obese_ids = [s["id"] for s in scenarios_obese]
    assert "quit_smoking" not in obese_ids, "Quit smoking must be omitted for non-smoker"
    assert "reduce_bmi_under_30" in obese_ids
    assert "reach_normal_bmi" in obese_ids
    for sc in scenarios_obese:
        assert sc["saving_usd"] > 0, "All returned scenarios must have saving > 0"
        assert sc["saving_inr"] > 0

    # 4. Invariant: across all tested profiles, saving is NEVER negative and never zero
    for profile in [young_healthy, older_smoker, obese_nonsmoker, {"age": 40, "sex": "male", "bmi": 28.5, "children": 2, "smoker": "no", "region": "southwest"}]:
        scs = compute_whatif(profile, model)
        for sc in scs:
            assert sc["saving_usd"] > 0, f"Saving must strictly be > 0, got {sc['saving_usd']}"
            assert sc["saving_inr"] > 0


# ===========================================================================
# 4. FEATURE 4: BMI CALCULATOR FORMULA & VALIDATION
# ===========================================================================
def test_bmi_calculator_formula_and_validation():
    """Verify BMI formula (weight / (height/100)^2, rounded to 1 decimal) and range limits."""
    # Test case 1: 175 cm, 70 kg -> 70 / 1.75^2 = 22.857 -> 22.9
    res1 = calculate_bmi(height_cm=175, weight_kg=70)
    assert res1["bmi"] == 22.9
    assert res1["who_category"] == "Normal weight"
    assert res1["indian_category"] == "Normal weight"

    # Test case 2: 170 cm, 80 kg -> 80 / 1.70^2 = 27.68 -> 27.7
    res2 = calculate_bmi(height_cm=170, weight_kg=80)
    assert res2["bmi"] == 27.7
    assert res2["who_category"] == "Overweight"
    assert res2["indian_category"] == "Obese"  # Indian guideline cutoff is 25

    # Test case 3: 160 cm, 90 kg -> 90 / 1.6^2 = 35.156 -> 35.2
    res3 = calculate_bmi(height_cm=160, weight_kg=90)
    assert res3["bmi"] == 35.2
    assert "Obese" in res3["who_category"]

    # Verify Indian guidelines note presence
    assert "Indian Guidelines" in res1["indian_guidelines_note"]
    assert "23" in res1["indian_guidelines_note"]
    assert "25" in res1["indian_guidelines_note"]

    # Out of range validation errors
    with pytest.raises(ValueError):
        calculate_bmi(height_cm=90, weight_kg=60)  # height < 100 cm
    with pytest.raises(ValueError):
        calculate_bmi(height_cm=260, weight_kg=60)  # height > 250 cm
    with pytest.raises(ValueError):
        calculate_bmi(height_cm=170, weight_kg=15)  # weight < 20 kg
    with pytest.raises(ValueError):
        calculate_bmi(height_cm=170, weight_kg=350)  # weight > 300 kg


# ===========================================================================
# 5. RISK LEVEL BOUNDARIES (RULE-BASED EMPIRICAL GROUPING)
# ===========================================================================
def test_risk_level_boundaries():
    """
    Verify risk_level cutoffs at 33rd ($6,389.38) and 66th ($13,012.21) percentiles.
    """
    # Below 33rd percentile -> low
    assert risk_level(5000.0) == "low"
    assert risk_level(6389.0) == "low"

    # Between 33rd and 66th percentiles -> medium
    assert risk_level(6389.50) == "medium"
    assert risk_level(10000.0) == "medium"
    assert risk_level(13012.20) == "medium"

    # Above 66th percentile -> high
    assert risk_level(13012.50) == "high"
    assert risk_level(25000.0) == "high"
    assert risk_level(45000.0) == "high"

    # Check compute_risk_level metadata wrapper
    low_meta = compute_risk_level(5000.0)
    assert low_meta["risk_level"] == "low"
    assert low_meta["risk_badge_color"] == "emerald"

    med_meta = compute_risk_level(9000.0)
    assert med_meta["risk_level"] == "medium"
    assert med_meta["risk_badge_color"] == "amber"

    high_meta = compute_risk_level(20000.0)
    assert high_meta["risk_level"] == "high"
    assert high_meta["risk_badge_color"] == "rose"
