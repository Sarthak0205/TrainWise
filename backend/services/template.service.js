const Template = require("../models/template.model");

// Read-only static System Templates
const SYSTEM_TEMPLATES = [
    {
        _id: "system-push",
        name: "Push Day",
        description: "Focus on Chest, Shoulders, and Triceps",
        notes: "Focus on controlled eccentric contractions and leaving 1-2 reps in reserve.",
        exercises: [
            { exercise: "Bench Press", targetSets: 3, targetRepRange: "6-8", category: "Push", order: 1 },
            { exercise: "Shoulder Press", targetSets: 3, targetRepRange: "8-10", category: "Push", order: 2 },
            { exercise: "Incline Bench Press", targetSets: 3, targetRepRange: "8-12", category: "Push", order: 3 },
            { exercise: "Dumbbell Lateral Raise", targetSets: 3, targetRepRange: "12-15", category: "Shoulders", order: 4 },
            { exercise: "Tricep Pushdown", targetSets: 3, targetRepRange: "10-12", category: "Push (Isolation)", order: 5 }
        ],
        isSystem: true,
        useCount: 0,
        lastUsedAt: null
    },
    {
        _id: "system-pull",
        name: "Pull Day",
        description: "Focus on Back, Biceps, and Rear Delts",
        notes: "Maintain high tension on lats and pull through your elbows.",
        exercises: [
            { exercise: "Deadlift", targetSets: 3, targetRepRange: "5", category: "Legs", order: 1 },
            { exercise: "Lat Pulldown", targetSets: 4, targetRepRange: "8-12", category: "Vertical Pull", order: 2 },
            { exercise: "Cable Row", targetSets: 3, targetRepRange: "10-12", category: "Horizontal Pull", order: 3 },
            { exercise: "Pull-Ups", targetSets: 3, targetRepRange: "8-10", category: "Vertical Pull", order: 4 },
            { exercise: "Barbell Curl", targetSets: 3, targetRepRange: "10-12", category: "Pull (Isolation)", order: 5 },
            { exercise: "Dumbbell Bicep Curl", targetSets: 3, targetRepRange: "10-12", category: "Pull (Isolation)", order: 6 }
        ],
        isSystem: true,
        useCount: 0,
        lastUsedAt: null
    },
    {
        _id: "system-legs",
        name: "Leg Day",
        description: "Focus on Quads, Hamstrings, and Calves",
        notes: "Prioritize range of motion and core stability during compound lifts.",
        exercises: [
            { exercise: "Squat", targetSets: 4, targetRepRange: "6-8", category: "Legs", order: 1 },
            { exercise: "Leg Press", targetSets: 3, targetRepRange: "10-12", category: "Legs", order: 2 },
            { exercise: "Romanian Deadlift", targetSets: 3, targetRepRange: "10-12", category: "Legs", order: 3 },
            { exercise: "Leg Curl", targetSets: 3, targetRepRange: "12-15", category: "Legs", order: 4 },
            { exercise: "Leg Extension", targetSets: 3, targetRepRange: "12-15", category: "Legs", order: 5 }
        ],
        isSystem: true,
        useCount: 0,
        lastUsedAt: null
    },
    {
        _id: "system-upper",
        name: "Upper Body",
        description: "Upper body push and pull split",
        notes: "Balanced strength workout targeting upper push/pull planes.",
        exercises: [
            { exercise: "Bench Press", targetSets: 3, targetRepRange: "8-10", category: "Push", order: 1 },
            { exercise: "Cable Row", targetSets: 3, targetRepRange: "8-10", category: "Horizontal Pull", order: 2 },
            { exercise: "Shoulder Press", targetSets: 3, targetRepRange: "10-12", category: "Push", order: 3 },
            { exercise: "Lat Pulldown", targetSets: 3, targetRepRange: "10-12", category: "Vertical Pull", order: 4 },
            { exercise: "Barbell Curl", targetSets: 2, targetRepRange: "10-12", category: "Pull (Isolation)", order: 5 },
            { exercise: "Tricep Pushdown", targetSets: 2, targetRepRange: "10-12", category: "Push (Isolation)", order: 6 }
        ],
        isSystem: true,
        useCount: 0,
        lastUsedAt: null
    },
    {
        _id: "system-lower",
        name: "Lower Body",
        description: "Lower body squat and hinge focus",
        notes: "Focus on quad and hamstring symmetry. Rest 2-3 mins between heavy sets.",
        exercises: [
            { exercise: "Squat", targetSets: 3, targetRepRange: "8-10", category: "Legs", order: 1 },
            { exercise: "Romanian Deadlift", targetSets: 3, targetRepRange: "8-10", category: "Legs", order: 2 },
            { exercise: "Leg Press", targetSets: 3, targetRepRange: "10-12", category: "Legs", order: 3 },
            { exercise: "Leg Curl", targetSets: 2, targetRepRange: "12-15", category: "Legs", order: 4 },
            { exercise: "Leg Extension", targetSets: 2, targetRepRange: "12-15", category: "Legs", order: 5 }
        ],
        isSystem: true,
        useCount: 0,
        lastUsedAt: null
    }
];

