# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from src.predict import predict_with_reason
import os
import json

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class WorkoutInput(BaseModel):
    w1: float
    r1: int
    w2: float
    r2: int
    exercise: str
    volume: float
    delta_weight: float
    delta_reps: float
    session_gap: float


@app.get("/")
def home():
    return {"message": "ML Service Running 🚀"}


@app.post("/predict")
def get_prediction(data: WorkoutInput):
    input_data = {
        "w1": data.w1,
        "r1": data.r1,
        "w2": data.w2,
        "r2": data.r2,
        "exercise": data.exercise,
        "volume": data.volume,
        "delta_weight": data.delta_weight,
        "delta_reps": data.delta_reps,
        "session_gap": data.session_gap
    }

    return predict_with_reason(input_data)


@app.get("/ml/feature-importance")
def get_feature_importance():
    importances_json_path = os.path.join(BASE_DIR, "models/feature_importances.json")
    if os.path.exists(importances_json_path):
        with open(importances_json_path, "r") as f:
            return json.load(f)
    else:
        return {"error": "Feature importances not found. Please train models first."}


@app.get("/ml/performance")
def get_performance():
    report_json_path = os.path.join(BASE_DIR, "models/benchmark_report.json")
    if os.path.exists(report_json_path):
        with open(report_json_path, "r") as f:
            return json.load(f)
    else:
        return {"error": "Benchmark report not found. Please run benchmark first."}