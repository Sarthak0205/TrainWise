const Workout = require("../models/workout.model");
const Session = require("../models/session.model");
const { getMovementPattern } = require("./exerciseRules");
const { getWorkoutRecommendations } = require("../controllers/workout.controller");
const { generateRecommendations } = require("./recommendation.service");

/**
 * Calculates estimated One Rep Max (1RM) using Epley's Formula
 */
function calculateEst1RM(weight, reps) {
    if (weight <= 0 || reps <= 0) return 0;
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
}

const BASELINE_READINESS = {
    score: null,
    status: "Building Baseline",
    trend: null,
    explanation: "Building Baseline. Complete at least 5 workouts to unlock recovery readiness scoring."
};

/**
 * Readiness maturity thresholds:
 * 0-4 sessions: baseline only, no readiness score or push/recovery status.
 * 5-14 sessions: readiness is visible but capped at 85 to avoid early overconfidence.
 * 15+ sessions: full 0-100 readiness range is unlocked.
 */
function applyReadinessMaturity(score, sessionCount) {
    if (sessionCount < 5) return null;
    if (sessionCount < 15) return Math.min(score, 85);
    return score;
}

function getReadinessStatus(score) {
    if (score === null || score === undefined) return "Building Baseline";
    if (score >= 90) return "Exceptional Readiness";
    if (score >= 80) return "Ready to Push";
    if (score >= 65) return "Moderate Readiness";
    return "Recovery Recommended";
}

/**
 * Calculates fatigue score for a single session
 * Performance drop is identified when reps drop by > 2 at the same weight between consecutive sets
 */
async function calculateSessionFatigue(userId, sessionId) {
    const sets = await Workout.find({ userId, sessionId }).sort({ setIndex: 1 });
    if (sets.length === 0) return 0;

    const exerciseGroups = {};
    sets.forEach(s => {
        if (!exerciseGroups[s.exercise]) {
            exerciseGroups[s.exercise] = [];
        }
        exerciseGroups[s.exercise].push(s);
    });

    let fatiguedExercisesCount = 0;
    const totalExercises = Object.keys(exerciseGroups).length;

    Object.entries(exerciseGroups).forEach(([exercise, exerciseSets]) => {
        let exerciseFatigued = false;
        for (let i = 1; i < exerciseSets.length; i++) {
            if (
                exerciseSets[i].weight === exerciseSets[i - 1].weight &&
                exerciseSets[i].reps < exerciseSets[i - 1].reps - 2
            ) {
                exerciseFatigued = true;
                break;
            }
        }
        if (exerciseFatigued) fatiguedExercisesCount++;
    });

    return totalExercises > 0 ? +(fatiguedExercisesCount / totalExercises * 100).toFixed(1) : 0;
}

/**
 * Core Helper: Calculates Readiness Score for a specific session index
 */
