import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error
import joblib
import os
import json

DATA_PATH = "../data/processed/workouts.csv"
MODEL_DIR = "../models"

def rmse(y_true, y_pred):
    return float(np.sqrt(np.mean((np.array(y_true) - np.array(y_pred)) ** 2)))

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_file = os.path.abspath(os.path.join(script_dir, DATA_PATH))
    model_dir = os.path.abspath(os.path.join(script_dir, MODEL_DIR))

    print(f"📊 Loading dataset from {data_file}...")
    df = pd.read_csv(data_file)
    df["session_date"] = pd.to_datetime(df["session_date"])
    df = df.sort_values(by="session_date").reset_index(drop=True)

    # Encode exercises
    df_encoded = pd.get_dummies(df, columns=["exercise"], dtype=float)

    # 80/20 Time-based split
    split_idx = int(len(df_encoded) * 0.8)
    val_df = df_encoded.iloc[split_idx:]
    val_raw = df.iloc[split_idx:] # For raw access (e.g. exercise names)

    # Load models
    weight_model_path = os.path.join(model_dir, "weight_model.pkl")
    reps_model_path = os.path.join(model_dir, "reps_model.pkl")
    
    if not os.path.exists(weight_model_path) or not os.path.exists(reps_model_path):
        print("❌ Error: Models pkl files not found. Please train models first.")
        return

    weight_model = joblib.load(weight_model_path)
    reps_model = joblib.load(reps_model_path)

    # Prepare features and targets
    drop_cols = ["next_weight", "next_reps", "session_date"]
    X_val = val_df.drop(columns=drop_cols)
    y_val_w = val_df["next_weight"].tolist()
    y_val_r = val_df["next_reps"].tolist()

    # Model predictions
    ml_w_preds = weight_model.predict(X_val).tolist()
    ml_r_preds = reps_model.predict(X_val).tolist()

    heuristic_w_preds = []
    heuristic_r_preds = []
    hybrid_w_preds = []
    hybrid_r_preds = []

    # Helper function for fatigue drop
    def get_fatigue(w1, r1, w2, r2):
        rep_drop = r1 - r2
        volume1 = w1 * r1
        volume2 = w2 * r2
        volume_drop = volume1 - volume2
        return rep_drop * 0.6 + volume_drop * 0.001

    for idx, row in val_raw.iterrows():
        # Heuristic Weight
        avg_reps = (row["r1"] + row["r2"]) / 2.0
        w2 = row["w2"]
        r2 = int(row["r2"])
        
        # Heuristic Overload rules
        if avg_reps >= 12:
            hw = w2 * 1.05
        elif avg_reps < 8:
            hw = w2 * 0.95
        else:
            hw = w2
        hw_rounded = round(hw / 2.5) * 2.5
        heuristic_w_preds.append(hw_rounded)
        
        # Heuristic target reps default (standard hypertrophy range middle point: 10 reps)
        heuristic_r_preds.append(10)

        # Hybrid Weight & Reps (incorporates ML model and safety/fatigue rules)
        i = len(hybrid_w_preds)
        ml_w = ml_w_preds[i]
        ml_r = ml_r_preds[i]
        
        fatigue = get_fatigue(row["w1"], row["r1"], row["w2"], row["r2"])
        
        # Decision Logic from predict.py
        if fatigue > 5:
            # safety de-load: 10% reduction
            hyw = round(w2 * 0.90 / 2.5) * 2.5
            hyr = 10
        elif ml_r >= r2:
            # Overload progression
            hyw = max(w2 + 2.5, round(ml_w / 2.5) * 2.5)
            hyr = int(round(ml_r))
        else:
            # Maintenance
            hyw = w2
            hyr = int(round(ml_r))
            
        hybrid_w_preds.append(hyw)
        hybrid_r_preds.append(hyr)

    # Compute evaluation metrics
    metrics = {
        "heuristic": {
            "weight_mae": float(mean_absolute_error(y_val_w, heuristic_w_preds)),
            "weight_rmse": rmse(y_val_w, heuristic_w_preds),
            "reps_mae": float(mean_absolute_error(y_val_r, heuristic_r_preds)),
            "reps_rmse": rmse(y_val_r, heuristic_r_preds)
        },
        "ml_only": {
            "weight_mae": float(mean_absolute_error(y_val_w, ml_w_preds)),
            "weight_rmse": rmse(y_val_w, ml_w_preds),
            "reps_mae": float(mean_absolute_error(y_val_r, ml_r_preds)),
            "reps_rmse": rmse(y_val_r, ml_r_preds)
        },
        "hybrid": {
            "weight_mae": float(mean_absolute_error(y_val_w, hybrid_w_preds)),
            "weight_rmse": rmse(y_val_w, hybrid_w_preds),
            "reps_mae": float(mean_absolute_error(y_val_r, hybrid_r_preds)),
            "reps_rmse": rmse(y_val_r, hybrid_r_preds)
        }
    }

    report = {
        "version": "1.0.0",
        "training_date": "2026-05-29",
        "validation_strategy": "Chronological 80/20 Time-based Split",
        "total_test_sessions": len(val_raw),
        "metrics": metrics
    }

    os.makedirs(model_dir, exist_ok=True)
    report_json_path = os.path.join(model_dir, "benchmark_report.json")
    with open(report_json_path, "w") as f:
        json.dump(report, f, indent=4)

    # Print results table
    print("\n🔍 BENCHMARK REPORT (Evaluation on 20% Held-out Sessions):")
    print("-" * 75)
    print(f"{'Recommendation Mode':<20} | {'Weight MAE (kg)':<15} | {'Weight RMSE (kg)':<15} | {'Reps MAE (reps)':<15}")
    print("-" * 75)
    print(f"{'Heuristic Only':<20} | {metrics['heuristic']['weight_mae']:<15.3f} | {metrics['heuristic']['weight_rmse']:<15.3f} | {metrics['heuristic']['reps_mae']:<15.3f}")
    print(f"{'ML Only':<20} | {metrics['ml_only']['weight_mae']:<15.3f} | {metrics['ml_only']['weight_rmse']:<15.3f} | {metrics['ml_only']['reps_mae']:<15.3f}")
    print(f"{'Hybrid (ML + Safe)':<20} | {metrics['hybrid']['weight_mae']:<15.3f} | {metrics['hybrid']['weight_rmse']:<15.3f} | {metrics['hybrid']['reps_mae']:<15.3f}")
    print("-" * 75)
    print(f"✅ Benchmark report persisted to {report_json_path}")

if __name__ == "__main__":
    main()
