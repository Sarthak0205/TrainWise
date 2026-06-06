const Workout = require("../models/workout.model");
const Session = require("../models/session.model");
const { getMovementPattern } = require("./exerciseRules");

/**
 * Calculates estimated One Rep Max (1RM) using Epley's Formula
 * @param {number} weight - Weight lifted
 * @param {number} reps - Repetitions completed
 * @returns {number} - Estimated 1RM
 */
function calculateEst1RM(weight, reps) {
    if (weight <= 0 || reps <= 0) return 0;
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
}

/**
 * Calculates fatigue score for a single session
 * Fatigue score is the percentage of exercises in a session that experienced a performance drop
 * (reps drop by > 2 at same weight between consecutive sets)
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
 * Generates user-scoped dashboard summary data
 */
async function getUserDashboardSummary(userId) {
    // 1. Total sessions and total volume
    const totalSessions = await Session.countDocuments({ userId });
    
    const totalVolumeResult = await Workout.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: { $multiply: ["$weight", "$reps"] } } } }
    ]);
    const totalVolume = totalVolumeResult[0]?.total || 0;

    // 2. Latest session snapshot
    const latestSession = await Session.findOne({ userId }).sort({ date: -1 });
    let latestSessionCard = null;

    if (latestSession) {
        const latestSets = await Workout.find({ userId, sessionId: latestSession._id }).sort({ setIndex: 1 });
        const exerciseSummaryMap = {};
        let latestSessionVolume = 0;

        latestSets.forEach(s => {
            const vol = s.weight * s.reps;
            latestSessionVolume += vol;

            if (!exerciseSummaryMap[s.exercise]) {
                exerciseSummaryMap[s.exercise] = {
                    exercise: s.exercise,
                    sets: 0,
                    avgWeight: 0,
                    avgReps: 0,
                    totalVol: 0
                };
            }
            const group = exerciseSummaryMap[s.exercise];
            group.avgWeight = (group.avgWeight * group.sets + s.weight) / (group.sets + 1);
            group.avgReps = (group.avgReps * group.sets + s.reps) / (group.sets + 1);
            group.totalVol += vol;
            group.sets++;
        });

        // Format averages
        Object.values(exerciseSummaryMap).forEach(ex => {
            ex.avgWeight = +ex.avgWeight.toFixed(1);
            ex.avgReps = +ex.avgReps.toFixed(1);
        });

        latestSessionCard = {
            sessionId: latestSession._id,
            name: latestSession.name,
            date: latestSession.date,
            totalSets: latestSets.length,
            totalVolume: latestSessionVolume,
            exercises: Object.values(exerciseSummaryMap)
        };
    }

    // 3. Weekly volume trends (last 8 weeks relative to latest session date)
    const referenceDate = latestSession ? new Date(latestSession.date) : new Date();
    const eightWeeksAgo = new Date(referenceDate);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    
    const weeklyVolumeTrends = await Workout.aggregate([
        { $match: { userId, date: { $gte: eightWeeksAgo } } },
        {
            $group: {
                _id: {
                    year: { $isoWeekYear: "$date" },
                    week: { $isoWeek: "$date" }
                },
                volume: { $sum: { $multiply: ["$weight", "$reps"] } },
                setCount: { $sum: 1 },
                date: { $min: "$date" }
            }
        },
        { $sort: { "_id.year": 1, "_id.week": 1 } }
    ]);

    // Format weekly trends with friendly labels
    const chartLabels = [];
    const chartData = [];
    const chartSetCounts = [];

    weeklyVolumeTrends.forEach(w => {
        const d = new Date(w.date);
        chartLabels.push(`Wk of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
        chartData.push(w.volume);
        chartSetCounts.push(w.setCount);
    });

    // Compute weekly volume change percentage
    let weeklyVolumeChange = 0;
    let trendDirection = "flat";
    if (chartData.length >= 2) {
        const currentVol = chartData[chartData.length - 1];
        const prevVol = chartData[chartData.length - 2];
        if (prevVol > 0) {
            weeklyVolumeChange = +(((currentVol - prevVol) / prevVol) * 100).toFixed(1);
            trendDirection = weeklyVolumeChange > 0 ? "up" : weeklyVolumeChange < 0 ? "down" : "flat";
        }
    }

    // 4. Top Exercises by Frequency (Set count)
    const topExercisesRaw = await Workout.aggregate([
        { $match: { userId } },
        { $group: { _id: "$exercise", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);
    const topExercises = topExercisesRaw.map(e => ({ exercise: e._id, setsCount: e.count }));

    // 5. Recent Personal Records (PR) Highlights
    // Find all-time PRs per exercise
    const allWorkouts = await Workout.find({ userId }).select("exercise weight reps date");
    const prMap = {};

    allWorkouts.forEach(w => {
        const est1RM = calculateEst1RM(w.weight, w.reps);
        if (!prMap[w.exercise] || prMap[w.exercise].maxEst1RM < est1RM) {
            prMap[w.exercise] = {
                exercise: w.exercise,
                maxWeight: w.weight,
                maxReps: w.reps,
                maxEst1RM: +est1RM.toFixed(1),
                date: w.date
            };
        }
    });
    
    // Sort by achievement date descending (most recent first) and take top 5
    const prHighlights = Object.values(prMap)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    // 6. Movement Pattern Balance (last 30 days relative to latest session date)
    const thirtyDaysAgo = new Date(referenceDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentWorkouts = await Workout.find({ userId, date: { $gte: thirtyDaysAgo } }).select("exercise weight reps");
    
    const balanceMap = {};
    let totalRecentSets = 0;

    recentWorkouts.forEach(w => {
        const pattern = getMovementPattern(w.exercise);
        balanceMap[pattern] = (balanceMap[pattern] || 0) + 1;
        totalRecentSets++;
    });

    const movementBalance = Object.entries(balanceMap).map(([pattern, count]) => ({
        pattern,
        setsCount: count,
        percentage: totalRecentSets > 0 ? +((count / totalRecentSets) * 100).toFixed(1) : 0
    })).sort((a, b) => b.setsCount - a.setsCount);

    // 7. Fatigue Trend over last 5 sessions
    const recentSessions = await Session.find({ userId }).sort({ date: -1 }).limit(5);
    const fatigueTrend = [];

    // Reverse to chronological order for trend display
    for (const session of [...recentSessions].reverse()) {
        const score = await calculateSessionFatigue(userId, session._id);
        fatigueTrend.push({
            sessionId: session._id,
            date: session.date,
            score
        });
    }

    return {
        summaryCards: {
            totalSessions,
            totalVolumeLifted: totalVolume,
            weeklyVolumeChange,
            trendDirection,
            activeDaysLastMonth: await Session.countDocuments({ userId, date: { $gte: thirtyDaysAgo } })
        },
        latestSession: latestSessionCard,
        weeklyVolumeChart: {
            labels: chartLabels,
            volume: chartData,
            setCounts: chartSetCounts
        },
        topExercises,
        prHighlights,
        movementBalance,
        fatigueTrend
    };
}

/**
 * Fetches a list of sessions with workout totals and exercise summaries
 */
async function getUserSessions(userId, limit = 10, page = 1) {
    const skip = (page - 1) * limit;

    const sessions = await Session.find({ userId }).sort({ date: -1 }).skip(skip).limit(limit);
    const total = await Session.countDocuments({ userId });

    const sessionIds = sessions.map(s => s._id);
    const workouts = await Workout.find({ userId, sessionId: { $in: sessionIds } });

    const workoutMap = {};
    workouts.forEach(w => {
        if (!workoutMap[w.sessionId]) {
            workoutMap[w.sessionId] = [];
        }
        workoutMap[w.sessionId].push(w);
    });

    const mappedSessions = sessions.map(s => {
        const sessionWorkouts = workoutMap[s._id] || [];
        const volume = sessionWorkouts.reduce((sum, w) => sum + w.weight * w.reps, 0);
        const distinctExercises = [...new Set(sessionWorkouts.map(w => w.exercise))];

        return {
            sessionId: s._id,
            name: s.name,
            date: s.date,
            totalSets: sessionWorkouts.length,
            totalVolume: volume,
            exercises: distinctExercises
        };
    });

    return {
        sessions: mappedSessions,
        pagination: {
            total,
            limit,
            page,
            totalPages: Math.ceil(total / limit)
        }
    };
}

/**
 * Gets detailed statistics and trend history for a specific exercise
 */
async function getExerciseAnalytics(userId, exerciseName) {
    let workouts = await Workout.find({ userId, exercise: exerciseName }).sort({ date: 1 });

    if (workouts.length === 0) {
        // Find all distinct exercise names for this user to match against
        const userExercises = await Workout.distinct("exercise", { userId });
        
        // Define a helper to normalize exercise names for comparison
        const normalize = (name) => {
            if (!name) return "";
            return name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, " ")
                .replace(/\s+/g, " ")
                .trim();
        };

        const normalizedTarget = normalize(exerciseName);

        // Try to find a normalized match first
        let matchedExercise = userExercises.find(ex => normalize(ex) === normalizedTarget);

        // If no match, try comparing against a cleaned base label
        if (!matchedExercise) {
            const getBaseLabel = (name) => {
                if (!name) return "";
                const base = name.split(/[-(()]/)[0] || name;
                return normalize(base);
            };

            const targetBase = getBaseLabel(exerciseName);
            if (targetBase) {
                const candidates = userExercises.filter(ex => getBaseLabel(ex) === targetBase);
                if (candidates.length > 0) {
                    matchedExercise = candidates[0];
                }
            }
        }

        if (matchedExercise) {
            workouts = await Workout.find({ userId, exercise: matchedExercise }).sort({ date: 1 });
            exerciseName = matchedExercise;
        }
    }

    if (workouts.length === 0) {
        return null;
    }

    // 1. Compute personal records
    let maxWeight = 0;
    let maxReps = 0;
    let maxEst1RM = 0;

    workouts.forEach(w => {
        const est1RM = calculateEst1RM(w.weight, w.reps);
        if (w.weight > maxWeight) maxWeight = w.weight;
        if (w.reps > maxReps) maxReps = w.reps;
        if (est1RM > maxEst1RM) maxEst1RM = est1RM;
    });

    // 2. Group sets by session (date) to calculate historical metrics
    const sessionMap = {};
    workouts.forEach(w => {
        const dateStr = w.date.toISOString().split("T")[0];
        if (!sessionMap[dateStr]) {
            sessionMap[dateStr] = {
                date: w.date,
                sets: []
            };
        }
        sessionMap[dateStr].sets.push(w);
    });

    const history = Object.entries(sessionMap).map(([dateStr, sessionData]) => {
        const sets = sessionData.sets;
        const totalSets = sets.length;
        const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        const maxSessionWeight = Math.max(...sets.map(s => s.weight));
        const avgSessionWeight = sets.reduce((sum, s) => sum + s.weight, 0) / totalSets;
        const avgSessionReps = sets.reduce((sum, s) => sum + s.reps, 0) / totalSets;
        const maxSessionEst1RM = Math.max(...sets.map(s => calculateEst1RM(s.weight, s.reps)));

        return {
            date: sessionData.date,
            avgWeight: +avgSessionWeight.toFixed(1),
            maxWeight: maxSessionWeight,
            avgReps: +avgSessionReps.toFixed(1),
            totalSets,
            totalVolume,
            maxEst1RM: +maxSessionEst1RM.toFixed(1)
        };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    // 3. Select 1RM trend points for graphing (all dates)
    const trendLabels = [];
    const trendValues = [];

    history.forEach(h => {
        trendLabels.push(new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        trendValues.push(h.maxEst1RM);
    });

    // 4. Extract recent sets (last 15 sets chronologically descending)
    const recentSets = [...workouts].reverse().slice(0, 15).map(w => ({
        weight: w.weight,
        reps: w.reps,
        setIndex: w.setIndex,
        date: w.date
    }));

    return {
        exercise: exerciseName,
        personalRecords: {
            maxWeight,
            maxReps,
            maxEst1RM: +maxEst1RM.toFixed(1)
        },
        chartData: {
            labels: trendLabels,
            estimated1RM: trendValues
        },
        history,
        recentSets
    };
}

module.exports = {
    calculateEst1RM,
    getUserDashboardSummary,
    getUserSessions,
    getExerciseAnalytics
};
