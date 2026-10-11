import urllib.request
import json

samples = [
    {
        'label': 'Young Non-Smoker',
        'payload': {'age': 20, 'sex': 'female', 'bmi': 22.0, 'children': 0, 'smoker': 'no', 'region': 'northwest'}
    },
    {
        'label': 'Older Smoker with High BMI',
        'payload': {'age': 55, 'sex': 'male', 'bmi': 35.5, 'children': 1, 'smoker': 'yes', 'region': 'southeast'}
    },
    {
        'label': 'Mid-age Non-Smoker',
        'payload': {'age': 40, 'sex': 'female', 'bmi': 26.5, 'children': 2, 'smoker': 'no', 'region': 'southwest'}
    }
]

print("=" * 60)
print("PREDICTION TEST ON 3 TARGET PROFILES")
print("=" * 60)

for s in samples:
    req = urllib.request.Request(
        'http://localhost:8000/api/predict',
        data=json.dumps(s['payload']).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    res = json.loads(urllib.request.urlopen(req).read())
    usd = res['predicted_usd']
    inr = res['estimated_inr']
    print(f"Profile: {s['label']}")
    print(f"  Inputs: Age {s['payload']['age']}, {s['payload']['sex']}, BMI {s['payload']['bmi']}, Children {s['payload']['children']}, Smoker '{s['payload']['smoker']}', Region '{s['payload']['region']}'")
    print(f"  Predicted USD:     ${usd:,.2f}")
    print(f"  Estimated INR:     Rs {inr:,.2f} ({res['risk_label']})")
    print(f"  Rate & Factor:     USD_TO_INR = {res['usd_to_inr_rate']}, INDIA_COST_FACTOR = {res['india_cost_factor']}")
    print(f"  Peer Cohort (INR): Rs {res['average_cost_for_similar_profiles_inr']:,.2f}")
    print("-" * 60)
