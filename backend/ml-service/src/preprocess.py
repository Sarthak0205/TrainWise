import json
import pandas as pd
import os
import sys

# Add src to python path just in case
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from features import build_chronological_features

INPUT_PATH = "../data/raw/workouts.json"
OUTPUT_PATH = "../data/processed/workouts.csv"

def preprocess(data):
    df_raw = pd.DataFrame(data)
    return build_chronological_features(df_raw)

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.abspath(os.path.join(script_dir, INPUT_PATH))
    output_file = os.path.abspath(os.path.join(script_dir, OUTPUT_PATH))

    print(f"📖 Reading raw workouts from {input_file}...")
    with open(input_file, "r") as f:
        data = json.load(f)

    df = preprocess(data)

    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    df.to_csv(output_file, index=False)
    print(f"✅ Created {len(df)} training samples at {output_file}")

if __name__ == "__main__":
    main()