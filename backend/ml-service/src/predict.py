import os
import joblib
import pandas as pd

# ✅ Absolute path setup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

weight_model = joblib.load(os.path.join(BASE_DIR, "models/weight_model.pkl"))
reps_model = joblib.load(os.path.join(BASE_DIR, "models/reps_model.pkl"))

# 🔥 FATIGUE
def calculate_fatigue(w1, r1, w2, r2):
    rep_drop = r1 - r2
    volume1 = w1 * r1
    volume2 = w2 * r2
    volume_drop = volume1 - volume2

    return rep_drop * 0.6 + volume_drop * 0.001

# 🧠 SCORE
def calculate_score(fatigue, predicted_reps, current_reps):
    score = 70
    score -= fatigue * 2

    if predicted_reps >= current_reps:
        score += 10
    else:
        score -= 5

    return max(0, min(100, round(score)))

# 🎯 ROUND WEIGHT (GYM REALISTIC)
def round_weight(w):
    return round(w / 2.5) * 2.5

# 💬 FEEDBACK
def generate_feedback(score, fatigue):
    if score > 85:
        return "Excellent session, strong performance 💪"
    elif score > 70:
        return "Good workout, slight fatigue detected"
    elif fatigue > 5:
        return "High fatigue, consider rest or deload"
    else:
        return "Average session, maintain consistency"

# ⚡ ACTION MESSAGE
def action_message(suggestion):
    if suggestion == "Increase weight":
        return "Try increasing weight in next set"
    elif suggestion == "Reduce weight":
        return "Reduce load to recover properly"
    else:
        return "Maintain current weight"

# 🎯 MAIN FUNCTION
def predict_with_reason(data):
    # Copy input dictionary to prevent modification of original data
    pred_data = data.copy()
    exercise_name = pred_data.pop("exercise", None)

    # Convert features to DataFrame
    df = pd.DataFrame([pred_data])

    # Construct one-hot dummy column for exercise name matching train columns
    if exercise_name:
        df[f"exercise_{exercise_name}"] = 1.0

    # Align with trained model features order
    df = df.reindex(columns=weight_model.feature_names_in_, fill_value=0.0)

    # Make predictions
    pred_weight = weight_model.predict(df)[0]
    pred_reps = reps_model.predict(df)[0]

    # Compute variance and standard deviation of predictions across all estimators
    import numpy as np
    preds_w = [estimator.predict(df)[0] for estimator in weight_model.estimators_]
    preds_r = [estimator.predict(df)[0] for estimator in reps_model.estimators_]

    std_w = float(np.std(preds_w))
    std_r = float(np.std(preds_r))
    var_w = float(np.var(preds_w))
    var_r = float(np.var(preds_r))

    # Normalize standard deviation to a 0-100 score
    rel_std_w = std_w / max(2.5, pred_weight)
    confidence_w = max(0.0, 1.0 - (rel_std_w * 4.0)) * 100.0
    confidence_r = max(0.0, 1.0 - (std_r / 3.0)) * 100.0

    confidence_percent = int(round((confidence_w + confidence_r) / 2.0))
    confidence_percent = max(50, min(95, confidence_percent)) # Clamped to standard 50-95% display

    if confidence_percent >= 80:
        confidence_tier = "High"
    elif confidence_percent >= 65:
        confidence_tier = "Medium"
    else:
        confidence_tier = "Low"

    # Calculate fatigue based on previous sets
    fatigue = calculate_fatigue(
        data["w1"], data["r1"],
        data["w2"], data["r2"]
    )

    # Calculate score
    score = calculate_score(fatigue, pred_reps, data["r2"])

    # Decision logic
    if fatigue > 5:
        suggestion = "Reduce weight"
        reason = f"High fatigue detected (score: {fatigue:.2f}). Consider reducing weight."
    elif pred_reps >= data["r2"]:
        suggestion = "Increase weight"
        reason = f"Stable/improved capacity predicted ({int(round(pred_reps))} reps). Ready for overload."
    else:
        suggestion = "Maintain weight"
        reason = f"Slight fatigue predicted ({int(round(pred_reps))} reps). Maintain current load."

    if suggestion == "Increase weight" and pred_weight < data["w2"]:
        pred_weight = data["w2"] + 2.5

    return {
        "suggestion": suggestion,
        "action": action_message(suggestion),
        "predicted_weight": round_weight(pred_weight),
        "predicted_reps": int(round(pred_reps)),
        "fatigue_score": round(fatigue, 2),
        "workout_score": score,
        "confidence": confidence_percent,
        "confidence_tier": confidence_tier,
        "prediction_variance_weight": round(var_w, 4),
        "prediction_variance_reps": round(var_r, 4),
        "feedback": generate_feedback(score, fatigue),
        "reason": reason
    }