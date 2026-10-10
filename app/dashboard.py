"""
Medical Insurance Cost Prediction - Interactive Streamlit Dashboard
Features:
- Predict: Individual cost prediction, risk category, and demographic benchmark
- EDA: Dynamic interactive Plotly charts with multi-variable filters
- Model Performance: Benchmark comparison, predicted vs actual, and residuals
- Insights: Feature importance breakdown and actuarial implications
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

# Append project root to sys.path so src imports function seamlessly
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from src.preprocess import MedicalInsuranceFeatureEngineer, flag_charge_outliers

# ---------------------------------------------------------
# Page Configuration & Custom CSS
# ---------------------------------------------------------
st.set_page_config(
    page_title="MediCost AI - Medical Insurance Predictor",
    page_icon="🩺",
    layout="wide",
    initial_sidebar_state="expanded"
)

CUSTOM_CSS = """
<style>
    /* Metric Cards */
    .metric-card {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 20px;
        color: #f8fafc;
        box-shadow: 0 4px 14px 0 rgba(0, 0, 0, 0.25);
        margin-bottom: 12px;
    }
    .metric-title {
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
        font-weight: 600;
    }
    .metric-value {
        font-size: 1.85rem;
        font-weight: 700;
        color: #38bdf8;
        margin-top: 4px;
    }
    .metric-subtitle {
        font-size: 0.8rem;
        color: #cbd5e1;
        margin-top: 4px;
    }

    /* Risk Badges */
    .badge-low {
        display: inline-block;
        background-color: #065f46;
        color: #34d399;
        padding: 4px 12px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.9rem;
        border: 1px solid #059669;
    }
    .badge-medium {
        display: inline-block;
        background-color: #78350f;
        color: #fbbf24;
        padding: 4px 12px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.9rem;
        border: 1px solid #d97706;
    }
    .badge-high {
        display: inline-block;
        background-color: #881337;
        color: #fb7185;
        padding: 4px 12px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.9rem;
        border: 1px solid #e11d48;
    }

    /* Callout Card */
    .callout-box {
        background-color: #0f172a;
        border-left: 4px solid #38bdf8;
        padding: 14px 18px;
        border-radius: 0 8px 8px 0;
        margin: 15px 0;
        color: #e2e8f0;
    }
    .disclaimer-box {
        background-color: #1e1e24;
        border-left: 4px solid #f59e0b;
        padding: 12px 16px;
        border-radius: 0 8px 8px 0;
        font-size: 0.85rem;
        color: #cbd5e1;
        margin-top: 25px;
    }
