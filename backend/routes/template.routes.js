const express = require("express");
const templateController = require("../controllers/template.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// Apply auth middleware to protect all template routes
router.use(authMiddleware);

router.post("/", templateController.createTemplate);
router.get("/", templateController.getTemplates);
router.get("/:id", templateController.getTemplateById);
router.put("/:id", templateController.updateTemplate);
router.delete("/:id", templateController.deleteTemplate);
router.post("/:id/use", templateController.recordTemplateUse);

module.exports = router;