async function calculateReadinessForSession(userId, sessions, sessionIdx) {
    if (sessions.length === 0 || sessionIdx >= sessions.length) {
        return BASELINE_READINESS;
    }

    const currentSession = sessions[sessionIdx];
    const prevSessions = sessions.slice(sessionIdx + 1);

    // 1. Fatigue Trend Penalty (last 3 sessions average fatigue)
    let fatigueAvg = 0;
    const fatigueCheckSessions = sessions.slice(sessionIdx, sessionIdx + 3);
    if (fatigueCheckSessions.length > 0) {
        let fatigueSum = 0;
        for (const s of fatigueCheckSessions) {
            fatigueSum += await calculateSessionFatigue(userId, s._id);
        }
        fatigueAvg = fatigueSum / fatigueCheckSessions.length;
    }

    let fatiguePenalty = 0;
    if (fatigueAvg > 30) {
        fatiguePenalty = Math.min(20, (fatigueAvg - 30) * 0.5);
    }

    // 2. Volume Spike Penalty (latest session vs. average of preceding 4 sessions)
    let volumeSpikePenalty = 0;
    const precedingSessions = prevSessions.slice(0, 4);
    if (precedingSessions.length > 0) {
        // Calculate volume for current session
        const currentSets = await Workout.find({ userId, sessionId: currentSession._id });
        const currentVolume = currentSets.reduce((sum, s) => sum + s.weight * s.reps, 0);

        // Calculate average volume of preceding sessions
        let precedingVolumeSum = 0;
        for (const s of precedingSessions) {
            const sets = await Workout.find({ userId, sessionId: s._id });
            precedingVolumeSum += sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        }
        const precedingVolumeAvg = precedingVolumeSum / precedingSessions.length;

        if (precedingVolumeAvg > 0 && currentVolume > 1.3 * precedingVolumeAvg) {
            volumeSpikePenalty = 15;
        }
    }

    // 3. Days Since Last Session
    let daysSinceLastPenalty = 0;
    let daysBonus = 0;
    if (sessionIdx === 0) {
        const diffMs = Date.now() - new Date(currentSession.date).getTime();
        const diffDays = Math.floor(diffMs / (1000 * 3600 * 24));

        if (diffDays === 0) {
            daysSinceLastPenalty = 10; // Trained today, need rest
        } else if (diffDays >= 1 && diffDays <= 3) {
            daysBonus = 5; // Optimal recovery window
        } else if (diffDays > 5) {
            daysSinceLastPenalty = Math.min(10, diffDays - 5); // Deconditioning penalty
        }
    } else {
        const nextSession = sessions[sessionIdx - 1];
        const diffMs = new Date(nextSession.date).getTime() - new Date(currentSession.date).getTime();
        const diffDays = Math.floor(diffMs / (1000 * 3600 * 24));

        if (diffDays === 0) {
            daysSinceLastPenalty = 10;
        } else if (diffDays >= 1 && diffDays <= 3) {
            daysBonus = 5;
        } else if (diffDays > 5) {
            daysSinceLastPenalty = Math.min(10, diffDays - 5);
        }
    }

    // 4. Recommendation Confidence & Session Frequency (last 7 days)
    let confidenceBonus = 0;
    let frequencyPenalty = 0;

    // Check sessions in the last 7 days relative to currentSession
    const sessionDate = new Date(currentSession.date);
    const sevenDaysAgo = new Date(sessionDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeSessionsInWeek = sessions.filter(s => {
        const d = new Date(s.date);
        return d <= sessionDate && d >= sevenDaysAgo;
    }).length;

    if (activeSessionsInWeek > 5) {
        frequencyPenalty = 10; // Overreaching
    } else if (activeSessionsInWeek >= 3 && activeSessionsInWeek <= 4) {
        daysBonus += 5; // Good session frequency
    } else if (activeSessionsInWeek < 2) {
        frequencyPenalty = 5; // Low training stimulus
    }

    // Calculate score
    const baseScore = 80;
    let rawScore = baseScore - fatiguePenalty - volumeSpikePenalty - daysSinceLastPenalty + daysBonus + confidenceBonus - frequencyPenalty;
    rawScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    const score = applyReadinessMaturity(rawScore, sessions.length);

    // Status Bands
    const status = getReadinessStatus(score);

    // Coaching explanation text
    let explanation = "Training volume and recovery metrics are balanced. You are in a good position to progress.";
    if (score === null) {
        explanation = BASELINE_READINESS.explanation;
    } else if (sessions.length < 15 && rawScore > score) {
        explanation = "Readiness is building, but scoring is capped while your training baseline matures.";
    } else if (score < 65) {
        explanation = "Elevated session fatigue and volume patterns indicate high physiological stress. Prioritizing recovery is highly recommended.";
    } else if (score >= 90) {
        explanation = "Exceptional recovery indicators and consistent training frequency. Excellent opportunity to push progressive overload limits.";
    } else if (volumeSpikePenalty > 0) {
        explanation = "A recent training volume spike has been detected. Monitor local fatigue and allow extra rest.";
    } else if (fatiguePenalty > 0) {
        explanation = "Recent workouts showed signs of accelerating muscle fatigue. Keep intensity moderate.";
    }

    return {
        score,
        status,
        explanation
    };
}

/**
 * Feature 1 – Recovery Readiness Score
 */
async function calculateReadiness(userId, localDate) {
    const sessions = await Session.find({ userId }).sort({ date: -1 });

    if (sessions.length < 5) {
        return BASELINE_READINESS;
    }

    // Latest session readiness
    const currentReadiness = await calculateReadinessForSession(userId, sessions, 0);

    // Fetch today's log
    const targetDate = localDate ? new Date(localDate) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);

    const DailyLog = require("../models/dailyLog.model");
    const todaysLog = await DailyLog.findOne({ userId, date: targetDate });

    let finalScore = currentReadiness.score;
    let finalStatus = currentReadiness.status;
    let finalExplanation = currentReadiness.explanation;

    if (todaysLog) {
        const dailyLogService = require("./dailyLog.service");
        const recoveryCtx = dailyLogService.calculateRecoveryContext(todaysLog);

        // Blend score: Workout readiness + recovery modifier (max ±5)
        finalScore = Math.max(0, Math.min(100, finalScore + recoveryCtx.readinessAdjustment));
        finalStatus = getReadinessStatus(finalScore);

        // Customize explanation based on user-reported indicators (Refinement 7)
        let points = [];
        if (todaysLog.energy >= 4) points.push("High energy");
        if (todaysLog.energy <= 2) points.push("Low energy");
        
        if (todaysLog.sleep >= 4) points.push("Quality sleep");
        if (todaysLog.sleep <= 2) points.push("Poor sleep quality");
        
        if (todaysLog.soreness >= 4) points.push("Elevated soreness");
        if (todaysLog.soreness <= 2) points.push("Low soreness");
        
        if (todaysLog.stress >= 4) points.push("Increased stress");
        if (todaysLog.stress <= 2) points.push("Low stress levels");

        const bulletText = points.map(p => `• ${p}`).join("\n");

        if (recoveryCtx.readinessAdjustment > 0) {
            finalExplanation = `${recoveryCtx.recoveryContext}\n\nYou reported:\n${bulletText || "• Favorable recovery indicators"}\n\nThese indicators support normal training intensity.`;
        } else if (recoveryCtx.readinessAdjustment < 0) {
            finalExplanation = `${recoveryCtx.recoveryContext}\n\nYou reported:\n${bulletText || "• Elevated fatigue indicators"}\n\nThese indicators may affect recovery quality.`;
        } else {
            // Neutral recovery context
            finalExplanation = `${currentReadiness.explanation}\n\nDaily log indicates neutral recovery signals.`;
        }
    }

    // Calculate readiness for previous 3 sessions to establish trend
    const recentScores = [];
    for (let i = 0; i < Math.min(4, sessions.length); i++) {
        const res = await calculateReadinessForSession(userId, sessions, i);
        if (typeof res.score === "number") {
            recentScores.push(res.score);
        }
    }

    let trend = "Stable";
    if (recentScores.length >= 2) {
        const latest = recentScores[0];
        // Calculate average of the preceding readiness scores
        const historical = recentScores.slice(1);
        const histAvg = historical.reduce((a, b) => a + b, 0) / historical.length;

        if (latest > histAvg + 3) {
            trend = "Improving";
        } else if (latest < histAvg - 3) {
            trend = "Declining";
        }
    }

    return {
        score: finalScore,
        status: finalStatus,
        trend,
        explanation: finalExplanation
    };
}

