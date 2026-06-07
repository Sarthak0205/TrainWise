const templateService = require("../services/template.service");

/**
 * Gets read-only system templates and custom user templates
 */
async function getTemplates(req, res, next) {
    try {
        const data = await templateService.getTemplates(req.user._id);
        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Gets a template by its ID
 */
async function getTemplateById(req, res, next) {
    try {
        const { id } = req.params;
        const data = await templateService.getTemplateById(id, req.user._id);
        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Template not found."
            });
        }
        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Creates a new template
 */
async function createTemplate(req, res, next) {
    try {
        const { name, exercises } = req.body;

        // Validations
        if (!name || name.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Template name is required."
            });
        }
        if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one exercise is required in a template."
            });
        }

        const data = await templateService.createTemplate(req.user._id, req.body);
        return res.status(201).json({
            success: true,
            message: "Template created successfully.",
            data
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Updates a custom template
 */
async function updateTemplate(req, res, next) {
    try {
        const { id } = req.params;
        const { name, exercises } = req.body;

        if (!name || name.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Template name is required."
            });
        }
        if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one exercise is required."
            });
        }

        const data = await templateService.updateTemplate(id, req.user._id, req.body);
        return res.status(200).json({
            success: true,
            message: "Template updated successfully.",
            data
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Deletes a custom template
 */
async function deleteTemplate(req, res, next) {
    try {
        const { id } = req.params;
        await templateService.deleteTemplate(id, req.user._id);
        return res.status(200).json({
            success: true,
            message: "Template deleted successfully."
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Increments usage metrics of a template
 */
async function recordTemplateUse(req, res, next) {
    try {
        const { id } = req.params;
        const result = await templateService.incrementUsage(id, req.user._id);
        if (!result.success) {
            return res.status(404).json(result);
        }
        return res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    recordTemplateUse
};
