import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
import joblib
import os

DATA_PATH = "../data/processed/workouts.csv"
MODEL_DIR = "../models"

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_file = os.path.abspath(os.path.join(script_dir, DATA_PATH))
    model_dir = os.path.abspath(os.path.join(script_dir, MODEL_DIR))

    print(f"📖 Reading processed data from {data_file}...")
    df = pd.read_csv(data_file)

    # Convert session_date to datetime and sort chronologically
    df["session_date"] = pd.to_datetime(df["session_date"])
    df = df.sort_values(by="session_date").reset_index(drop=True)

    # One-hot encode exercise variable
    # Using columns=["exercise"] preserves other columns
    df_encoded = pd.get_dummies(df, columns=["exercise"], dtype=float)

    # 80/20 Time-based split
    split_idx = int(len(df_encoded) * 0.8)
    train_df = df_encoded.iloc[:split_idx]
    val_df = df_encoded.iloc[split_idx:]

    print(f"📊 Dataset split: {len(train_df)} training rows, {len(val_df)} validation rows")

    # Prepare features and targets
    drop_cols = ["next_weight", "next_reps", "session_date"]
    X_train = train_df.drop(columns=drop_cols)
    y_train_w = train_df["next_weight"]
    y_train_r = train_df["next_reps"]

    X_val = val_df.drop(columns=drop_cols)
    y_val_w = val_df["next_weight"]
    y_val_r = val_df["next_reps"]

    # 1. Train models on training split
    weight_model = RandomForestRegressor(n_estimators=150, random_state=42)
    reps_model = RandomForestRegressor(n_estimators=150, random_state=42)

    print("🏋️ Training Random Forest Regressors on training split...")
    weight_model.fit(X_train, y_train_w)
    reps_model.fit(X_train, y_train_r)

    # 2. Evaluate on validation split
    pred_w = weight_model.predict(X_val)
    pred_r = reps_model.predict(X_val)

    mae_w = mean_absolute_error(y_val_w, pred_w)
    mae_r = mean_absolute_error(y_val_r, pred_r)

    # 3. Evaluate heuristic fallback baseline on validation split
    # For weight: Heuristic progressive overload rules
    heuristic_w_preds = []
    for idx, row in val_df.iterrows():
        avg_reps = (row["r1"] + row["r2"]) / 2.0
        w2 = row["w2"]
        # Standard hypertrophy rules:
        if avg_reps >= 12:
            hw = w2 * 1.05
        elif avg_reps < 8:
            hw = w2 * 0.95
        else:
            hw = w2
        # Round weight to nearest 2.5 plate increment
        hw_rounded = round(hw / 2.5) * 2.5
        heuristic_w_preds.append(hw_rounded)

    heuristic_mae_w = mean_absolute_error(y_val_w, heuristic_w_preds)

    # For reps: Baseline is repeating the last set's reps
    baseline_mae_r = mean_absolute_error(y_val_r, val_df["r2"])

    print("\n📈 Model Evaluation Results (Validation Set):")
    print(f"  - Random Forest Weight Model MAE: {mae_w:.3f} kg")
    print(f"  - Heuristic Fallback Weight MAE : {heuristic_mae_w:.3f} kg")
    weight_improvement = (heuristic_mae_w - mae_w) / heuristic_mae_w * 100
    print(f"  👉 Weight Prediction Improvement: {weight_improvement:.2f}%")

    print(f"  - Random Forest Reps Model MAE  : {mae_r:.3f} reps")
    print(f"  - Baseline Reps MAE (Repeat Last): {baseline_mae_r:.3f} reps")
    reps_improvement = (baseline_mae_r - mae_r) / baseline_mae_r * 100
    print(f"  👉 Reps Prediction Improvement  : {reps_improvement:.2f}%")

    # 4. Retrain models on the ENTIRE dataset for production deployment
    print("\n🔄 Retraining models on full dataset for final deployment...")
    X_full = df_encoded.drop(columns=drop_cols)
    y_full_w = df_encoded["next_weight"]
    y_full_r = df_encoded["next_reps"]

    final_weight_model = RandomForestRegressor(n_estimators=150, random_state=42)
    final_reps_model = RandomForestRegressor(n_estimators=150, random_state=42)

    final_weight_model.fit(X_full, y_full_w)
    final_reps_model.fit(X_full, y_full_r)

    # Extract feature importances
    importances_w = final_weight_model.feature_importances_
    importances_r = final_reps_model.feature_importances_
    feature_names = X_full.columns.tolist()

    import json
    importances_dict = {
        "weight_model": dict(zip(feature_names, importances_w.tolist())),
        "reps_model": dict(zip(feature_names, importances_r.tolist()))
    }

    os.makedirs(model_dir, exist_ok=True)
    importances_json_path = os.path.join(model_dir, "feature_importances.json")
    with open(importances_json_path, "w") as f:
        json.dump(importances_dict, f, indent=4)
    print(f"💾 Persisted feature importances to {importances_json_path}")

    weight_pkl_path = os.path.join(model_dir, "weight_model.pkl")
    reps_pkl_path = os.path.join(model_dir, "reps_model.pkl")

    joblib.dump(final_weight_model, weight_pkl_path)
    joblib.dump(final_reps_model, reps_pkl_path)

    print(f"✅ Models trained on full dataset and successfully saved to {model_dir}")

if __name__ == "__main__":
    main()