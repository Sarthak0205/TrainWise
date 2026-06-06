const Workout = require("../models/workout.model");
const Session = require("../models/session.model");
const { classifyExercise } = require("./exerciseRules");
const { predictWorkoutSet, checkMLServiceAvailability } = require("./ml.service");


/**
 * Rounds weights to standard gym plate increments (2.5 kg / 5 lbs)
 */
function roundToGymPlates(weight, units = "kg") {
    if (weight <= 0) return 0;
    const cleanWeight = Math.round(weight * 1000) / 1000;
    const step = units === "lbs" ? 5 : 2.5;
    return +(Math.round(cleanWeight / step) * step).toFixed(1);
}

async function generateRecommendations(user) {
    try {
        const userId = user._id;
        const goalType = user.goalType || "hypertrophy";
        const experienceLevel = user.experienceLevel || "intermediate";
        const preferredUnits = user.preferredUnits || "kg";

        // 0. Perform a fast health check on the ML Service first
        const mlOnline = await checkMLServiceAvailability();

        // 1. Isolate the most recent session for this user to identify the latest session
        const latestSession = await Session.findOne({ userId }).sort({ date: -1 });

        // ✅ Safety check FIRST
        if (!latestSession) {
            return {
                success: false,
                message: "No workout data found",
                data: [],
                mlServiceAvailable: mlOnline
            };
        }

        const latestDate = latestSession.date;

        // 2. Fetch only sets belonging to this latest session for this user
        const sessionExercises = await Workout.find({ userId, sessionId: latestSession._id });

        // Extract distinct exercises in this session
        const activeExercises = [...new Set(sessionExercises.map(s => s.exercise))];

        // 3. Fetch history of ONLY these active exercises for this user (extremely scalable)
        const historicalWorkouts = await Workout.find({ userId, exercise: { $in: activeExercises } }).sort({ date: -1 });

        // Group history by exercise name
        const historyMap = {};
        historicalWorkouts.forEach((w) => {
            if (!historyMap[w.exercise]) {
                historyMap[w.exercise] = [];
            }
            historyMap[w.exercise].push(w);
        });

        // Group latest session sets by exercise name
        const sessionExerciseMap = {};
        sessionExercises.forEach((w) => {
            if (!sessionExerciseMap[w.exercise]) {
                sessionExerciseMap[w.exercise] = [];
            }
            sessionExerciseMap[w.exercise].push(w);
        });

        let recommendations = [];

        // 4. Iterate over each exercise in the latest session to build hybrid suggestions
        for (const [exercise, activeSets] of Object.entries(sessionExerciseMap)) {
            const type = classifyExercise(exercise);

            // ❌ Skip irrelevant cardio or stretching exercises
            if (type === "cardio" || type === "ignore") continue;

            // Sort chronologically by setIndex ascending
            activeSets.sort((a, b) => a.setIndex - b.setIndex);

            // Calculate standard averages and isolate last session weight
            const avgReps = activeSets.reduce((sum, d) => sum + d.reps, 0) / activeSets.length;
            const lastWeight = activeSets[activeSets.length - 1].weight;

            // Define high priority for primary compound movements
            let priority = "medium";
            if (
                exercise.toLowerCase().includes("squat") ||
                exercise.toLowerCase().includes("bench") ||
                exercise.toLowerCase().includes("deadlift")
            ) {
                priority = "high";
            }

            // Define progression increment multiplier based on experience level
            let increaseMultiplier = 1.05;
            let percentStr = "5%";
            if (experienceLevel === "beginner") {
                increaseMultiplier = 1.075;
                percentStr = "7.5%";
            } else if (experienceLevel === "advanced") {
                increaseMultiplier = 1.025;
                percentStr = "2.5%";
            }

            // --- STEP A: HEURISTIC ANALYSIS ---
            let heuristicAction = "";
            let heuristicNextWeight = lastWeight;
            let heuristicTargetReps = "";
            let heuristicExplanation = "";

            if (type === "bodyweight") {
                if (avgReps < 8) {
                    heuristicAction = "improve strength";
                    heuristicTargetReps = "8–12";
                    heuristicExplanation = `Average reps of ${avgReps.toFixed(1)} fell below 8. Focus on developing baseline absolute strength.`;
                } else {
                    heuristicAction = "progress reps";
                    heuristicTargetReps = "12–15";
                    heuristicExplanation = `Average reps of ${avgReps.toFixed(1)} exceeded 8. Progress target reps to advance progression.`;
                }
            } else if (type === "core") {
                heuristicAction = "maintain or increase reps";
                heuristicTargetReps = "15–20";
                heuristicExplanation = "Target reps set to 15-20 to match core muscular endurance adaptation rules.";
            } else {
                // Strength / Isolation standard heuristics customized by goalType and experienceLevel
                if (goalType === "strength") {
                    heuristicTargetReps = "3–6";
                    if (avgReps >= 6) {
                        heuristicAction = "increase weight";
                        heuristicNextWeight = lastWeight * increaseMultiplier;
                        heuristicExplanation = `Average reps of ${avgReps.toFixed(1)} reached or exceeded 6, triggering a personalized ${percentStr} progressive overload weight increase for strength goal.`;
                    } else if (avgReps < 3) {
                        heuristicAction = "reduce weight";
                        heuristicNextWeight = lastWeight * 0.95;
                        heuristicExplanation = `Average reps of ${avgReps.toFixed(1)} fell below 3, triggering a standard 5% volume adjustment decrease for strength goal.`;
                    } else {
                        heuristicAction = "maintain weight";
                        heuristicNextWeight = lastWeight;
                        heuristicExplanation = `Average reps of ${avgReps.toFixed(1)} are within the strength zone (3-6 reps). Maintain current weight.`;
                    }
                } else if (goalType === "endurance") {
                    heuristicTargetReps = "15–20";
                    if (avgReps >= 20) {
                        heuristicAction = "increase weight";
                        heuristicNextWeight = lastWeight * increaseMultiplier;
                        heuristicExplanation = `Average reps of ${avgReps.toFixed(1)} reached or exceeded 20, triggering a personalized ${percentStr} progressive overload weight increase for endurance goal.`;
                    } else if (avgReps < 15) {
                        heuristicAction = "reduce weight";
                        heuristicNextWeight = lastWeight * 0.95;
                        heuristicExplanation = `Average reps of ${avgReps.toFixed(1)} fell below 15, triggering a standard 5% volume adjustment decrease for endurance goal.`;
                    } else {
                        heuristicAction = "maintain weight";
                        heuristicNextWeight = lastWeight;
                        heuristicExplanation = `Average reps of ${avgReps.toFixed(1)} are within the endurance zone (15-20 reps). Maintain current weight.`;
                    }
                } else {
                    // Hypertrophy / Default
                    heuristicTargetReps = "8–12";
                    if (avgReps >= 12) {
                        heuristicAction = "increase weight";
                        heuristicNextWeight = lastWeight * increaseMultiplier;
                        heuristicExplanation = `Average reps of ${avgReps.toFixed(1)} reached or exceeded 12, triggering a personalized ${percentStr} progressive overload weight increase for hypertrophy goal.`;
                    } else if (avgReps < 8) {
                        heuristicAction = "reduce weight";
                        heuristicNextWeight = lastWeight * 0.95;
                        heuristicExplanation = `Average reps of ${avgReps.toFixed(1)} fell below 8, triggering a standard 5% volume adjustment decrease for hypertrophy goal.`;
                    } else {
                        heuristicAction = "maintain weight";
                        heuristicNextWeight = lastWeight;
                        heuristicExplanation = `Average reps of ${avgReps.toFixed(1)} are within the hypertrophy zone (8-12 reps). Maintain current weight.`;
                    }
                }
            }

            // --- STEP B: INTELLIGENT FEATURE BUILDER ---
            let w1 = 0, r1 = 0, w2 = 0, r2 = 0;
            let hasSufficientHistory = false;

            if (activeSets.length >= 2) {
                // Scenario A: At least 2 sets in the latest session
                const set1 = activeSets[activeSets.length - 2];
                const set2 = activeSets[activeSets.length - 1];
                w1 = set1.weight;
                r1 = set1.reps;
                w2 = set2.weight;
                r2 = set2.reps;
                hasSufficientHistory = true;
            } else if (activeSets.length === 1 && historyMap[exercise] && historyMap[exercise].length >= 2) {
                // Scenario B: 1 set in latest session + previous history available
                // Find chronological sets from the previous training session
                const currentSessionDateStr = latestDate.toISOString().split("T")[0];
                
                // Filter out current session sets to look back at previous session dates
                const pastSets = historyMap[exercise].filter(
                    (w) => w.date.toISOString().split("T")[0] !== currentSessionDateStr
                );

                if (pastSets.length > 0) {
                    const prevSessionDateStr = pastSets[0].date.toISOString().split("T")[0];
                    const prevSessionSets = pastSets.filter(
                        (w) => w.date.toISOString().split("T")[0] === prevSessionDateStr
                    );

                    // Sort ascending by setIndex and grab the last set
                    prevSessionSets.sort((a, b) => a.setIndex - b.setIndex);
                    const prevLastSet = prevSessionSets[prevSessionSets.length - 1];

                    w1 = prevLastSet.weight;
                    r1 = prevLastSet.reps;
                    w2 = activeSets[0].weight;
                    r2 = activeSets[0].reps;
                    hasSufficientHistory = true;
                }
            }

            // Compute the remaining 4 features of the 8-feature contract
            let volume = 0;
            let delta_weight = 0;
            let delta_reps = 0;
            let session_gap = 3.0;
            let volChangeStr = "N/A";

            if (hasSufficientHistory) {
                volume = activeSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
                delta_weight = w2 - w1;
                delta_reps = r2 - r1;

                const today = new Date();
                const diffDays = (today.getTime() - latestDate.getTime()) / (1000 * 3600 * 24);
                session_gap = diffDays > 0 ? diffDays : 3.0;

                // Compute volume change percentage
                let prevVolume = 0;
                const currentSessionDateStr = latestDate.toISOString().split("T")[0];
                const pastSets = historyMap[exercise].filter(
                    (w) => w.date.toISOString().split("T")[0] !== currentSessionDateStr
                );
                if (pastSets.length > 0) {
                    const prevSessionDateStr = pastSets[0].date.toISOString().split("T")[0];
                    const prevSessionSets = pastSets.filter(
                        (w) => w.date.toISOString().split("T")[0] === prevSessionDateStr
                    );
                    prevVolume = prevSessionSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
                }

                if (prevVolume > 0) {
                    const pct = ((volume - prevVolume) / prevVolume) * 100;
                    volChangeStr = `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
                }
            }

            // --- STEP C: HYBRID ENGINE MERGE & SAFETY OVERRIDES ---
            let prediction = null;
            let currentMlAvailable = mlOnline;

            if (hasSufficientHistory && mlOnline) {
                prediction = await predictWorkoutSet(
                    exercise, 
                    w1, r1, 
                    w2, r2, 
                    volume, 
                    delta_weight, 
                    delta_reps, 
                    session_gap
                );
                if (!prediction) {
                    currentMlAvailable = false;
                }
            }

            let targetRepsRange = "8–12";
            if (goalType === "strength") {
                targetRepsRange = "3–6";
            } else if (goalType === "endurance") {
                targetRepsRange = "15–20";
            }

            let recommendation = {
                exercise,
                action: heuristicAction,
                nextWeight: roundToGymPlates(heuristicNextWeight, preferredUnits),
                targetReps: heuristicTargetReps,
                priority,
                source: "heuristic",
                reason: heuristicExplanation,
                explanation: `Why was this recommended?\n• Basis: Heuristic Fallback Rules (ML service offline/inactive)\n• Target overload calculated based on: ${heuristicExplanation}\n• Training Volume: Session volume changed by ${volChangeStr} compared to the previous workout`,
                mlServiceAvailable: currentMlAvailable
            };

            if (prediction) {
                const mlSuggestion = prediction.suggestion;
                const mlWeight = prediction.predicted_weight;
                const mlReps = prediction.predicted_reps;
                const fatigue = prediction.fatigue_score;
                const mlReason = prediction.reason;
                const confidence = prediction.confidence;
                const confidenceTier = prediction.confidence_tier || "Medium";

                recommendation.confidence = confidence;
                recommendation.confidenceTier = confidenceTier;
                recommendation.fatigueScore = fatigue;

                // Build detailed multi-line explanation parts
                const fatigueTier = fatigue > 5.0 ? "High (Safety Deload Enforced)" : fatigue > 2.5 ? "Moderate" : "Low";
                const fatigueText = `• Fatigue Coefficient: ${fatigue.toFixed(2)} (${fatigueTier})`;
                const volumeText = `• Training Volume: Session volume changed by ${volChangeStr} compared to the previous workout`;
                
                // 🛡️ Biomechanical Safety Override First (Elevated Fatigue or Reduce Weight)
                if (fatigue > 5.0 || mlSuggestion === "Reduce weight") {
                    const safetyWeight = roundToGymPlates(lastWeight * 0.90, preferredUnits);
                    recommendation.action = "reduce weight";
                    recommendation.nextWeight = safetyWeight;
                    recommendation.targetReps = targetRepsRange;
                    recommendation.source = "hybrid";
                    recommendation.reason = `Safety Override: High fatigue detected (score: ${fatigue.toFixed(1)}). ML recommends ${mlSuggestion.toLowerCase()}. Reason: ${mlReason || "None"}. Load safely reduced by 10%.`;
                    
                    const consensusText = `• Safety Override: Volume/rep drop triggered biomechanical safety protocols`;
                    const safetyActionText = `• Action Plan: Load reduced by 10% to ${safetyWeight} ${preferredUnits} for joint recovery`;

                    recommendation.explanation = `Why was this recommended?\n${consensusText}\n${volumeText}\n${fatigueText}\n${safetyActionText}`;
                } else {
                    const isAgreement = mlSuggestion.toLowerCase() === heuristicAction.toLowerCase();
                    const consensusText = isAgreement
                        ? `• Consensus: ML and Heuristic logic both agreed to "${mlSuggestion.toLowerCase()}"`
                        : `• Merge Decision: Heuristics suggested "${heuristicAction.toLowerCase()}" but ML predicted "${mlSuggestion.toLowerCase()}" (ML took precedence)`;
                    
                    // Progression or Maintenance decisions
                    if (mlSuggestion === "Increase weight") {
                        recommendation.action = "increase weight";
                        recommendation.nextWeight = roundToGymPlates(mlWeight, preferredUnits);
                        recommendation.targetReps = targetRepsRange;
                        recommendation.source = "hybrid";
                        recommendation.reason = `Progression: ML suggests increase (confidence: ${confidence}%). Reason: ${mlReason || "None"}.`;
                        
                        const predictionText = `• Overload Forecast: ML model projects progressive capacity of ${mlReps} reps at ${mlWeight} kg`;
                        recommendation.explanation = `Why was this recommended?\n${consensusText}\n${volumeText}\n${fatigueText}\n${predictionText}`;
                    } else if (mlSuggestion === "Maintain weight") {
                        recommendation.action = "maintain weight";
                        recommendation.nextWeight = roundToGymPlates(lastWeight, preferredUnits);
                        recommendation.targetReps = targetRepsRange;
                        recommendation.source = "hybrid";
                        recommendation.reason = `Maintenance: ML suggests maintaining current weight. Reason: ${mlReason || "None"}.`;
                        
                        const predictionText = `• Steady Progression: ML model recommends maintaining current load (${mlReps} reps forecast)`;
                        recommendation.explanation = `Why was this recommended?\n${consensusText}\n${volumeText}\n${fatigueText}\n${predictionText}`;
                    } else {
                        recommendation.action = heuristicAction;
                        recommendation.nextWeight = roundToGymPlates(heuristicNextWeight, preferredUnits);
                        recommendation.targetReps = heuristicTargetReps;
                        recommendation.source = "hybrid";
                        recommendation.reason = `Hybrid Merge: ML suggestion: ${mlSuggestion}. Reason: ${mlReason || heuristicExplanation}`;
                        
                        const predictionText = `• Hybrid Balance: ML predicted ${mlReps} reps at ${mlWeight} kg; heuristic rules applied: ${heuristicExplanation}`;
                        recommendation.explanation = `Why was this recommended?\n${consensusText}\n${volumeText}\n${fatigueText}\n${predictionText}`;
                    }
                }
            }

            recommendations.push(recommendation);
        }

        // ✅ Limit output to top 6 progressive suggestions
        recommendations = recommendations.slice(0, 6);

        return {
            success: true,
            data: recommendations,
            mlServiceAvailable: mlOnline
        };

    } catch (error) {
        console.error("❌ generateRecommendations error:", error);
        return {
            success: false,
            message: "Error generating recommendations",
            error: error.message
        };
    }
}

module.exports = { generateRecommendations };