/**
 * Returns read-only system templates and user custom templates
 */
async function getTemplates(userId) {
    const userTemplates = await Template.find({ userId }).sort({ useCount: -1, createdAt: -1 });
    return {
        systemTemplates: SYSTEM_TEMPLATES,
        userTemplates: userTemplates || []
    };
}

/**
 * Fetches a single template by ID
 */
async function getTemplateById(templateId, userId) {
    if (typeof templateId === "string" && templateId.startsWith("system-")) {
        const match = SYSTEM_TEMPLATES.find(t => t._id === templateId);
        return match || null;
    }
    return await Template.findOne({ _id: templateId, userId });
}

/**
 * Creates a new custom template
 */
async function createTemplate(userId, templateData) {
    const cleanExercises = (templateData.exercises || []).map((ex, idx) => ({
        exercise: ex.exercise.trim(),
        targetSets: Number(ex.targetSets) || 3,
        targetRepRange: ex.targetRepRange ? ex.targetRepRange.trim() : "8-12",
        category: ex.category ? ex.category.trim() : "",
        order: Number(ex.order) || idx + 1
    }));

    const newTemplate = await Template.create({
        userId,
        name: templateData.name.trim(),
        description: (templateData.description || "").trim(),
        notes: (templateData.notes || "").trim(),
        exercises: cleanExercises
    });

    return newTemplate;
}

/**
 * Updates a custom template (verifies ownership and blocks system updates)
 */
async function updateTemplate(templateId, userId, templateData) {
    if (typeof templateId === "string" && templateId.startsWith("system-")) {
        throw new Error("Cannot edit read-only system templates.");
    }

    const template = await Template.findOne({ _id: templateId, userId });
    if (!template) {
        throw new Error("Template not found or unauthorized.");
    }

    const cleanExercises = (templateData.exercises || []).map((ex, idx) => ({
        exercise: ex.exercise.trim(),
        targetSets: Number(ex.targetSets) || 3,
        targetRepRange: ex.targetRepRange ? ex.targetRepRange.trim() : "8-12",
        category: ex.category ? ex.category.trim() : "",
        order: Number(ex.order) || idx + 1
    }));

    template.name = templateData.name.trim();
    template.description = (templateData.description || "").trim();
    template.notes = (templateData.notes || "").trim();
    template.exercises = cleanExercises;

    await template.save();
    return template;
}

/**
 * Deletes a custom template
 */
async function deleteTemplate(templateId, userId) {
    if (typeof templateId === "string" && templateId.startsWith("system-")) {
        throw new Error("Cannot delete read-only system templates.");
    }

    const result = await Template.deleteOne({ _id: templateId, userId });
    if (result.deletedCount === 0) {
        throw new Error("Template not found or unauthorized.");
    }
    return true;
}

/**
 * Increments usage metrics when a template is loaded or started
 */
async function incrementUsage(templateId, userId) {
    if (typeof templateId === "string" && templateId.startsWith("system-")) {
        // System templates usage is skipped or logged in memory
        return { success: true, isSystem: true };
    }

    const template = await Template.findOne({ _id: templateId, userId });
    if (!template) {
        return { success: false, message: "Template not found or unauthorized." };
    }

    template.useCount += 1;
    template.lastUsedAt = new Date();
    await template.save();

    return {
        success: true,
        useCount: template.useCount,
        lastUsedAt: template.lastUsedAt
    };
}

module.exports = {
    SYSTEM_TEMPLATES,
    getTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    incrementUsage
};
