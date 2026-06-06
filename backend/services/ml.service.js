require("dotenv").config();

/**
 * Sends a structured workout set sequence to the FastAPI Python ML service for next-set predictions
 * @param {string} exercise - Name of the exercise
 * @param {number} w1 - Weight of Set 1
 * @param {number} r1 - Repetitions of Set 1
 * @param {number} w2 - Weight of Set 2
 * @param {number} r2 - Repetitions of Set 2
 * @returns {Promise<object|null>} - Returns prediction payload or null if the service is unreachable/timed out
 */
async function predictWorkoutSet(exercise, w1, r1, w2, r2, volume, delta_weight, delta_reps, session_gap) {
    const mlBaseUrl = process.env.ML_SERVICE_URL || "http://127.0.0.1:8080";
    const predictUrl = `${mlBaseUrl}/predict`;

    // 🛡️ Implement AbortController for a strict 2-second external service timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const payload = {
        w1: parseFloat(w1) || 0,
        r1: parseInt(r1) || 0,
        w2: parseFloat(w2) || 0,
        r2: parseInt(r2) || 0,
        exercise: exercise,
        volume: parseFloat(volume) || 0,
        delta_weight: parseFloat(delta_weight) || 0,
        delta_reps: parseFloat(delta_reps) || 0,
        session_gap: parseFloat(session_gap) || 3.0
    };

    console.log(`🤖 Requesting ML prediction from ${predictUrl} for:`, payload);

    try {
        const response = await fetch(predictUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn(`⚠️ ML Service returned error status: ${response.status}`);
            return null;
        }

        const data = await response.json();
        console.log("🤖 ML Service prediction successfully retrieved:", data);
        return data;

    } catch (err) {
        clearTimeout(timeoutId);
        
        if (err.name === "AbortError") {
            console.error(`🛑 ML Service request timed out after 2000ms at ${predictUrl}`);
        } else {
            console.error(`🔌 Failed to connect to ML Service at ${predictUrl}:`, err.message);
        }
        
        // Gracefully failover by returning null, signaling pure heuristic fallbacks
        return null;
    }
}

/**
 * Checks if the ML service is available (up and responding).
 * Uses a strict 1-second timeout to keep responses fast.
 * @returns {Promise<boolean>}
 */
async function checkMLServiceAvailability() {
    const mlBaseUrl = process.env.ML_SERVICE_URL || "http://127.0.0.1:8080";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    try {
        const response = await fetch(mlBaseUrl, {
            method: "GET",
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response.ok;
    } catch (err) {
        clearTimeout(timeoutId);
        return false;
    }
}

module.exports = {
    predictWorkoutSet,
    checkMLServiceAvailability
};