</style>
"""
st.markdown(CUSTOM_CSS, unsafe_allow_html=True)


# ---------------------------------------------------------
# Resource & Data Caching
# ---------------------------------------------------------
@st.cache_resource
def load_trained_model():
    model_path = os.path.join(ROOT_DIR, "models", "best_model.joblib")
    if not os.path.exists(model_path):
        st.error(f"Model file not found at `{model_path}`. Please run `python src/train.py` first.")
        st.stop()
    return joblib.load(model_path)


@st.cache_data
def load_dataset():
    data_path = os.path.join(ROOT_DIR, "data", "insurance.csv")
    if not os.path.exists(data_path):
        st.error(f"Dataset not found at `{data_path}`.")
        st.stop()
    df = pd.read_csv(data_path)
    df = df.drop_duplicates().reset_index(drop=True)
    return df


@st.cache_data
def load_metrics():
    metrics_path = os.path.join(ROOT_DIR, "models", "metrics.json")
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            return json.load(f)
    return None


@st.cache_data
def load_eval_cache():
    cache_path = os.path.join(ROOT_DIR, "models", "eval_cache.json")
    if os.path.exists(cache_path):
        with open(cache_path, "r") as f:
            return json.load(f)
    return None


# Load shared resources
model = load_trained_model()
df_data = load_dataset()
metrics_json = load_metrics()
eval_cache = load_eval_cache()


# ---------------------------------------------------------
# Sidebar Navigation & App Info
# ---------------------------------------------------------
st.sidebar.image("https://img.icons8.com/isometric/100/health-insurance.png", width=70)
st.sidebar.title("MediCost AI")
st.sidebar.caption("Machine Learning Cost Prediction Platform")

page = st.sidebar.radio(
    "Navigation Menu",
    ["🔮 Predict Cost", "📊 Exploratory Data Analysis", "📈 Model Performance", "💡 Actuarial Insights"],
    index=0
)

st.sidebar.markdown("---")
st.sidebar.markdown(
    """
    **Project Specifications:**
    - **Dataset:** 1,338 records (US Health Insurance)
    - **Best Model:** Tuned Gradient Boosting
    - **Test R² Score:** **0.9188** (91.9%)
    - **Test MAE:** **$2,123.89**
    - **Reproducibility:** Seed 42 Fixed
    """
)

# ---------------------------------------------------------
# PAGE 1: PREDICT COST
# ---------------------------------------------------------
if page == "🔮 Predict Cost":
    st.header("🩺 Patient Medical Insurance Cost Estimator")
    st.write(
        "Enter personal demographics and biometric indicators below to forecast the estimated annual medical insurance charges using our tuned Gradient Boosting pipeline."
    )

    with st.form("prediction_form"):
        col1, col2 = st.columns(2)

        with col1:
            age = st.slider("Age (years)", min_value=18, max_value=65, value=30, step=1)
            sex = st.selectbox("Sex", ["female", "male"])
            
            # BMI input helper
            input_mode = st.radio("BMI Input Mode", ["Enter BMI directly", "Compute from Height & Weight"], horizontal=True)
            if input_mode == "Enter BMI directly":
                bmi = st.number_input("Body Mass Index (BMI)", min_value=15.0, max_value=55.0, value=28.5, step=0.1)
            else:
                h_cm = st.number_input("Height (cm)", min_value=100.0, max_value=230.0, value=175.0, step=0.5)
                w_kg = st.number_input("Weight (kg)", min_value=35.0, max_value=200.0, value=75.0, step=0.5)
                bmi = round(w_kg / ((h_cm / 100) ** 2), 2)
                st.caption(f"Calculated BMI: **{bmi:.2f} kg/m²**")

        with col2:
            children = st.slider("Number of Dependent Children", min_value=0, max_value=5, value=1, step=1)
            smoker = st.selectbox("Smoking Status", ["no", "yes"], help="Tobacco consumption is the primary driver of medical premiums.")
            region = st.selectbox("US Geographic Region", ["northeast", "northwest", "southeast", "southwest"])

        submit_btn = st.form_submit_btn("⚡ Calculate Insurance Estimate", use_container_width=True)

    if submit_btn:
        # Construct input payload
        input_data = pd.DataFrame([{
            "age": age,
            "sex": sex,
            "bmi": float(bmi),
            "children": children,
            "smoker": smoker,
            "region": region
        }])

        with st.spinner("Executing feature engineering and gradient boosting prediction..."):
            predicted_charge = float(model.predict(input_data)[0])

        # Risk Classification
        if predicted_charge < 10000:
            risk_class = "badge-low"
            risk_label = "LOW RISK PROFILE"
            risk_desc = "Standard preventative healthcare exposure. Low historical probability of severe claims."
        elif predicted_charge <= 25000:
            risk_class = "badge-medium"
            risk_label = "MODERATE RISK PROFILE"
            risk_desc = "Moderate actuarial risk. Typical for older age brackets or pre-obesity BMI ranges."
        else:
            risk_class = "badge-high"
            risk_label = "HIGH RISK PROFILE"
            risk_desc = "Elevated actuarial risk profile primarily driven by tobacco use and/or clinical obesity."

        # Compute cohort benchmark from dataset
        # Cohort: same smoking status and within +/- 5 years age
        cohort = df_data[(df_data["smoker"] == smoker) & (df_data["age"].between(age - 5, age + 5))]
        if len(cohort) > 0:
            cohort_avg = cohort["charges"].mean()
            cohort_median = cohort["charges"].median()
        else:
            cohort_avg = df_data[df_data["smoker"] == smoker]["charges"].mean()
            cohort_median = df_data[df_data["smoker"] == smoker]["charges"].median()

        overall_avg = df_data["charges"].mean()

        st.subheader("📋 Policy Forecast & Risk Assessment")
        mcol1, mcol2, mcol3 = st.columns(3)

        with mcol1:
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="metric-title">Predicted Annual Cost</div>
                    <div class="metric-value">${predicted_charge:,.2f}</div>
                    <div class="metric-subtitle">Monthly equivalent: ~${predicted_charge/12:,.2f}</div>
                </div>
                """,
                unsafe_allow_html=True
            )

        with mcol2:
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="metric-title">Risk Stratification</div>
                    <div style="margin-top: 8px;"><span class="{risk_class}">{risk_label}</span></div>
                    <div class="metric-subtitle" style="margin-top: 10px;">{risk_desc}</div>
                </div>
                """,
                unsafe_allow_html=True
            )

        with mcol3:
            diff_from_cohort = predicted_charge - cohort_avg
            arrow = "▲" if diff_from_cohort > 0 else "▼"
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="metric-title">Cohort Benchmark (Age ±5)</div>
                    <div class="metric-value" style="color: #a78bfa;">${cohort_avg:,.2f}</div>
                    <div class="metric-subtitle">{arrow} ${abs(diff_from_cohort):,.2f} vs peers ({smoker} smoker)</div>
                </div>
                """,
                unsafe_allow_html=True
            )

        # Comparative bar comparison
        st.write("#### 📊 Demographic Comparison")
        comp_df = pd.DataFrame({
            "Category": ["Your Prediction", f"Peer Cohort Avg (Age {max(18, age-5)}-{min(65, age+5)})", "Dataset Overall Avg"],
            "Amount ($)": [predicted_charge, cohort_avg, overall_avg]
        })
        fig = px.bar(
            comp_df,
            x="Category",
            y="Amount ($)",
            text="Amount ($)",
            color="Category",
            color_discrete_sequence=["#38bdf8", "#818cf8", "#64748b"]
        )
        fig.update_traces(texttemplate="$%{text:,.0f}", textposition="outside")
        fig.update_layout(showlegend=False, yaxis_title="Annual Charges ($)", height=350, margin=dict(t=20, b=20))
        st.plotly_chart(fig, use_container_width=True)

    st.markdown(
        """
        <div class="disclaimer-box">
            ⚠️ <strong>Disclaimer:</strong> This application provides statistical estimates based strictly on historical data for academic and demonstration purposes. It does not constitute formal actuarial advice, health underwriting, or a legally binding insurance quote.
        </div>
        """,
        unsafe_allow_html=True
    )

