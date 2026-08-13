import { Schema, model } from "mongoose";

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"]
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minlength: [3, "Username must be at least 3 characters"],
        match: [/^[a-zA-Z0-9_.-]+$/, "Username can only contain alphanumeric characters, underscores, dots, and hyphens"]
    },
    password: {
        type: String,
        required: true
    },
    jobTitle: {
        type: String,
        default: ""
    },
    company: {
        type: String,
        default: ""
    },
    profilePic: {
        type: String,
        default: ""
    },
    themeMode: {
        type: String,
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
        default: ""
    },
    country: {
        type: String,
        default: "India"
    },
    timeZone: {
        type: String,
        default: "(GMT+05:30) India Standard Time"
    },
    statusMsg: {
        type: String,
        default: "Focusing on project work"
    },
    statusState: {
        type: String,
        default: "Available"
    },
    pronouns: {
        type: String,
        default: "he/him"
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
        default: "12h"
    },
    accentColor: {
        type: String,
        default: "#3B82F6"
    },
    planName: {
        type: String,
        default: "Professional"
    }
});

const User = model("User", userSchema);

export { User };