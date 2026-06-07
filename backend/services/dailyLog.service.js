const DailyLog = require("../models/dailyLog.model");

/**
 * Normalizes a date string or Date object to UTC midnight (start of day)
 */
function normalizeDate(dateInput) {
    const d = dateInput ? new Date(dateInput) : new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

/**
 * Translates daily check-in data into coaching context, a recovery score,
 * status, human-friendly explanation, and a readiness modifier (max ±5).
 */
function calculateRecoveryContext(logData) {
    const sleep = Number(logData.sleep) || 3;
    const energy = Number(logData.energy) || 3;
    const mood = Number(logData.mood) || 3;
    const soreness = Number(logData.soreness) || 3;
    const stress = Number(logData.stress) || 3;

    // Normalizing negative factors (soreness & stress) so that 5 becomes 1 and 1 becomes 5
    const normSoreness = 6 - soreness;
    const normStress = 6 - stress;

    // Total ranges from 5 to 25
    const total = sleep + energy + mood + normSoreness + normStress;
    const score = Math.round((total - 5) / 20 * 100); // 0 to 100

    let status = "Neutral Recovery Signals";
    let modifier = 0;
    
    if (score >= 85) {
        status = "Strong Recovery Signals";
        modifier = 5;
    } else if (score >= 65) {
        status = "Positive Recovery Signals";
        modifier = 3;
    } else if (score >= 45) {
        status = "Neutral Recovery Signals";
        modifier = 0;
    } else if (score >= 25) {
        status = "Recovery Attention Recommended";
        modifier = -3;
    } else {
        status = "Recovery Attention High";
        modifier = -5;
    }

    // Generate dynamic human explanation based on user's logged indicators
    const points = [];
    if (energy >= 4) points.push("High energy");
    if (energy <= 2) points.push("Low energy");
    
    if (sleep >= 4) points.push("Quality sleep");
    if (sleep <= 2) points.push("Poor sleep quality");
    
    if (soreness >= 4) points.push("Elevated soreness");
    if (soreness <= 2) points.push("Low soreness");

    if (stress >= 4) points.push("Increased stress");
    if (stress <= 2) points.push("Low stress levels");
    
    if (mood >= 4) points.push("Positive mood");
    if (mood <= 2) points.push("Low mood/apathy");

    let explanation = "";
    if (status === "Strong Recovery Signals") {
        const bullets = points.filter(p => p.includes("High") || p.includes("Quality") || p.includes("Low soreness") || p.includes("Low stress") || p.includes("Positive"));
        explanation = `Strong Recovery Signals\n\nYou reported:\n${bullets.length > 0 ? bullets.map(b => `• ${b}`).join("\n") : "• Excellent overall indicators"}\n\nThese indicators support normal training intensity.`;
    } else if (status === "Positive Recovery Signals") {
        explanation = "Positive Recovery Signals\n\nYou reported favorable recovery indicators with good sleep/energy and manageable soreness. Ready for solid training.";
    } else if (status === "Neutral Recovery Signals") {
        explanation = "Neutral Recovery Signals\n\nYour recovery indicators are moderate. Standard training guidance applies.";
    } else if (status === "Recovery Attention Recommended") {
        const bullets = points.filter(p => p.includes("Poor") || p.includes("Elevated") || p.includes("Increased") || p.includes("Low energy") || p.includes("Low mood"));
        explanation = `Recovery Attention Recommended\n\nYou reported:\n${bullets.length > 0 ? bullets.map(b => `• ${b}`).join("\n") : "• Elevated recovery load markers"}\n\nThese indicators may affect recovery quality.`;
    } else {
        // Recovery Attention High
        const bullets = points.filter(p => p.includes("Poor") || p.includes("Elevated") || p.includes("Increased") || p.includes("Low energy") || p.includes("Low mood"));
        explanation = `Recovery Attention High\n\nYou reported:\n${bullets.length > 0 ? bullets.map(b => `• ${b}`).join("\n") : "• Significantly high fatigue indicators"}\n\nPrioritizing rest and joint recovery is highly recommended.`;
    }

    return {
        recoveryScore: score,
        recoveryContext: status,
        readinessAdjustment: modifier,
        explanation
    };
}

/**
 * Creates or updates a daily log entry for a user
 */
async function createOrUpdateLog(userId, data) {
    const targetDate = normalizeDate(data.date);
    
    // Calculate derived recovery score and context fields
    const contextResults = calculateRecoveryContext(data);

    const updateFields = {
        userId,
        date: targetDate,
        sleep: Number(data.sleep),
        energy: Number(data.energy),
        soreness: Number(data.soreness),
        stress: Number(data.stress),
        mood: Number(data.mood),
        bodyweight: data.bodyweight ? Number(data.bodyweight) : undefined,
        trainingDay: Boolean(data.trainingDay),
        notes: data.notes || "",
        recoveryScore: contextResults.recoveryScore,
        recoveryContext: contextResults.recoveryContext
    };

    // Find and update or insert (upsert)
    const log = await DailyLog.findOneAndUpdate(
        { userId, date: targetDate },
        { $set: updateFields },
        { new: true, upsert: true }
    );

    return log;
}

/**
 * Fetches the daily log for today (or a specific date)
 */
async function getTodaysLog(userId, dateStr) {
    const targetDate = normalizeDate(dateStr);
    return await DailyLog.findOne({ userId, date: targetDate });
}

/**
 * Fetches the recent daily logs for a user
 */
async function getRecentLogs(userId, limit = 7) {
    return await DailyLog.find({ userId })
        .sort({ date: -1 })
        .limit(limit);
}

/**
 * Fetches daily logs in a specific range
 */
async function getDateRangeLogs(userId, start, end) {
    const query = { userId };
    
    if (start || end) {
        query.date = {};
        if (start) {
            query.date.$gte = normalizeDate(start);
        }
        if (end) {
            query.date.$lte = normalizeDate(end);
        }
    }
    
    return await DailyLog.find(query).sort({ date: -1 });
}

module.exports = {
    normalizeDate,
    calculateRecoveryContext,
    createOrUpdateLog,
    getTodaysLog,
    getRecentLogs,
    getDateRangeLogs
};
