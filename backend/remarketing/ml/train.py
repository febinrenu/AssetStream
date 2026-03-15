"""
Generate robust synthetic training data and train a Non-Linear Regression model 
for asset depreciation prediction using a RandomForest. 
"""
import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

def generate_synthetic_data(n_samples=2500):
    np.random.seed(42)

    # 1. Asset Age (0.5 to 20 years)
    asset_age_years = np.random.uniform(0.5, 20, n_samples)
    
    # 2. Total hours used (scales with age generally, but with variance)
    base_hours_per_year = np.random.uniform(500, 3000, n_samples)
    total_hours_used = base_hours_per_year * asset_age_years + np.random.normal(0, 500, n_samples)
    total_hours_used = np.clip(total_hours_used, 100, 60000)
    
    # 3. Original Value
    original_value = np.random.uniform(20000, 800000, n_samples)
    
    # 4. Maintenance events (correlates to age & hours)
    maintenance_events = np.floor((total_hours_used / 2000) * np.random.uniform(0.5, 1.5, n_samples))
    maintenance_events = np.clip(maintenance_events, 0, 30)

    # Advanced Non-Linear Depreciation formula:
    age_decay = np.exp(-0.08 * asset_age_years)
    hour_penalty = np.exp(-0.00002 * total_hours_used)
    
    expected_maint = total_hours_used / 2000
    maint_ratio = np.clip(maintenance_events / (expected_maint + 1), 0, 1.5)
    maint_bonus = 1.0 + (maint_ratio * 0.10)
    
    value_factor = 0.75 * age_decay * hour_penalty * maint_bonus
    value_factor = np.clip(value_factor, 0.05, 0.95)

    noise = np.random.normal(0, 0.03, n_samples)
    current_resale_value = original_value * (value_factor + noise)     
    current_resale_value = np.maximum(current_resale_value, original_value * 0.05)
    
    X = np.column_stack([
        asset_age_years,
        total_hours_used,
        original_value,
        maintenance_events,
    ])

    return X, current_resale_value

def train_model():
    X, y = generate_synthetic_data()

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("regressor", RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)),
    ])

    pipeline.fit(X, y)

    joblib.dump(pipeline, MODEL_PATH)
    print(f"Model trained and saved to {MODEL_PATH}")
    print(f"Training R2 score: {pipeline.score(X, y):.4f}")

    return pipeline

if __name__ == "__main__":
    train_model()