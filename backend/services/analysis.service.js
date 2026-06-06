const Workout = require("../models/workout.model");
const Session = require("../models/session.model");
const {
    classifyExercise,
    getMovementPattern,
} = require("./exerciseRules");

// 📊 PROGRESS + PLATEAU ANALYSIS
function analyzeProgress(workouts) {
    const exerciseHistory = {};

    workouts.forEach((w) => {
        if (!exerciseHistory[w.exercise]) {
            exerciseHistory[w.exercise] = [];
        }
        exerciseHistory[w.exercise].push(w);
    });

    let progressNotes = [];
    let plateauExercises = []; // >= 5 sessions of stagnation
    let riskExercises = []; // 3-4 sessions of stagnation

    Object.entries(exerciseHistory).forEach(([exercise, data]) => {
        // Group historical sets by unique calendar date to identify actual training days
        const dayMap = {};
        data.forEach(d => {
            const dayStr = new Date(d.date).toISOString().split("T")[0];
            if (!dayMap[dayStr]) dayMap[dayStr] = [];
            dayMap[dayStr].push(d);
        });

        const sortedDays = Object.keys(dayMap).sort();
        const numSessions = sortedDays.length;

        // < 3 sessions -> No plateau evaluation
        if (numSessions < 3) return;

        // Calculate max estimated 1RM for each session
        const sessionMaxEst1RMs = sortedDays.map(dayStr => {
            const sets = dayMap[dayStr];
            let maxEst = 0;
            sets.forEach(s => {
                const est = s.weight * (1 + s.reps / 30);
                if (est > maxEst) maxEst = est;
            });
            return maxEst;
        });

        const recentPerformances = sessionMaxEst1RMs.slice(-5);
        const firstPerf = recentPerformances[0];
        const lastPerf = recentPerformances[recentPerformances.length - 1];

        // 📈 Progression checks (greater than 1% increase over the span)
        if (lastPerf > firstPerf * 1.01) {
            progressNotes.push(exercise);
            return;
        }

        // Stagnation: all recent performances are <= first performance (with 1% buffer)
        let isStagnant = true;
        for (let i = 1; i < recentPerformances.length; i++) {
            if (recentPerformances[i] > firstPerf * 1.01) {
                isStagnant = false;
                break;
            }
        }

        if (isStagnant) {
            if (numSessions >= 5) {
                plateauExercises.push(exercise);
            } else {
                riskExercises.push(exercise);
            }
        }
    });

    return { progressNotes, plateauExercises, riskExercises };
}

