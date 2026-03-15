"""
Synthetic training for default risk scoring model.
LogisticRegression trained on synthetic lease/payment data.
"""
import os
import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "risk_model.pkl")


def _sigmoid(x):
    return 1 / (1 + np.exp(-x))


def generate_training_data(n_samples=3000):
    np.random.seed(42)
    days_overdue = np.random.uniform(0, 180, n_samples)
    overdue_count = np.random.randint(0, 8, n_samples).astype(float)
    utilization_change = np.random.uniform(-60, 60, n_samples)
    remaining_months = np.random.uniform(0, 48, n_samples)
    lessee_lease_count = np.random.randint(1, 6, n_samples).astype(float)
    avg_invoice_amount = np.random.uniform(3000, 30000, n_samples)

    log_odds = (
        0.06 * days_overdue
        + 0.35 * overdue_count
        - 0.008 * utilization_change
        - 0.02 * remaining_months
        - 0.1 * lessee_lease_count
        + 0.00001 * avg_invoice_amount
        - 2.0
        + np.random.normal(0, 0.3, n_samples)
    )
    probability = _sigmoid(log_odds)
    y = (probability > 0.5).astype(int)

    X = np.column_stack([
        days_overdue,
        overdue_count,
        utilization_change,
        remaining_months,
        lessee_lease_count,
        avg_invoice_amount,
    ])
    return X, y


def train_model():
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    X, y = generate_training_data()
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(C=1.0, max_iter=500, random_state=42)),
    ])
    pipeline.fit(X, y)
    joblib.dump(pipeline, MODEL_PATH)
    return pipeline


if __name__ == "__main__":
    train_model()
    print("Risk model trained.")
