"""
Unit & Integration Tests for Medical Insurance Cost Prediction Model
Using pytest.
"""

import os
import joblib
import pandas as pd
import pytest

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from src.preprocess import MedicalInsuranceFeatureEngineer


MODEL_PATH = "models/best_model.joblib"


@pytest.fixture(scope="module")
def model():
    """Fixture that verifies model artifact exists and loads the trained pipeline."""
    assert os.path.exists(MODEL_PATH), f"Model file not found at {MODEL_PATH}. Run src/train.py first."
    loaded_model = joblib.load(MODEL_PATH)
    assert loaded_model is not None
    return loaded_model


def test_model_artifact_and_steps(model):
    """Verify that the model is a scikit-learn Pipeline with all expected stages."""
    assert hasattr(model, "predict"), "Loaded model does not have a predict method."
    assert "feature_engineer" in model.named_steps, "Pipeline missing feature_engineer step."
    assert "preprocessor" in model.named_steps, "Pipeline missing preprocessor step."
    assert "regressor" in model.named_steps, "Pipeline missing regressor step."


def test_single_prediction_positive(model):
    """Verify that model predicts a positive numerical cost for a standard profile."""
    sample_person = pd.DataFrame([{
        "age": 30,
        "sex": "male",
        "bmi": 25.0,
        "children": 1,
        "smoker": "no",
        "region": "northwest"
    }])
    
    prediction = model.predict(sample_person)
    assert len(prediction) == 1
    charge = float(prediction[0])
    assert charge > 0.0, f"Predicted insurance charge must be positive, got {charge}"
    # Standard non-smoker healthy charge should be in reasonable range (e.g. $1,000 - $15,000)
    assert 1000.0 < charge < 20000.0, f"Prediction out of expected healthy range: {charge}"


def test_smoker_cost_higher_than_non_smoker(model):
    """
    Critical Domain Invariant:
    A smoker MUST receive a significantly higher predicted insurance charge
    than an otherwise identical non-smoker.
    """
    base_profile = {
        "age": 40,
        "sex": "female",
        "bmi": 31.5,
        "children": 2,
        "region": "southeast"
    }

    non_smoker = pd.DataFrame([{**base_profile, "smoker": "no"}])
    smoker = pd.DataFrame([{**base_profile, "smoker": "yes"}])

    pred_non_smoker = float(model.predict(non_smoker)[0])
    pred_smoker = float(model.predict(smoker)[0])

    print(f"\nNon-smoker: ${pred_non_smoker:.2f} | Smoker: ${pred_smoker:.2f}")
    assert pred_smoker > pred_non_smoker, (
        f"Smoker cost (${pred_smoker:.2f}) must be strictly higher than non-smoker (${pred_non_smoker:.2f})"
    )
    # Clinical domain check: smoking typically multiplies or adds >$10,000 in risk
    assert (pred_smoker - pred_non_smoker) > 8000.0, (
        f"Smoker premium increase should reflect high clinical risk (diff: ${pred_smoker - pred_non_smoker:.2f})"
    )


def test_bmi_obesity_monotonicity(model):
    """
    Domain Invariant:
    Holding all else equal, an obese individual (BMI 36) should have higher charges
    than a normal-weight individual (BMI 22).
    """
    normal_weight = pd.DataFrame([{
        "age": 45,
        "sex": "male",
        "bmi": 22.0,
        "children": 0,
        "smoker": "no",
        "region": "southwest"
    }])

    obese_person = pd.DataFrame([{
        "age": 45,
        "sex": "male",
        "bmi": 36.0,
        "children": 0,
        "smoker": "no",
        "region": "southwest"
    }])

    cost_normal = float(model.predict(normal_weight)[0])
    cost_obese = float(model.predict(obese_person)[0])

    assert cost_obese > cost_normal, (
        f"Obese profile (${cost_obese:.2f}) should be higher than normal weight (${cost_normal:.2f})"
    )


def test_batch_prediction(model):
    """Verify that pipeline handles batch DataFrames cleanly without shape errors."""
    batch_df = pd.DataFrame([
        {"age": 19, "sex": "female", "bmi": 27.9, "children": 0, "smoker": "yes", "region": "southwest"},
        {"age": 18, "sex": "male", "bmi": 33.7, "children": 1, "smoker": "no", "region": "southeast"},
        {"age": 55, "sex": "male", "bmi": 30.1, "children": 3, "smoker": "no", "region": "northeast"},
        {"age": 62, "sex": "female", "bmi": 24.5, "children": 0, "smoker": "no", "region": "northwest"}
    ])

    preds = model.predict(batch_df)
    assert len(preds) == 4
    assert all(p > 0 for p in preds)
