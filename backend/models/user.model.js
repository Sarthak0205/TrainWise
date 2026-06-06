const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    name: { type: String, required: true },
    age: { type: Number },
    bodyweight: { type: Number },
    goalType: { 
        type: String, 
        enum: ["strength", "hypertrophy", "endurance"], 
        default: "hypertrophy" 
    },
    experienceLevel: { 
        type: String, 
        enum: ["beginner", "intermediate", "advanced"], 
        default: "intermediate" 
    },
    preferredUnits: { 
        type: String, 
        enum: ["kg", "lbs"], 
        default: "kg" 
    }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
