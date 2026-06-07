const dailyLogService = require("../services/dailyLog.service");

/**
 * Creates or updates the daily log for the user
 */
async function createOrUpdate(req, res, next) {
    try {
        const { sleep, energy, soreness, stress, mood, trainingDay } = req.body;
        
        // Basic validation
        if (
            sleep === undefined || 
            energy === undefined || 
            soreness === undefined || 
            stress === undefined || 
            mood === undefined || 
            trainingDay === undefined
        ) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required daily check-in fields." 
            });
        }

        const log = await dailyLogService.createOrUpdateLog(req.user._id, req.body);
        return res.json({ success: true, data: log });
    } catch (err) {
        next(err);
    }
}

/**
 * Retrieves the check-in log for today (or custom local date query)
 */
async function getToday(req, res, next) {
    try {
        const date = req.query.date; // Optional custom YYYY-MM-DD
        const log = await dailyLogService.getTodaysLog(req.user._id, date);
        return res.json({ success: true, data: log || null });
    } catch (err) {
        next(err);
    }
}

/**
 * Retrieves the recent history of logs (default 7 days)
 */
async function getRecent(req, res, next) {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 7;
        const logs = await dailyLogService.getRecentLogs(req.user._id, limit);
        return res.json({ success: true, data: logs });
    } catch (err) {
        next(err);
    }
}

/**
 * Retrieves history of logs filtered by start & end date bounds
 */
async function getRange(req, res, next) {
    try {
        const { start, end } = req.query;
        const logs = await dailyLogService.getDateRangeLogs(req.user._id, start, end);
        return res.json({ success: true, data: logs });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    createOrUpdate,
    getToday,
    getRecent,
    getRange
};