/**
 * Feature 2 – Training Consistency Score
 */
async function calculateConsistency(userId) {
    const sessions = await Session.find({ userId }).sort({ date: -1 });

    if (sessions.length === 0) {
        return {
            score: 0,
            tier: "Inconsistent",
            currentStreak: 0,
            monthlySessions: 0,
            explanation: "No sessions recorded. Build consistent habits by logging your first workout."
        };
    }

    const latestSession = sessions[0];
    const referenceDate = new Date(latestSession.date);

    // 1. Monthly Sessions (last 30 days from reference date)
    const thirtyDaysAgo = new Date(referenceDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlySessions = sessions.filter(s => new Date(s.date) >= thirtyDaysAgo).length;

    // 2. Active Weeks (out of last 4 weeks, how many had >= 1 session)
    let activeWeeks = 0;
    for (let i = 0; i < 4; i++) {
        const endWeek = new Date(referenceDate);
        endWeek.setDate(endWeek.getDate() - i * 7);
        const startWeek = new Date(endWeek);
        startWeek.setDate(startWeek.getDate() - 7);

        const hasSession = sessions.some(s => {
            const d = new Date(s.date);
            return d >= startWeek && d < endWeek;
        });
        if (hasSession) {
            activeWeeks++;
        }
    }
    // Boost active weeks if the latest session counts for the current week
    if (activeWeeks === 0 && sessions.length > 0) activeWeeks = 1;

    // 3. Current Training Streak
    // Preferred definition: consecutive active training weeks, measured in
    // rolling 7-day windows from the latest workout. This avoids presenting a
    // day-span as a daily streak when athletes train several times per week.
    let currentStreak = 0;
    for (let i = 0; i < sessions.length; i++) {
        const endWeek = new Date(referenceDate);
        endWeek.setDate(endWeek.getDate() - i * 7);
        const startWeek = new Date(endWeek);
        startWeek.setDate(startWeek.getDate() - 7);

        const hasSession = sessions.some(s => {
            const d = new Date(s.date);
            return d >= startWeek && d <= endWeek;
        });

        if (hasSession) {
            currentStreak++;
        } else {
            break;
        }
    }

    // 4. Recent Activity Bonus (+5 consistency points if trained in last 3 days)
    const diffMs = Date.now() - referenceDate.getTime();
    const trainedInLast3Days = (diffMs / (1000 * 3600 * 24)) <= 3;
    const recentBonus = trainedInLast3Days ? 5 : 0;

    // Calculate Consistency Score
    // Target is 12 sessions per month (50%) and 4/4 active weeks (50%)
    const weeklyRatio = activeWeeks / 4;
    const targetSessionCount = 12;
    const countRatio = Math.min(1.0, monthlySessions / targetSessionCount);

    let score = Math.round((weeklyRatio * 50) + (countRatio * 50) + recentBonus);
    score = Math.max(0, Math.min(100, score));

    // Consistency Tiers
    let tier = "Inconsistent";
    if (score >= 90) tier = "Elite";
    else if (score >= 75) tier = "Strong";
    else if (score >= 60) tier = "Developing";

    // Coaching explanation
    let explanation = "Keep showing up. Consistency is the foundation of progress.";
    if (tier === "Elite") {
        explanation = "Superb workout frequency! You are demonstrating an elite level of training consistency.";
    } else if (tier === "Strong") {
        explanation = "Strong consistency. You are keeping workouts regular, which supports steady adaptations.";
    } else if (tier === "Developing") {
        explanation = "Consistency is developing. Try setting fixed training days to lock in your habits.";
    }

    return {
        score,
        tier,
        currentStreak,
        streakUnit: "weeks",
        streakLabel: "active weeks",
        monthlySessions,
        explanation
    };
}

/**
 * Core Helper: Analyzes a single exercise for plateau status
 */
async function analyzeExercisePlateau(userId, exerciseName) {
    const workouts = await Workout.find({ userId, exercise: exerciseName }).sort({ date: 1 });
    
    // Group workouts by date (session)
    const sessionMap = {};
    workouts.forEach(w => {
        const dateStr = w.date.toISOString().split("T")[0];
        if (!sessionMap[dateStr]) {
            sessionMap[dateStr] = [];
        }
        sessionMap[dateStr].push(w);
    });

    const sessionsData = Object.entries(sessionMap).map(([dateStr, sets]) => {
        const max1RM = Math.max(...sets.map(s => calculateEst1RM(s.weight, s.reps)));
        const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        const maxWeight = Math.max(...sets.map(s => s.weight));
        const maxReps = Math.max(...sets.map(s => s.reps));
        return {
            date: new Date(dateStr),
            max1RM,
            totalVolume,
            maxWeight,
            maxReps
        };
    }).sort((a, b) => a.date - b.date);

    const cnt = sessionsData.length;
    if (cnt < 5) {
        return {
            exercise: exerciseName,
            status: "Building Baseline",
            dashboardStatus: "Building Baseline",
            explanation: `Baseline building. Needs ${5 - cnt} more logged session(s) to evaluate plateau status.`
        };
    }

    // Get last 5 sessions
    const last5 = sessionsData.slice(-5);

    // 1. Evaluate 1RM trend (compare last 2 vs first 2 of the 5)
    const first2_1RM = (last5[0].max1RM + last5[1].max1RM) / 2;
    const last2_1RM = (last5[3].max1RM + last5[4].max1RM) / 2;

    // 2. Evaluate volume trend
    const first2_Vol = (last5[0].totalVolume + last5[1].totalVolume) / 2;
    const last2_Vol = (last5[3].totalVolume + last5[4].totalVolume) / 2;

    // 3. Evaluate weight/reps progression
    const weightTrendUp = last5[4].maxWeight >= last5[0].maxWeight;
    const repsTrendUp = last5[4].maxReps >= last5[0].maxReps;

    let status = "Stable";
    let dashboardStatus = "Stable 🟡";
    let explanation = `${exerciseName} performance is currently stable across recent workouts.`;

    if (last2_1RM > 1.02 * first2_1RM) {
        status = "Progressing";
        dashboardStatus = "Progressing 🟢";
        explanation = `${exerciseName} shows positive progression with a ${((last2_1RM - first2_1RM) / first2_1RM * 100).toFixed(1)}% estimated 1RM increase.`;
    } else if (last2_1RM < 0.98 * first2_1RM && last2_Vol <= first2_Vol) {
        status = "Potential Plateau";
        dashboardStatus = "Progress Worth Monitoring 🟠";
        explanation = `${exerciseName} performance has declined slightly, accompanied by stable or decreasing volume. Worth monitoring for recovery limits.`;
    } else if (last5[4].maxWeight === last5[0].maxWeight && last5[4].maxReps === last5[0].maxReps && last2_Vol <= 1.01 * first2_Vol) {
        // Performance is exactly flat
        status = "Potential Plateau";
        dashboardStatus = "Progress Worth Monitoring 🟠";
        explanation = `${exerciseName} load and reps are static across the last 5 sessions. Consider micro-loading or variation.`;
    }

    return {
        exercise: exerciseName,
        status,
        dashboardStatus,
        explanation
    };
}

/**
 * Feature 3 – Plateau Detection v2
 */
async function detectPlateaus(userId) {
    const sessionsCount = await Session.countDocuments({ userId });
    if (sessionsCount < 5) {
        return [{
            exercise: "All Movements",
            status: "Building Baseline",
            dashboardStatus: "Building Baseline",
            explanation: "Baseline training data is building up. Keep logging sessions."
        }];
    }

    // Get the top 4 exercises by volume/frequency for the user
    const topExercises = await Workout.aggregate([
        { $match: { userId } },
        { $group: { _id: "$exercise", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 4 }
    ]);

    if (topExercises.length === 0) {
        return [];
    }

    const results = [];
    for (const item of topExercises) {
        const res = await analyzeExercisePlateau(userId, item._id);
        results.push(res);
    }

    return results;
}

/**
 * Feature 4 – Recovery Recommendation Engine
 */
async function recommendRecovery(userId, localDate) {
    const sessions = await Session.find({ userId }).sort({ date: -1 });

    if (sessions.length < 5) {
        return {
            status: "Building Baseline",
            explanation: "Recovery recommendations will activate after at least 5 logged workouts."
        };
    }

    const readiness = await calculateReadiness(userId, localDate);

    // 1. Fatigue Increase check (last 2 vs preceding 3)
    let fatigueIncreasing = false;
    if (sessions.length >= 5) {
        const scores = [];
        for (let i = 0; i < 5; i++) {
            scores.push(await calculateSessionFatigue(userId, sessions[i]._id));
        }
        const recentFatigue = (scores[0] + scores[1]) / 2;
        const baselineFatigue = (scores[2] + scores[3] + scores[4]) / 3;
        fatigueIncreasing = recentFatigue > baselineFatigue + 5;
    }

    // 2. Slowing performance gains check (Estimated 1RM trend of top compound movements over 3 sessions)
    let performanceSlowing = false;
    const plateaus = await detectPlateaus(userId);
    const monitorExercises = plateaus.filter(p => p.status === "Potential Plateau" || p.status === "Stable");
    if (monitorExercises.length >= plateaus.length * 0.5) {
        performanceSlowing = true;
    }

    // 3. 4+ Weeks Volume Growth check
    // Group volume by week for the last 6 weeks
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
    
    const weeklyVolume = await Workout.aggregate([
        { $match: { userId, date: { $gte: sixWeeksAgo } } },
        {
            $group: {
                _id: { $isoWeek: "$date" },
                volume: { $sum: { $multiply: ["$weight", "$reps"] } }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    let volumeGrowing = false;
    if (weeklyVolume.length >= 4) {
        let positiveGaps = 0;
        for (let i = 1; i < weeklyVolume.length; i++) {
            if (weeklyVolume[i].volume > weeklyVolume[i - 1].volume) {
                positiveGaps++;
            }
        }
        if (positiveGaps >= 3) {
            volumeGrowing = true; // 3 out of 4 increases indicates consistent scaling
        }
    }

    // Recovery decision logic
    let status = "Recovery On Track 🟢";
    let explanation = "Your training stress and recovery indices are well balanced. Keep up the solid progress.";

    if (volumeGrowing && fatigueIncreasing && performanceSlowing) {
        status = "Recovery Week Worth Considering 🟠";
        explanation = "Training volume has increased steadily while performance improvements have slowed. A lighter recovery week may help maintain long-term progress.";
    } else if (fatigueIncreasing || (volumeGrowing && performanceSlowing)) {
        status = "Monitor Recovery 🟡";
        explanation = "Accumulated training stress is elevated. Maintain current workloads and ensure adequate sleep and nutrition before adding intensity.";
    }

    if (readiness.score !== null && readiness.score < 65 && status === "Recovery On Track 🟢") {
        status = "Monitor Recovery 🟡";
        explanation = "Recovery readiness is currently low. Keep workload conservative and prioritize recovery before adding intensity.";
    }

    // Blend daily recovery signals to strengthen recommendation confidence
    const targetDate = localDate ? new Date(localDate) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);
    const DailyLog = require("../models/dailyLog.model");
    const todaysLog = await DailyLog.findOne({ userId, date: targetDate });

    if (todaysLog) {
        if (todaysLog.soreness >= 4 || todaysLog.sleep <= 2 || todaysLog.stress >= 4) {
            if (status === "Recovery On Track 🟢") {
                status = "Monitor Recovery 🟡";
                explanation = "Your training volume is fine, but today's recovery check-in indicates elevated soreness or stress. Monitor recovery quality before adding intensity.";
            } else if (status === "Monitor Recovery 🟡") {
                status = "Recovery Week Worth Considering 🟠";
                explanation = "Accumulated training stress is high, and today's check-in confirms significant soreness/stress. A recovery week is highly recommended.";
            }
        }
    }

    return {
        status,
        explanation
    };
}

/**
 * Summary Endpoint
 */
async function getCoachingSummary(userId, localDate) {
    const readiness = await calculateReadiness(userId, localDate);
    const consistency = await calculateConsistency(userId);
    const plateaus = await detectPlateaus(userId);
    const recoveryRecommendation = await recommendRecovery(userId, localDate);

    // Calculate historical trends for the last 12 weeks relative to latest session
    const latestSession = await Session.findOne({ userId }).sort({ date: -1 });
    const referenceDate = latestSession ? new Date(latestSession.date) : new Date();
    const twelveWeeksAgo = new Date(referenceDate);
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    // Fetch weekly sessions for the trend graph
    const weeklyData = await Workout.aggregate([
        { $match: { userId, date: { $gte: twelveWeeksAgo } } },
        {
            $group: {
                _id: {
                    year: { $isoWeekYear: "$date" },
                    week: { $isoWeek: "$date" }
                },
                volume: { $sum: { $multiply: ["$weight", "$reps"] } },
                date: { $min: "$date" }
            }
        },
        { $sort: { "_id.year": 1, "_id.week": 1 } }
    ]);

    const sessions = await Session.find({ userId }).sort({ date: -1 });

    // Historical readiness scores over last 12 sessions or weeks
    const readinessHistory = [];
    const consistencyHistory = [];
    const trendLabels = [];

    const trendSessions = sessions.slice(0, 8).reverse();
    for (const s of trendSessions) {
        const sIdx = sessions.findIndex(x => x._id.toString() === s._id.toString());
        const readinessRes = await calculateReadinessForSession(userId, sessions, sIdx);
        
        // Consistency at that point in time (using simple slice)
        const slicedSessions = sessions.slice(sIdx);
        let conScore = 60;
        if (slicedSessions.length > 0) {
            const sliceLatest = slicedSessions[0];
            const sliceRef = new Date(sliceLatest.date);
            const slice30Days = new Date(sliceRef);
            slice30Days.setDate(slice30Days.getDate() - 30);
            const sliceMonthly = slicedSessions.filter(x => new Date(x.date) >= slice30Days).length;
            conScore = Math.min(100, Math.round((sliceMonthly / 12) * 100));
        }

        const dateStr = s.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        trendLabels.push(dateStr);
        readinessHistory.push(readinessRes.score ?? null);
        consistencyHistory.push(conScore);
    }

    const volumeChartLabels = [];
    const volumeChartData = [];
    weeklyData.forEach(w => {
        const d = new Date(w.date);
        volumeChartLabels.push(`Wk of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
        volumeChartData.push(w.volume);
    });

    return {
        readiness,
        consistency,
        plateaus,
        recoveryRecommendation,
        trends: {
            labels: trendLabels,
            readiness: readinessHistory,
            consistency: consistencyHistory,
            volumeLabels: volumeChartLabels,
            volumeData: volumeChartData
        }
    };
}

module.exports = {
    calculateReadiness,
    calculateConsistency,
    detectPlateaus,
    recommendRecovery,
    getCoachingSummary
};