# ---------------------------------------------------------
# PAGE 2: EXPLORATORY DATA ANALYSIS (EDA)
# ---------------------------------------------------------
elif page == "📊 Exploratory Data Analysis":
    st.header("📊 Interactive Exploratory Data Analysis")
    st.write("Explore bivariate and multivariate relationships across 1,338 policyholders.")

    # EDA Filters
    st.markdown("##### 🔍 Data Slicers")
    fcol1, fcol2, fcol3 = st.columns(3)
    with fcol1:
        sel_regions = st.multiselect("Regions", options=list(df_data["region"].unique()), default=list(df_data["region"].unique()))
    with fcol2:
        sel_smoker = st.multiselect("Smoking Status", options=["no", "yes"], default=["no", "yes"])
    with fcol3:
        age_range = st.slider("Age Filter", min_value=int(df_data["age"].min()), max_value=int(df_data["age"].max()), value=(18, 64))

    # Apply filters
    filtered_df = df_data[
        (df_data["region"].isin(sel_regions)) &
        (df_data["smoker"].isin(sel_smoker)) &
        (df_data["age"].between(age_range[0], age_range[1]))
    ]

    st.caption(f"Showing **{len(filtered_df):,}** of {len(df_data):,} records based on active filters.")

    tab1, tab2, tab3, tab4 = st.tabs([
        "Distribution of Charges",
        "Charges by Categorical Factors",
        "Biometric Correlations (Age & BMI)",
        "Correlation Matrix"
    ])

    with tab1:
        st.subheader("Distribution of Annual Medical Charges")
        log_scale = st.checkbox("Show Log1p Transformed Distribution", value=False)
        if log_scale:
            plot_series = np.log1p(filtered_df["charges"])
            x_label = "log1p(Charges)"
            title_text = "Log-Transformed Charges Distribution (Normalizing Skewness)"
        else:
            plot_series = filtered_df["charges"]
            x_label = "Actual Charges ($)"
            title_text = "Raw Charges Distribution (Right-Skewed with Bimodal Smoker Mode)"

        fig = px.histogram(
            filtered_df,
            x=plot_series,
            color="smoker",
            marginal="box",
            nbins=40,
            color_discrete_map={"yes": "#ef4444", "no": "#10b981"},
            title=title_text,
            labels={"charges": x_label}
        )
        fig.update_layout(height=450)
        st.plotly_chart(fig, use_container_width=True)
        st.markdown(
            """
            <div class="callout-box">
                💡 <strong>Plain-English Insight:</strong> The raw insurance cost distribution is heavily right-skewed. Non-smokers cluster densely under $10,000, while smokers form a distinct secondary high-cost peak above $30,000.
            </div>
            """,
            unsafe_allow_html=True
        )

    with tab2:
        st.subheader("Charges Stratified by Categorical Variables")
        split_factor = st.selectbox("Stratify charges by:", ["smoker", "sex", "region", "children"])
        fig_cat = px.box(
            filtered_df,
            x=split_factor,
            y="charges",
            color=split_factor,
            points="outliers",
            title=f"Medical Charges Grouped by {split_factor.capitalize()}",
            labels={"charges": "Charges ($)"}
        )
        fig_cat.update_layout(height=450, showlegend=False)
        st.plotly_chart(fig_cat, use_container_width=True)

        insights_dict = {
            "smoker": "Smokers incur an average cost roughly ~3.8x higher than non-smokers (~$32,050 vs ~$8,434).",
            "sex": "Distributions for males and females show comparable medians; males exhibit marginally higher extreme charges due to higher smoking rates.",
            "region": "Costs are evenly distributed across regions, with the Southeast having slightly higher average charges due to higher regional obesity prevalence.",
            "children": "Cost variance remains stable across family sizes; individuals with 2-3 children exhibit modest incremental cost adjustments."
        }
        st.markdown(
            f"""
            <div class="callout-box">
                💡 <strong>Plain-English Insight:</strong> {insights_dict[split_factor]}
            </div>
            """,
            unsafe_allow_html=True
        )

    with tab3:
        st.subheader("Scatter Diagnostics: Age and BMI vs Charges")
        scol1, scol2 = st.columns(2)

        with scol1:
            fig_age = px.scatter(
                filtered_df,
                x="age",
                y="charges",
                color="smoker",
                color_discrete_map={"yes": "#ef4444", "no": "#10b981"},
                trendline="ols",
                title="Age vs Charges (Parallel Gradient Bands)",
                labels={"age": "Age (years)", "charges": "Charges ($)"}
            )
            fig_age.update_layout(height=420)
            st.plotly_chart(fig_age, use_container_width=True)
            st.markdown(
                """
                <div class="callout-box">
                    💡 <strong>Insight:</strong> Medical charges increase linearly with age for both cohorts, but smokers start from an elevated intercept ~$20,000 higher.
                </div>
                """,
                unsafe_allow_html=True
            )

        with scol2:
            fig_bmi = px.scatter(
                filtered_df,
                x="bmi",
                y="charges",
                color="smoker",
                color_discrete_map={"yes": "#ef4444", "no": "#10b981"},
                title="BMI vs Charges (Severe Threshold at BMI >= 30)",
                labels={"bmi": "BMI (kg/m²)", "charges": "Charges ($)"}
            )
            fig_bmi.add_vline(x=30, line_dash="dash", line_color="#f59e0b", annotation_text="Obesity Threshold (BMI=30)")
            fig_bmi.update_layout(height=420)
            st.plotly_chart(fig_bmi, use_container_width=True)
            st.markdown(
                """
                <div class="callout-box">
                    💡 <strong>Insight:</strong> A dramatic interaction occurs at BMI >= 30: non-smokers stay relatively flat, while smokers experience a sharp step-increase into the $35,000-$50,000 range.
                </div>
                """,
                unsafe_allow_html=True
            )

    with tab4:
        st.subheader("Correlation Matrix Heatmap")
        corr_df = filtered_df[["age", "bmi", "children", "charges"]].copy()
        corr_df["is_smoker"] = (filtered_df["smoker"] == "yes").astype(int)
        corr_df["is_male"] = (filtered_df["sex"] == "male").astype(int)
        corr_matrix = corr_df.corr().round(3)

        fig_corr = px.imshow(
            corr_matrix,
            text_auto=True,
            aspect="auto",
            color_continuous_scale="Viridis",
            title="Pearson Correlation Heatmap (Including Encoded Flags)"
        )
        fig_corr.update_layout(height=450)
        st.plotly_chart(fig_corr, use_container_width=True)
        st.markdown(
            """
            <div class="callout-box">
                💡 <strong>Insight:</strong> Smoking status exhibits the strongest correlation with charges (r = 0.79), followed by age (r = 0.30) and BMI (r = 0.20).
            </div>
            """,
            unsafe_allow_html=True
        )

