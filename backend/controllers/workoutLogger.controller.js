const Workout = require("../models/workout.model");
const workoutLoggerService = require("../services/workoutLogger.service");

/**
 * Validates and saves a manually logged workout session
 */
async function saveWorkoutSession(req, res, next) {
    try {
        const { mode = "append", ...sessionData } = req.body;

        // Verify mode value
        if (mode !== "append" && mode !== "replace") {
            return res.status(400).json({
                success: false,
                message: "Invalid save mode. Supported modes are 'append' and 'replace'."
            });
        }

        // Validate session payload
        const validation = workoutLoggerService.validateWorkoutSession(sessionData);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: "Validation failed.",
                errors: validation.errors
            });
        }

        // Save session
        const result = await workoutLoggerService.saveWorkoutSession(req.user._id, sessionData, mode);
        const volume = workoutLoggerService.calculateSessionVolume(sessionData);

        return res.status(200).json({
            success: true,
            message: `Workout saved successfully in ${mode} mode.`,
            summary: {
                exercisesCount: sessionData.exercises.length,
                setsCount: sessionData.exercises.reduce((sum, ex) => sum + ex.sets.length, 0),
                volume
            },
            data: {
                session: result.session,
                workoutsCount: result.workouts.length
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Retrieves autocomplete exercise names
 */
async function getExercises(req, res, next) {
    try {
        const userExercises = await Workout.distinct("exercise", { userId: req.user._id });
        
        // Combine user's exercises with standard default lists
        const combined = [...userExercises, ...workoutLoggerService.DEFAULT_EXERCISES];
        const unique = Array.from(new Set(combined.map(e => e.trim()))).filter(Boolean);
        unique.sort((a, b) => a.localeCompare(b));

        return res.status(200).json({
            success: true,
            data: unique
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Retrieves historical performance reference hints for a specific exercise
 */
async function getExerciseReference(req, res, next) {
    try {
        const { exerciseName } = req.query;
        if (!exerciseName) {
            return res.status(400).json({
                success: false,
                message: "Query parameter 'exerciseName' is required."
            });
        }

        const data = await workoutLoggerService.getExerciseReferenceData(req.user._id, exerciseName);
        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    saveWorkoutSession,
    getExercises,
    getExerciseReference
};
