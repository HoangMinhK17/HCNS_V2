import mongoose from "mongoose";

const ShiftTemplateSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },
        startTime: {
            type: String,
            required: true,
        },
        endTime: {
            type: String,
            required: true,
        },
        breakMinutes: {
            type: Number,
            default: 0,
        },
        workingHours: {
            type: Number,
            required: true,
        },
        isOvernightShift: {
            type: Boolean,
            default: false,
        },
        allowedLateMins: {
            type: Number,
            default: 0,
        },
        allowedEarlyMins: {
            type: Number,
            default: 0,
        },
        color: {
            type: String,
            default: "#795eb3ff",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

export default mongoose.model("ShiftTemplate", ShiftTemplateSchema);