# ---------------------------------------------------------
# PAGE 3: MODEL PERFORMANCE & BENCHMARK
# ---------------------------------------------------------
elif page == "📈 Model Performance":
    st.header("📈 Model Evaluation & Performance Benchmarking")
    st.write("Rigorous 5-fold cross-validation and test set evaluation across candidate architectures.")

    if metrics_json:
        fm = metrics_json["final_metrics"]
        mcol1, mcol2, mcol3, mcol4 = st.columns(4)

        with mcol1:
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="metric-title">Test R² Score</div>
                    <div class="metric-value">{fm['test_r2']:.4f}</div>
                    <div class="metric-subtitle">91.88% variance explained</div>
                </div>
                """,
                unsafe_allow_html=True
            )
        with mcol2:
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="metric-title">5-Fold CV R²</div>
                    <div class="metric-value">{fm['cv_r2_mean']:.4f}</div>
                    <div class="metric-subtitle">± {fm['cv_r2_std']:.4f} stability</div>
                </div>
                """,
                unsafe_allow_html=True
            )
        with mcol3:
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="metric-title">Mean Absolute Error</div>
                    <div class="metric-value">${fm['test_mae']:,.2f}</div>
                    <div class="metric-subtitle">Average absolute error</div>
                </div>
                """,
                unsafe_allow_html=True
            )
        with mcol4:
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="metric-title">Root Mean Squared Error</div>
                    <div class="metric-value">${fm['test_rmse']:,.2f}</div>
                    <div class="metric-subtitle">Standard deviation of residuals</div>
                </div>
                """,
                unsafe_allow_html=True
            )

        st.subheader("Model Comparison Leaderboard")
        comp_table = pd.DataFrame(metrics_json["comparison_table"]).T
        comp_table = comp_table[[
            "cv_r2_mean", "cv_r2_std", "train_r2", "test_r2", "test_mae", "test_rmse", "train_test_r2_gap", "target_transform"
        ]].sort_values(by="cv_r2_mean", ascending=False)
        st.dataframe(
            comp_table.style.highlight_max(subset=["cv_r2_mean", "test_r2"], color="#1e3a5f")
                            .highlight_min(subset=["test_mae", "test_rmse"], color="#14532d")
                            .format({
                                "cv_r2_mean": "{:.4f}",
                                "cv_r2_std": "{:.4f}",
                                "train_r2": "{:.4f}",
                                "test_r2": "{:.4f}",
                                "test_mae": "${:,.2f}",
                                "test_rmse": "${:,.2f}",
                                "train_test_r2_gap": "{:.4f}"
                            }),
            use_container_width=True
        )

        st.markdown(
            f"""
            <div class="callout-box">
                🛡️ <strong>Overfitting Diagnosis:</strong> {metrics_json.get('overfitting_diagnosis', '')}
                Train R² is <strong>{fm['train_r2']:.4f}</strong> vs Test R² of <strong>{fm['test_r2']:.4f}</strong>.
                By constraining tree depth (<code>max_depth=2</code>) and learning rate (<code>0.08</code>), our model avoids memorization.
            </div>
            """,
            unsafe_allow_html=True
        )

    # Diagnostic Plots
    if eval_cache:
        st.subheader("Regression Diagnostics")
        pcol1, pcol2 = st.columns(2)

        y_test = np.array(eval_cache["y_test"])
        y_pred = np.array(eval_cache["y_pred"])
        residuals = np.array(eval_cache["residuals"])

        with pcol1:
            fig_pv = px.scatter(
                x=y_test,
                y=y_pred,
                labels={"x": "Actual Charges ($)", "y": "Predicted Charges ($)"},
                title="Predicted vs Actual Charges (Test Split)",
                opacity=0.65,
                color_discrete_sequence=["#38bdf8"]
            )
            min_bound = min(y_test.min(), y_pred.min())
            max_bound = max(y_test.max(), y_pred.max())
            fig_pv.add_trace(go.Scatter(
                x=[min_bound, max_bound],
                y=[min_bound, max_bound],
                mode="lines",
                name="Perfect Fit (y = x)",
                line=dict(color="#ef4444", dash="dash", width=2)
            ))
            fig_pv.update_layout(height=420)
            st.plotly_chart(fig_pv, use_container_width=True)

        with pcol2:
            fig_res = px.scatter(
                x=y_pred,
                y=residuals,
                labels={"x": "Predicted Charges ($)", "y": "Residuals (Actual - Predicted) ($)"},
                title="Residuals vs Predicted Charges (Homoscedasticity Check)",
                opacity=0.65,
                color_discrete_sequence=["#10b981"]
            )
            fig_res.add_hline(y=0, line_dash="dash", line_color="#ef4444")
            fig_res.update_layout(height=420)
            st.plotly_chart(fig_res, use_container_width=True)

