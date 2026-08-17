import { Schema, model } from "mongoose";

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, "Name cannot exceed 100 characters"]
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        maxlength: [150, "Email cannot exceed 150 characters"],
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"]
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minlength: [3, "Username must be at least 3 characters"],
        maxlength: [50, "Username cannot exceed 50 characters"],
        match: [/^[a-zA-Z0-9_.-]+$/, "Username can only contain alphanumeric characters, underscores, dots, and hyphens"]
    },
    password: {
        type: String,
        required: true
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    resetPasswordAttempts: {
        type: Number,
        default: 0
    },
    jobTitle: {
        type: String,
        default: "",
        maxlength: [100, "Job title cannot exceed 100 characters"]
    },
    company: {
        type: String,
        default: "",
        maxlength: [100, "Company cannot exceed 100 characters"]
    },
    profilePic: {
        type: String,
        default: ""
    },
    themeMode: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "light"
    },
    defaultMicOff: {
        type: Boolean,
        default: false
    },
    defaultCamOff: {
        type: Boolean,
        default: false
    },
    selectedCam: {
        type: String,
        default: "default"
    },
    selectedMic: {
        type: String,
        default: "default"
    },
    selectedSpeaker: {
        type: String,
        default: "default"
    },
    phone: {
        type: String,
        default: "",
        maxlength: [30, "Phone number cannot exceed 30 characters"]
    },
    country: {
        type: String,
        default: "India",
        maxlength: [100, "Country cannot exceed 100 characters"]
    },
    timeZone: {
        type: String,
        default: "(GMT+05:30) India Standard Time",
        maxlength: [100, "Time zone cannot exceed 100 characters"]
    },
    statusMsg: {
        type: String,
        default: "Focusing on project work",
        maxlength: [200, "Status message cannot exceed 200 characters"]
    },
    statusState: {
        type: String,
        enum: ["Available", "Busy", "In a Meeting", "Away", "Do Not Disturb"],
        default: "Available"
    },
    pronouns: {
        type: String,
        default: "he/him",
        maxlength: [30, "Pronouns cannot exceed 30 characters"]
    },
    showJobTitle: {
        type: Boolean,
        default: true
    },
    showCompany: {
        type: Boolean,
        default: true
    },
    showProfilePhoto: {
        type: Boolean,
        default: true
    },
    hdVideo: {
        type: Boolean,
        default: true
    },
    mirrorVideo: {
        type: Boolean,
        default: false
    },
    notifyInvites: {
        type: Boolean,
        default: true
    },
    notifyReminders: {
        type: Boolean,
        default: true
    },
    notifyJoins: {
        type: Boolean,
        default: true
    },
    notifyLeaves: {
        type: Boolean,
        default: false
    },
    emailNotifs: {
        type: Boolean,
        default: true
    },
    productUpdates: {
        type: Boolean,
        default: false
    },
    timeFormat: {
        type: String,
        enum: ["12h", "24h"],
        default: "12h"
    },
    accentColor: {
        type: String,
        default: "#3B82F6",
        maxlength: [30, "Accent color cannot exceed 30 characters"]
    },
    planName: {
        type: String,
        default: "Professional",
        maxlength: [50, "Plan name cannot exceed 50 characters"]
    }
}, { timestamps: true });

// Explicit database indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });

const User = model("User", userSchema);

export { User };