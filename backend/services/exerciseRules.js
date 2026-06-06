function classifyExercise(name) {
    const n = name.toLowerCase();

    // 🚫 Ignore
    if (n.includes("stretch")) return "ignore";

    // 🏃 Cardio
    if (
        n.includes("treadmill") ||
        n.includes("running") ||
        n.includes("cycling")
    ) {
        return "cardio";
    }

    // 🤸 Bodyweight
    if (
        n.includes("pull up") ||
        n.includes("push up") ||
        n.includes("dip")
    ) {
        return "bodyweight";
    }

    // 🧠 Core
    if (
        n.includes("crunch") ||
        n.includes("leg raise") ||
        n.includes("plank") ||
        n.includes("sit up")
    ) {
        return "core";
    }

    // 🎯 Isolation
    if (
        n.includes("curl") ||
        n.includes("extension") ||
        n.includes("lateral raise") ||
        n.includes("fly") ||
        n.includes("reverse fly")
    ) {
        return "isolation";
    }

    // 🏋️ Default
    return "strength";
}

function getMovementPattern(name) {
    const n = name.toLowerCase();

    // Pull
    if (n.includes("row")) return "horizontal_pull";
    if (n.includes("pulldown") || n.includes("pull up")) return "vertical_pull";

    // Push
    if (
        n.includes("bench") ||
        n.includes("press") ||
        n.includes("push")
    ) {
        return "push";
    }

    // Legs
    if (
        n.includes("squat") ||
        n.includes("leg press") ||
        n.includes("deadlift") ||
        n.includes("lunge")
    ) {
        return "legs";
    }

    // Shoulders (optional grouping)
    if (n.includes("shoulder")) return "shoulders";

    return "other";
}

module.exports = { classifyExercise, getMovementPattern };