# ---------------------------------------------------------
# PAGE 4: ACTUARIAL INSIGHTS & FEATURE IMPORTANCE
# ---------------------------------------------------------
elif page == "💡 Actuarial Insights":
    st.header("💡 Actuarial & Business Insights")
    st.write("Understand the key demographic and behavioral mechanisms driving medical expenses.")

    if metrics_json and "feature_importances" in metrics_json:
        feat_data = pd.DataFrame(metrics_json["feature_importances"]).head(8)
        fig_feat = px.bar(
            feat_data.sort_values(by="importance", ascending=True),
            x="importance",
            y="feature",
            orientation="h",
            text="importance",
            color="importance",
            color_continuous_scale="Blues",
            title=f"Relative Feature Importance ({metrics_json['final_model']})",
            labels={"importance": "Importance Ratio", "feature": "Engineered Feature"}
        )
        fig_feat.update_traces(texttemplate="%{text:.2%}", textposition="outside")
        fig_feat.update_layout(height=400, showlegend=False, xaxis_range=[0, 1.0])
        st.plotly_chart(fig_feat, use_container_width=True)

    st.subheader("Key Empirical Findings")
    icol1, icol2 = st.columns(2)

    with icol1:
        st.markdown(
            """
            ### 1. The Synergistic Smoker × BMI Factor
            - **Finding:** The interaction term `smoker_x_bmi` accounts for **~80.0%** of total predictive importance.
            - **Actuarial Mechanism:** While high BMI alone causes a moderate increase in medical costs, combined smoking and clinical obesity trigger exponential risks for cardiovascular disease, respiratory illness, and diabetes.
            
            ### 2. Chronological Aging Effect
            - **Finding:** Age accounts for **~11.1%** of model importance.
            - **Actuarial Mechanism:** Independent of lifestyle factors, each additional year of age compounds medical baseline costs predictably by roughly $250 - $280 annually.
            """
        )

    with icol2:
        st.markdown(
            """
            ### 3. Non-Significant Demographics
            - **Gender:** Gender shows negligible predictive importance (<0.1%), indicating that health expenditure rates are driven by biometrics and lifestyle rather than biological sex.
            - **Region:** Geographic variation accounts for less than 0.3% of total cost variance once smoking and BMI are accounted for.

            ### 4. Policyholder Recommendations
            - **Smoking Cessation:** Transitioning from smoking to non-smoking reduces estimated annual premium risk by **$15,000 to $30,000+**.
            - **Weight Management:** Maintaining BMI below 30 prevents triggering the high-risk non-linear pricing step.
            """
        )
