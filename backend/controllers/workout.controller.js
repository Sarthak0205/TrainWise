const fs = require("fs");
const csv = require("csv-parser");
const Workout = require("../models/workout.model");
const Session = require("../models/session.model");
const { analyzeWorkout } = require("../services/analysis.service");
const { generateRecommendations } = require("../services/recommendation.service");
const {
    getUserDashboardSummary,
    getUserSessions,
    getExerciseAnalytics
} = require("../services/analytics.service");

/**
 * Parses a CSV file into structured objects asynchronously
 */
function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (data) => {
                results.push(data);
            })
            .on("end", () => {
                resolve(results);
            })
            .on("error", (error) => {
                reject(error);
            });
    });
}

/**
 * Upload and parse CSV workout history
 */
async function uploadCSV(req, res) {
    // 🛡️ 1. Payload and existence validation
    if (!req.file) {
        return res.status(400).json({ error: "❌ No file uploaded" });
    }

    const filePath = req.file.path;

    try {
        // 🛡️ 2. File type validation
        if (!req.file.originalname.match(/\.(csv)$/i)) {
            return res.status(400).json({ error: "❌ Only CSV files are allowed" });
        }

        // 🔄 3. Parse CSV rows
        const rawRows = await parseCSV(filePath);
        if (rawRows.length === 0) {
            return res.status(400).json({ error: "❌ Uploaded CSV is empty" });
        }

        // 🔄 4. Map and validate individual row schema
        const formattedData = [];
        const skippedRows = [];

        rawRows.forEach((row, idx) => {
            const exercise = row.exercise_title ? row.exercise_title.trim() : "";
            const weight = parseFloat(row.weight_kg);
            const reps = parseInt(row.reps);
            const setIndex = parseInt(row.set_index);
            const dateStr = row.start_time;

            // Row-level validation
            if (!exercise || isNaN(weight) || isNaN(reps) || isNaN(setIndex) || !dateStr) {
                skippedRows.push({ index: idx + 1, reason: "Malformed or missing fields" });
                return;
            }

            const parsedDate = new Date(dateStr);
            if (isNaN(parsedDate.getTime())) {
                skippedRows.push({ index: idx + 1, reason: "Invalid date format" });
                return;
            }

            formattedData.push({
                exercise,
                weight,
                reps,
                setIndex,
                date: parsedDate
            });
        });

        if (formattedData.length === 0) {
            return res.status(400).json({ 
                error: "❌ No valid workout rows could be parsed from the CSV", 
                skipped: skippedRows 
            });
        }

        // 🛡️ 5. Smart duplicate prevention strategy with session creation per user
        // Extract distinct calendar dates present in the uploaded dataset
        const distinctDates = [...new Set(formattedData.map(row => row.date.toISOString()))]
            .map(dateStr => new Date(dateStr));

        const sessionMap = {};
        for (const date of distinctDates) {
            const dateISO = date.toISOString();
            let session = await Session.findOne({ userId: req.user._id, date });
            if (!session) {
                const dateOnlyStr = dateISO.split("T")[0];
                session = await Session.create({
                    userId: req.user._id,
                    date,
                    name: `Workout Session on ${dateOnlyStr}`
                });
            }
            sessionMap[dateISO] = session._id;
        }

        // Assign userId and sessionId to each formatted data item
        formattedData.forEach(row => {
            row.userId = req.user._id;
            row.sessionId = sessionMap[row.date.toISOString()];
        });

        // Query DB to find any existing records matching these specific dates FOR THIS USER ONLY
        const existingRecords = await Workout.find({ userId: req.user._id, date: { $in: distinctDates } });

        // Build a hashing lookup set for existing records: "exercise_date_setindex"
        const existingKeys = new Set(
            existingRecords.map(w => `${w.exercise.toLowerCase()}_${w.date.toISOString()}_${w.setIndex}`)
        );

        // Filter formatted data to keep only non-duplicate rows
        const uniqueImports = formattedData.filter(row => {
            const rowKey = `${row.exercise.toLowerCase()}_${row.date.toISOString()}_${row.setIndex}`;
            return !existingKeys.has(rowKey);
        });

        const duplicateCount = formattedData.length - uniqueImports.length;

        // 🔄 6. Perform bulk insertion
        if (uniqueImports.length > 0) {
            await Workout.insertMany(uniqueImports);
        }

        return res.json({
            message: "✅ Data processed successfully",
            summary: {
                totalParsed: rawRows.length,
                inserted: uniqueImports.length,
                skippedDuplicates: duplicateCount,
                skippedMalformed: skippedRows.length
            },
            warnings: skippedRows.length > 0 ? skippedRows : undefined
        });

    } catch (err) {
        console.error("❌ CSV Upload Processing Error:", err);
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
    } finally {
        // 🛡️ 7. Guarantee absolute cleanup of uploaded temporary file
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`⚠️ Cleanup failed for temporary file at ${filePath}:`, err.message);
                } else {
                    console.log(`🗑️ Successfully deleted temporary file: ${filePath}`);
                }
            });
        }
    }
}

/**
 * Get dynamic session progress and plateau analysis
 */
async function getWorkoutAnalysis(req, res) {
    try {
        const result = await analyzeWorkout(req.user._id);
        return res.json(result);
    } catch (err) {
        console.error("❌ Workout Analysis API Error:", err);
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
}

/**
 * Get progressive overload recommendations
 */
async function getWorkoutRecommendations(req, res) {
    try {
        const result = await generateRecommendations(req.user);
        return res.json(result);
    } catch (err) {
        console.error("❌ Workout Recommendations API Error:", err);
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
}

/**
 * Get overall dashboard analytics summary for the logged-in user
 */
async function getDashboardSummary(req, res) {
    try {
        const summary = await getUserDashboardSummary(req.user._id);
        return res.json(summary);
    } catch (err) {
        console.error("❌ Dashboard Summary Controller Error:", err);
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
}

/**
 * Get paginated session history for the logged-in user
 */
async function getSessionHistory(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const history = await getUserSessions(req.user._id, limit, page);
        return res.json(history);
    } catch (err) {
        console.error("❌ Session History Controller Error:", err);
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
}

/**
 * Get detailed analytics for a specific exercise for the logged-in user
 */
async function getExerciseAnalyticsHandler(req, res) {
    try {
        const exerciseName = req.params.exercise;
        if (!exerciseName) {
            return res.status(400).json({ error: "❌ Exercise name is required" });
        }
        const analytics = await getExerciseAnalytics(req.user._id, exerciseName);
        if (!analytics) {
            return res.status(404).json({ error: `❌ No history found for exercise: ${exerciseName}` });
        }
        return res.json(analytics);
    } catch (err) {
        console.error("❌ Exercise Analytics Controller Error:", err);
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
}

module.exports = {
    uploadCSV,
    getWorkoutAnalysis,
    getWorkoutRecommendations,
    getDashboardSummary,
    getSessionHistory,
    getExerciseAnalytics: getExerciseAnalyticsHandler
};
