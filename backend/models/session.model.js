const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    name: { type: String, default: "Workout Session" },
    source: { type: String, enum: ["csv", "manual"], default: "manual" },
    notes: { type: String, default: "" }
}, { timestamps: true });

// 📅 Index for quick user session query sorted by date
sessionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model("Session", sessionSchema);

