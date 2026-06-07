const coachingService = require("../services/coaching.service");

/**
 * GET readiness controller handler
 */
async function getReadiness(req, res) {
    try {
        const result = await coachingService.calculateReadiness(req.user._id, req.query.date);
        return res.json(result);
    } catch (err) {
        console.error("❌ Coaching Controller - getReadiness Error:", err);
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
}

/**
 * GET consistency controller handler
 */
async function getConsistency(req, res) {
    try {
        const result = await coachingService.calculateConsistency(req.user._id);
        return res.json(result);
    } catch (err) {
        console.error("❌ Coaching Controller - getConsistency Error:", err);
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
}

/**
 * GET plateaus controller handler
 */
async function getPlateaus(req, res) {
    try {
        const result = await coachingService.detectPlateaus(req.user._id);
        return res.json(result);
    } catch (err) {
        console.error("❌ Coaching Controller - getPlateaus Error:", err);
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
}

/**
 * GET recovery controller handler
 */
async function getRecovery(req, res) {
    try {
        const result = await coachingService.recommendRecovery(req.user._id, req.query.date);
        return res.json(result);
    } catch (err) {
        console.error("❌ Coaching Controller - getRecovery Error:", err);
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
}

/**
 * GET summary controller handler
 */
async function getSummary(req, res) {
    try {
        const result = await coachingService.getCoachingSummary(req.user._id, req.query.date);
        return res.json(result);
    } catch (err) {
        console.error("❌ Coaching Controller - getSummary Error:", err);
        return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
}

module.exports = {
    getReadiness,
    getConsistency,
    getPlateaus,
    getRecovery,
    getSummary
};
