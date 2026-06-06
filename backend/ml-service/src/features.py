import pandas as pd
import numpy as np

def build_chronological_features(df_raw):
    """
    Builds training examples from raw sets dataframe.
    Groups sets by exercise, sorts chronologically, and aligns consecutive sessions.
    """
    df = df_raw.copy()
    df["date"] = pd.to_datetime(df["date"])
    
    rows = []
    # Group by exercise
    for exercise_name, ex_group in df.groupby("exercise"):
        # Group by date to get sessions
        session_dates = sorted(ex_group["date"].unique())
        if len(session_dates) < 2:
            continue
            
        # Extract sets for each session date
        sessions = []
        for d in session_dates:
            sets = ex_group[ex_group["date"] == d].sort_values("setIndex").to_dict("records")
            sessions.append({
                "date": d,
                "sets": sets
            })
            
        for j in range(len(sessions) - 1):
            curr_sess = sessions[j]
            next_sess = sessions[j + 1]
            
            curr_sets = curr_sess["sets"]
            next_sets = next_sess["sets"]
            
            if not curr_sets or not next_sets:
                continue
                
            # Current session set info
            set_last = curr_sets[-1]
            w2 = set_last["weight"]
            r2 = set_last["reps"]
            
            if len(curr_sets) >= 2:
                set_pen = curr_sets[-2]
                w1 = set_pen["weight"]
                r1 = set_pen["reps"]
            else:
                # Scenario B: fallback to previous session
                if j > 0 and len(sessions[j - 1]["sets"]) > 0:
                    prev_last = sessions[j - 1]["sets"][-1]
                    w1 = prev_last["weight"]
                    r1 = prev_last["reps"]
                else:
                    w1 = w2
                    r1 = r2
                    
            # Compute feature values
            volume = sum(s["weight"] * s["reps"] for s in curr_sets)
            delta_weight = w2 - w1
            delta_reps = r2 - r1
            
            # session gap in days
            session_gap = (next_sess["date"] - curr_sess["date"]).total_seconds() / 86400.0
            
            # Target values in the next session (first set)
            next_weight = next_sets[0]["weight"]
            next_reps = next_sets[0]["reps"]
            
            rows.append({
                "exercise": exercise_name,
                "w1": float(w1),
                "r1": int(r1),
                "w2": float(w2),
                "r2": int(r2),
                "volume": float(volume),
                "delta_weight": float(delta_weight),
                "delta_reps": float(delta_reps),
                "session_gap": float(session_gap),
                "session_date": curr_sess["date"].isoformat(),
                "next_weight": float(next_weight),
                "next_reps": float(next_reps)
            })
            
    return pd.DataFrame(rows)
