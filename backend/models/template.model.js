const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    notes: { type: String, default: "" },
    exercises: [
        {
            exercise: { type: String, required: true },
            targetSets: { type: Number, required: true, default: 3 },
            targetRepRange: { type: String, required: true, default: "8-12" },
            category: { type: String, default: "" },
            order: { type: Number, default: 0 }
        }
    ],
    useCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null }
}, { timestamps: true });

// 📊 Index for fast query of user's templates sorted by usage and creation date
templateSchema.index({ userId: 1, useCount: -1, createdAt: -1 });

module.exports = mongoose.model("Template", templateSchema);
