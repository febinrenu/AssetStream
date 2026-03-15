"""
Synthetic training for maintenance failure prediction model.
GradientBoostingClassifier trained on synthetic telemetry data.
"""
import os
import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "maintenance_model.pkl")


def _sigmoid(x):
    return 1 / (1 + np.exp(-x))


def generate_training_data(n_samples=2000):
    np.random.seed(123)
    avg_engine_temp = np.random.uniform(65, 96, n_samples)
    temp_trend = np.random.uniform(-0.5, 2.0, n_samples)
    avg_fuel_level = np.random.uniform(10, 95, n_samples)
    fuel_trend = np.random.uniform(-3.0, 1.0, n_samples)
    hours_per_day = np.random.uniform(0, 16, n_samples)
    temp_spikes = np.random.randint(0, 12, n_samples).astype(float)
    asset_age_years = np.random.uniform(0, 15, n_samples)
    total_hours = np.random.uniform(0, 50000, n_samples)

    log_odds = (
        0.08 * (avg_engine_temp - 75)
        + 1.2 * temp_trend
        + 0.5 * temp_spikes
        - 0.015 * avg_fuel_level
        - 0.3 * fuel_trend
        + 0.06 * asset_age_years
        + 0.000015 * total_hours
        - 2.5
        + np.random.normal(0, 0.4, n_samples)
    )
    probability = _sigmoid(log_odds)
    y = (probability > 0.5).astype(int)

    X = np.column_stack([
        avg_engine_temp,
        temp_trend,
        avg_fuel_level,
        fuel_trend,
        hours_per_day,
        temp_spikes,
        asset_age_years,
        total_hours,
    ])
    return X, y


def train_model():
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    X, y = generate_training_data()
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", GradientBoostingClassifier(n_estimators=80, max_depth=3, random_state=42)),
    ])
    pipeline.fit(X, y)
    joblib.dump(pipeline, MODEL_PATH)
    return pipeline


if __name__ == "__main__":
    train_model()
    print("Maintenance model trained.")