// 🧠 MAIN ANALYSIS
async function analyzeWorkout(userId) {
    // 1. Isolate the most recent session for this user to identify the latest session
    const latestSession = await Session.findOne({ userId }).sort({ date: -1 });

    if (!latestSession) {
        return { message: "No data available" };
    }

    // 2. Fetch only sets belonging to this latest session for this user
    const session = await Workout.find({ userId, sessionId: latestSession._id });

    if (session.length === 0) {
        return { message: "No data available" };
    }

    // 3. Extract the active exercises in this session
    const activeExercises = [...new Set(session.map(s => s.exercise))];

    // 4. Fetch the history of ONLY these active exercises for this user (extremely scalable)
    const workouts = await Workout.find({ userId, exercise: { $in: activeExercises } }).sort({ date: -1 });

    // Group sets by exercise for current session
    const exerciseMap = {};
    session.forEach((w) => {
        if (!exerciseMap[w.exercise]) {
            exerciseMap[w.exercise] = [];
        }
        exerciseMap[w.exercise].push(w);
    });

    // Initialize structured outputs for Coach UI
    const exerciseSummary = [];
    const trainingWins = [];
    const observations = [];
    const warnings = [];
    const suggestedAdjustments = [];
    
    let issues = [];
    let optimization = [];
    let analysisNotes = [];
    let rules = [
        "Do not duplicate same movement pattern",
        "Cap sets per exercise at 6",
        "Each set must be close to failure",
    ];

    // 📈 Run audited progression & plateau checks
    const { progressNotes, plateauExercises, riskExercises } = analyzeProgress(workouts);

    // 🔍 SESSION ANALYSIS
    Object.entries(exerciseMap).forEach(([exercise, sets]) => {
        const type = classifyExercise(exercise);
        const pattern = getMovementPattern(exercise);

        if (type === "ignore") return;

        const totalSets = sets.length;
        sets.sort((a, b) => a.setIndex - b.setIndex);

        const avgReps = sets.reduce((sum, s) => sum + s.reps, 0) / sets.length;
        const avgWeight = sets.reduce((sum, s) => sum + s.weight, 0) / sets.length;

        // Populate structured exercise summary cards
        exerciseSummary.push({
            name: exercise,
            category: type,
            setCount: totalSets,
            avgReps: +avgReps.toFixed(1),
            avgWeight: +avgWeight.toFixed(1)
        });

        analysisNotes.push(
            `${exercise} (${type}): ${totalSets} sets, avg reps ${avgReps.toFixed(1)} @ ${avgWeight.toFixed(1)}kg`
        );

        if (type === "cardio") return;

        // Check if sets maintained stable rep output (reps drop by > 2 at same weight)
        let fatigueDrop = false;
        for (let i = 1; i < sets.length; i++) {
            if (
                sets[i].weight === sets[i - 1].weight &&
                sets[i].reps < sets[i - 1].reps - 2
            ) {
                fatigueDrop = true;
            }
        }

        if (fatigueDrop) {
            // Elevated Fatigue Risk (RED ALERT)
            warnings.push({
                type: "red",
                title: "Elevated Fatigue Risk",
                message: `Significant performance drop detected during ${exercise.split(" (")[0]} sets. Joint strain might be elevated.`
            });
            suggestedAdjustments.push(`Reduce workload or increase rest intervals on ${exercise.split(" (")[0]} next session.`);
            issues.push(`${exercise}: Reps drop detected`);
        } else {
            // Positive rep stability win
            trainingWins.push(`Consistent rep performance on ${exercise.split(" (")[0]}`);
        }

        // Bodyweight rep guidelines
        if (type === "bodyweight" && avgReps < 8) {
            warnings.push({
                type: "amber",
                title: "Training Balance",
                message: `Lower rep output on bodyweight movement: ${exercise.split(" (")[0]}. Focus on developing baseline control.`
            });
            suggestedAdjustments.push(`Focus on building rep volume up to 8-12 reps on ${exercise.split(" (")[0]} before adding external resistance.`);
        }

        // Core guidelines
        if (type === "core" && avgReps < 12) {
            warnings.push({
                type: "amber",
                title: "Training Balance",
                message: `Rep volume is low on ${exercise.split(" (")[0]} abdominal work.`
            });
            suggestedAdjustments.push(`Gradually increase rep counts to 15-20 reps for optimal core conditioning on ${exercise.split(" (")[0]}.`);
        }

        // Strength load warnings
        if (avgReps > 15 && type !== "core" && type !== "bodyweight") {
            suggestedAdjustments.push(`Consider raising weight increments slightly on ${exercise.split(" (")[0]} next session.`);
            optimization.push(`${exercise}: Increase weight`);
        }

        // Junk volume sets warning
        if (totalSets > 8) {
            warnings.push({
                type: "amber",
                title: "Training Balance Observation",
                message: `Logging ${totalSets} sets of ${exercise.split(" (")[0]} may exceed effective recovery thresholds (junk volume).`
            });
            suggestedAdjustments.push(`Consider capping sets per exercise between 4-6 sets to maximize high-quality sets.`);
        }
    });

    // 🔁 DUPLICATE MOVEMENT PATTERN OBSERVATIONS
    const patternMap = {};
    Object.keys(exerciseMap).forEach((exercise) => {
        const pattern = getMovementPattern(exercise);
        if (!patternMap[pattern]) patternMap[pattern] = [];
        patternMap[pattern].push(exercise);
    });

    Object.entries(patternMap).forEach(([pattern, exercises]) => {
        if (exercises.length > 1 && pattern !== "other") {
            const cleanPattern = pattern.charAt(0).toUpperCase() + pattern.slice(1);
            if (pattern === "legs") {
                // Amber warning for overlapping lower-body compound movements
                warnings.push({
                    type: "amber",
                    title: "Recovery Awareness",
                    message: `Monitor recovery because several leg-focused movements (${exercises.map(e => e.split(" (")[0]).join(", ")}) were trained in the same session.`
                });
                suggestedAdjustments.push("Consider reducing overlapping lower-body compound volume if systemic recovery becomes difficult.");
                observations.push(`Multiple lower-body compound movements trained in the same session (${exercises.map(e => e.split(" (")[0]).join(", ")}).`);
            } else {
                // Normal observation for duplicate upper-body movements
                observations.push(`Multiple ${cleanPattern} patterns trained in the same session: ${exercises.map(e => e.split(" (")[0]).join(", ")}.`);
                suggestedAdjustments.push(`Focus on keeping a single primary ${cleanPattern} exercise if workout length is excessive.`);
            }
        }
    });

    // 📈 Plateau Alert Tiers
    plateauExercises.forEach(ex => {
        warnings.push({
            type: "amber",
            title: "Potential Plateau Detected",
            message: `${ex.split(" (")[0]} has shown no strength progression across 5+ consecutive training sessions.`
        });
        suggestedAdjustments.push(`Consider swapping ${ex.split(" (")[0]} for a variation or taking a minor 10% deload to spark fresh progression.`);
    });

    riskExercises.forEach(ex => {
        warnings.push({
            type: "amber",
            title: "Progress Worth Monitoring",
            message: `Progression pace on ${ex.split(" (")[0]} has flattened over the last 3-4 sessions.`
        });
        suggestedAdjustments.push(`Monitor recovery and execution form closely on ${ex.split(" (")[0]} next time you train it.`);
    });

    // Celebrate progression wins
    progressNotes.forEach(ex => {
        trainingWins.push(`Steady strength progression on ${ex.split(" (")[0]}`);
    });

    // 3. Dynamic Coach session summary generation
    let sessionType = "mixed training session";
    const patternCounts = { lower: 0, upper: 0 };
    activeExercises.forEach(ex => {
        const pattern = getMovementPattern(ex);
        if (pattern === "legs") {
            patternCounts.lower++;
        } else if (pattern !== "other") {
            patternCounts.upper++;
        }
    });

    if (patternCounts.lower > patternCounts.upper && patternCounts.lower > 0) {
        sessionType = "lower-body focused session";
    } else if (patternCounts.upper > patternCounts.lower && patternCounts.upper > 0) {
        sessionType = "upper-body focused session";
    }

    // Dynamic session volume comparison vs past average
    let volumeObserver = "";
    const recentSessions = await Session.find({ userId }).sort({ date: -1 }).limit(5);
    if (recentSessions.length > 1) {
        const recentSessionIds = recentSessions.map(s => s._id);
        const recentSets = await Workout.find({ userId, sessionId: { $in: recentSessionIds } });
        const volumeMap = {};
        recentSets.forEach(s => {
            if (!volumeMap[s.sessionId]) volumeMap[s.sessionId] = 0;
            volumeMap[s.sessionId] += s.weight * s.reps;
        });

        const latestVol = volumeMap[latestSession._id] || 0;
        const otherVols = Object.entries(volumeMap)
            .filter(([sid]) => sid !== latestSession._id.toString())
            .map(([, vol]) => vol);

        if (otherVols.length > 0) {
            const avgOtherVol = otherVols.reduce((sum, v) => sum + v, 0) / otherVols.length;
            if (latestVol > avgOtherVol * 1.05) {
                const percentIncrease = Math.round(((latestVol - avgOtherVol) / avgOtherVol) * 100);
                volumeObserver = `Your training volume was significantly higher than your recent average by ${percentIncrease}%.`;
                observations.push(`Session volume increased by ${percentIncrease}% compared to your average baseline.`);
            }
        }
    }

    let sessionSummaryText = `Strong ${sessionType}. You successfully logged ${activeExercises.length} active exercises with a total of ${session.length} sets.`;
    if (volumeObserver) {
        sessionSummaryText += ` ${volumeObserver}`;
    }
    if (warnings.some(w => w.type === "red" || w.title === "Recovery Awareness")) {
        sessionSummaryText += ` Recovery should be monitored before your next high-intensity workout.`;
    } else {
        sessionSummaryText += ` Overall recovery looks optimal. Maintain this workload to build steady physical adaptation.`;
    }

    // Default general wins if no issues
    if (trainingWins.length === 0) {
        trainingWins.push("Logged all planned sets successfully");
    }
    if (warnings.length === 0) {
        trainingWins.push("No major recovery concerns detected");
    }

    // Clean up defaults for suggestedAdjustments
    if (suggestedAdjustments.length === 0) {
        suggestedAdjustments.push("Progression is optimal. Maintain current volume if recovery remains strong.");
        suggestedAdjustments.push("Ensure 48-72 hours of recovery before training these same muscle groups.");
    }

    // 📅 NEXT SESSION ADVISORY DECISION
    const nextSession = {
        suggestion:
            plateauExercises.length > 0
                ? "Potential Plateau Detected → Consider modifying rep ranges or focusing on recovery pacing."
                : warnings.length > 0
                    ? "Monitor recovery pace closely before increasing load on main lifts next session."
                    : "Progression is optimal. Consider adding slight weight increments next session."
    };

    return {
        sessionAnalysis: analysisNotes.join(" | "),
        activeExercises,
        progress: progressNotes,
        plateau: plateauExercises,
        criticalIssues: issues.slice(0, 3), // backward compatibility
        optimization, // backward compatibility
        nextSession,
        rules,
        
        // Polished Coach API properties
        sessionSummary: sessionSummaryText,
        exerciseSummary,
        trainingWins,
        observations,
        warnings,
        suggestedAdjustments
    };
}

module.exports = { analyzeWorkout };