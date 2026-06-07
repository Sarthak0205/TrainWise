const Workout = require("../models/workout.model");
const Session = require("../models/session.model");
const { normalizeDate } = require("./dailyLog.service");

// Default common exercise list for autocomplete
const DEFAULT_EXERCISES = [
    "Bench Press",
    "Squat",
    "Deadlift",
    "Lat Pulldown",
    "Leg Press",
    "Shoulder Press",
    "Barbell Curl",
    "Tricep Pushdown",
    "Incline Bench Press",
    "Romanian Deadlift",
    "Pull-Ups",
    "Dumbbell Lateral Raise",
    "Dumbbell Bicep Curl",
    "Cable Row",
    "Lunge",
    "Leg Curl",
    "Leg Extension"
];

/**
 * Calculates estimated One Rep Max (1RM) using Epley's Formula
 */
function calculateEst1RM(weight, reps) {
    if (weight <= 0 || reps <= 0) return 0;
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
}

/**
 * Validates the manually submitted workout session data
 */
function validateWorkoutSession(sessionData) {
    const errors = [];

    if (!sessionData) {
        return { isValid: false, errors: ["No session data provided."] };
    }

    if (!sessionData.date) {
        errors.push("Workout date is required.");
    } else {
        const parsedDate = new Date(sessionData.date);
        if (isNaN(parsedDate.getTime())) {
            errors.push("Invalid workout date format.");
        }
    }

    if (!sessionData.exercises || !Array.isArray(sessionData.exercises) || sessionData.exercises.length === 0) {
        errors.push("At least one exercise is required.");
    } else {
        sessionData.exercises.forEach((ex, exIdx) => {
            const exName = ex.exercise ? ex.exercise.trim() : "";
            if (!exName) {
                errors.push(`Exercise name is required at item ${exIdx + 1}.`);
            }

            if (!ex.sets || !Array.isArray(ex.sets) || ex.sets.length === 0) {
                errors.push(`At least one set is required for exercise "${exName || `Item ${exIdx + 1}`}".`);
            } else {
                ex.sets.forEach((set, setIdx) => {
                    const weight = Number(set.weight);
                    const reps = Number(set.reps);

                    if (set.weight === undefined || set.weight === null || isNaN(weight) || weight < 0) {
                        errors.push(`Exercise "${exName}": Set ${setIdx + 1} must have a valid weight (>= 0).`);
                    }
                    if (set.reps === undefined || set.reps === null || isNaN(reps) || reps < 1) {
                        errors.push(`Exercise "${exName}": Set ${setIdx + 1} must have a valid reps count (>= 1).`);
                    }
                });
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Calculates the total training volume for a session
 */
function calculateSessionVolume(sessionData) {
    if (!sessionData || !sessionData.exercises) return 0;
    let volume = 0;
    sessionData.exercises.forEach((ex) => {
        if (ex.sets && Array.isArray(ex.sets)) {
            ex.sets.forEach((set) => {
                const w = Number(set.weight) || 0;
                const r = Number(set.reps) || 0;
                volume += w * r;
            });
        }
    });
    return volume;
}

/**
 * Saves or updates a manual workout session in the database
 * Supports append and replace modes
 */
async function saveWorkoutSession(userId, sessionData, mode = "append") {
    const targetDate = normalizeDate(sessionData.date);
    const dateISO = targetDate.toISOString();
    const dateOnlyStr = dateISO.split("T")[0];

    // Find or create session
    let session = await Session.findOne({ userId, date: targetDate });
    if (!session) {
        session = await Session.create({
            userId,
            date: targetDate,
            name: `Workout Session on ${dateOnlyStr}`,
            source: "manual",
            notes: sessionData.notes || ""
        });
    } else {
        // Update notes and source on existing session
        session.notes = sessionData.notes || session.notes || "";
        session.source = "manual";
        await session.save();
    }

    const exerciseSetCount = {};

    if (mode === "replace") {
        // Overwrite mode: delete all existing workouts associated with this session
        await Workout.deleteMany({ userId, sessionId: session._id });
    } else {
        // Append mode: load existing sets to determine starting set indexes
        const existingWorkouts = await Workout.find({ userId, sessionId: session._id });
        existingWorkouts.forEach((w) => {
            exerciseSetCount[w.exercise] = Math.max(exerciseSetCount[w.exercise] || 0, w.setIndex);
        });
    }

    const workoutsToInsert = [];
    sessionData.exercises.forEach((ex) => {
        const exerciseName = ex.exercise.trim();
        if (!exerciseSetCount[exerciseName]) {
            exerciseSetCount[exerciseName] = 0;
        }

        ex.sets.forEach((set) => {
            exerciseSetCount[exerciseName]++;
            workoutsToInsert.push({
                userId,
                sessionId: session._id,
                exercise: exerciseName,
                weight: Number(set.weight) || 0,
                reps: Number(set.reps) || 0,
                setIndex: exerciseSetCount[exerciseName],
                date: targetDate
            });
        });
    });

    let insertedWorkouts = [];
    if (workoutsToInsert.length > 0) {
        insertedWorkouts = await Workout.insertMany(workoutsToInsert);
    }

    return {
        session,
        workouts: insertedWorkouts
    };
}

/**
 * Fetches the user's historical performance reference hints for a specific exercise
 */
async function getExerciseReferenceData(userId, exerciseName) {
    if (!exerciseName) return { lastSession: null, previousBest: null };

    const nameTrimmed = exerciseName.trim();

    // 1. Fetch Previous Best (all-time max estimated 1RM)
    const allWorkouts = await Workout.find({ userId, exercise: nameTrimmed });
    let previousBest = null;
    let maxEst1RM = 0;

    allWorkouts.forEach((w) => {
        const est1RM = calculateEst1RM(w.weight, w.reps);
        if (est1RM > maxEst1RM) {
            maxEst1RM = est1RM;
            previousBest = {
                weight: w.weight,
                reps: w.reps,
                est1RM: +est1RM.toFixed(1),
                date: w.date
            };
        }
    });

    // 2. Fetch Last Session sets
    const latestWorkout = await Workout.findOne({ userId, exercise: nameTrimmed }).sort({ date: -1 });
    let lastSession = null;
    if (latestWorkout) {
        const sets = await Workout.find({
            userId,
            exercise: nameTrimmed,
            date: latestWorkout.date
        }).sort({ setIndex: 1 });

        lastSession = {
            date: latestWorkout.date,
            sets: sets.map((s) => ({
                weight: s.weight,
                reps: s.reps
            }))
        };
    }

    return {
        lastSession,
        previousBest
    };
}

module.exports = {
    DEFAULT_EXERCISES,
    validateWorkoutSession,
    calculateSessionVolume,
    saveWorkoutSession,
    getExerciseReferenceData
};
