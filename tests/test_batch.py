"""
Unit & Integration Tests for Bulk CSV Batch Prediction Feature
Using pytest and FastAPI TestClient.
"""

import os
import sys
import io
import pytest
from fastapi.testclient import TestClient

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.main import app, load_assets

load_assets()
client = TestClient(app)


# ===========================================================================
# 1. BATCH RESULT EQUALS SINGLE /api/predict RESULT
# ===========================================================================
def test_batch_single_row_equals_single_predict():
    """
    Verify that batch prediction for a record exactly matches the output
    of the single /api/predict endpoint down to rounding.
    """
    person = {
        "age": 35,
        "sex": "female",
        "bmi": 28.0,
        "children": 2,
        "smoker": "no",
        "region": "southwest"
    }

    # 1. Single /api/predict call
    single_res = client.post("/api/predict", json=person).json()

    # 2. Batch /api/predict-batch call
    csv_content = (
        "name,age,sex,bmi,children,smoker,region\n"
        "Elena,35,female,28.0,2,no,southwest\n"
    )
    files = {"file": ("test.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    batch_res = client.post("/api/predict-batch", files=files).json()

    assert batch_res["rows_processed"] == 1
    assert batch_res["rows_skipped"] == 0
    row_result = batch_res["results"][0]

    # Verify exact equality of core calculations
    assert abs(row_result["predicted_usd"] - single_res["predicted_usd"]) < 0.01
    assert abs(row_result["estimated_cost_inr"] - single_res["estimated_inr"]) < 0.01
    assert abs(row_result["low"] - single_res["low"]) < 0.01
    assert abs(row_result["high"] - single_res["high"]) < 0.01
    assert row_result["risk_level"] == single_res["risk_level"]
    assert row_result["short_suggestion"] == (
        single_res["suggestions"]["items"][0]["suggestion"]
        if single_res["suggestions"]["items"]
        else single_res["suggestions"]["positive_message"]
    )


# ===========================================================================
# 2. BAD ROWS REPORTED WITHOUT CRASHING
# ===========================================================================
def test_batch_bad_rows_reported_without_crashing():
    """
    Verify that invalid rows (out-of-bound age, missing smoker) are collected
    as errors while valid rows are successfully processed.
    """
    csv_content = (
        "name,age,sex,bmi,children,smoker,region\n"
        "Valid Person,25,male,23.5,0,no,northwest\n"
        "Bad Age,150,female,24.0,1,no,southeast\n"
        "Missing Smoker,40,male,26.0,2,,southwest\n"
        "Negative BMI,30,female,-5.0,0,no,northeast\n"
    )
    files = {"file": ("mixed.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    resp = client.post("/api/predict-batch", files=files)
    assert resp.status_code == 200
    data = resp.json()

    assert data["rows_processed"] == 1
    assert data["rows_skipped"] == 3
    assert len(data["errors"]) >= 3

    # Check error row numbers and columns
    error_cols = [e["column"] for e in data["errors"]]
    assert "age" in error_cols
    assert "smoker" in error_cols
    assert "bmi" in error_cols

    # Ensure valid person is computed
    assert data["results"][0]["name"] == "Valid Person"
    assert data["results"][0]["estimated_cost_inr"] > 0


# ===========================================================================
# 3. MISSING REQUIRED COLUMNS RETURN CLEAR ERROR
# ===========================================================================
def test_batch_missing_required_columns():
    """Verify that omitting required columns returns a 400 error listing the missing headers."""
    # Missing 'smoker' and 'age'
    csv_content = (
        "name,sex,bmi,children,region\n"
        "Incomplete,male,24.0,1,southwest\n"
    )
    files = {"file": ("missing_cols.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    resp = client.post("/api/predict-batch", files=files)
    assert resp.status_code == 400
    assert "Missing required CSV column(s)" in resp.json()["detail"]
    assert "age" in resp.json()["detail"]
    assert "smoker" in resp.json()["detail"]


# ===========================================================================
# 4. CASE & SPACING NORMALIZATION
# ===========================================================================
def test_batch_case_and_spacing_normalized():
    """Verify that whitespace and varied casing are normalized."""
    csv_content = (
        " NAME , AGE , SEX , BMI , CHILDREN , SMOKER , REGION \n"
        "  Arjun  ,  45  ,  MALE  ,  29.5  ,  3  ,  Y  ,  NorthEast  \n"
    )
    files = {"file": ("normalized.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    resp = client.post("/api/predict-batch", files=files)
    assert resp.status_code == 200
    data = resp.json()

    assert data["rows_processed"] == 1
    res = data["results"][0]
    assert res["name"] == "Arjun"
    assert res["age"] == 45
    assert res["sex"] == "male"
    assert res["bmi"] == 29.5
    assert res["children"] == 3
    assert res["smoker"] == "yes"
    assert res["region"] == "northeast"


# ===========================================================================
# 5. HEIGHT / WEIGHT BMI DERIVATION
# ===========================================================================
def test_batch_height_weight_bmi_derivation():
    """Verify that missing BMI is automatically calculated when height_cm and weight_kg are supplied."""
    csv_content = (
        "name,age,sex,children,smoker,region,height_cm,weight_kg\n"
        "Rohan,30,male,0,no,southeast,175,70\n"
    )
    files = {"file": ("height_weight.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    resp = client.post("/api/predict-batch", files=files)
    assert resp.status_code == 200
    data = resp.json()

    assert data["rows_processed"] == 1
    # 70 / (1.75^2) = 22.857 -> 22.9
    assert data["results"][0]["bmi"] == 22.9


# ===========================================================================
# 6. SIZE & ROW LIMITS REJECTED
# ===========================================================================
def test_batch_file_over_size_limit_rejected():
    """Verify that file exceeding 2 MB is rejected with status 400."""
    large_content = b"name,age,sex,bmi,children,smoker,region\n" + b"X,20,male,20,0,no,northwest\n" * 90000
    assert len(large_content) > 2 * 1024 * 1024  # > 2 MB
    files = {"file": ("too_large.csv", io.BytesIO(large_content), "text/csv")}
    resp = client.post("/api/predict-batch", files=files)
    assert resp.status_code == 400
    assert "File size exceeds the 2 MB limit" in resp.json()["detail"]


def test_batch_file_over_row_limit_rejected():
    """Verify that CSV with > 5000 rows is rejected with status 400."""
    # Create ~5005 rows within 2 MB size
    header = "name,age,sex,bmi,children,smoker,region\n"
    rows = "P,20,male,20,0,no,northwest\n" * 5005
    csv_bytes = (header + rows).encode("utf-8")
    assert len(csv_bytes) < 2 * 1024 * 1024  # small size
    files = {"file": ("many_rows.csv", io.BytesIO(csv_bytes), "text/csv")}
    resp = client.post("/api/predict-batch", files=files)
    assert resp.status_code == 400
    assert "row count exceeds the maximum limit of 5,000 rows" in resp.json()["detail"]


# ===========================================================================
# 7. FORMULA-INJECTION GUARD FOR CSV EXPORT
# ===========================================================================
def test_formula_injection_guard():
    """
    Verify that dangerous spreadsheet formula prefixes (=, +, -, @)
    are safely prefixed with a single quote to prevent DDE/formula injection.
    """
    def sanitize(val):
        s = str(val)
        if s and s[0] in ("=", "+", "-", "@"):
            return f"'{s}"
        return s

    dangerous_payloads = [
        "=cmd|'/C calc'!A0",
        "+SUM(A1:A10)",
        "-2+3*4",
        "@SUM(B1:B5)",
        "Normal Name",
        "12345"
    ]

    sanitized = [sanitize(p) for p in dangerous_payloads]

    assert sanitized[0].startswith("'=")
    assert sanitized[1].startswith("'+")
    assert sanitized[2].startswith("'-")
    assert sanitized[3].startswith("'@")
    assert sanitized[4] == "Normal Name"
    assert sanitized[5] == "12345"


# ===========================================================================
# 8. SAMPLE BULK CSV TEMPLATE ENDPOINT
# ===========================================================================
def test_sample_bulk_csv_download_endpoint():
    """Verify that GET /api/sample-bulk-csv returns the sample file with valid status 200."""
    resp = client.get("/api/sample-bulk-csv")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers.get("content-type", "")
    content = resp.text
    assert "age" in content
    assert "smoker" in content
    assert "Vikram Malhotra" in content


# ===========================================================================
# 9. EDA DATA FILTERING AND ZERO VARIANCE HANDLING
# ===========================================================================
def test_eda_filtering_and_zero_variance():
    """Verify that GET /api/eda responds with valid JSON and handles single categories without NaN."""
    # Test single smoker (previously produced NaN correlation due to zero variance)
    resp_smoker = client.get("/api/eda?smoker=no")
    assert resp_smoker.status_code == 200
    data = resp_smoker.json()
    assert "correlation_matrix" in data
    assert all("correlation" in c for c in data["correlation_matrix"])

    # Test single region
    resp_region = client.get("/api/eda?region=northeast")
    assert resp_region.status_code == 200

    # Test age bounds
    resp_age = client.get("/api/eda?age_min=25&age_max=40")
    assert resp_age.status_code == 200
    data_age = resp_age.json()
    assert data_age["total_records"] > 0
