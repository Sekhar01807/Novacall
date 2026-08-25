import httpStatus from "http-status";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { User } from "../models/UserModel.js";
import { Meeting } from "../models/meetingModel.js";
import { ScheduledMeeting } from "../models/scheduledMeetingModel.js";
import { ERROR_CODES, formatErrorResponse, formatSuccessResponse } from "../utils/errorCodes.js";
import { logger } from "../utils/logger.js";
import { validateChangePassword } from "../utils/validators.js";
import { asyncHandler, ApiError } from "../utils/apiError.js";

/**
 * Public User Profile DTO Builder
 * Whitelists only safe public profile fields; strictly prevents leakage of
 * reset password tokens, expiration metadata, token versions, or credentials.
 */
export const buildUserProfileDTO = (user, requestId = null) => ({
    name: user.name,
    email: user.email,
    username: user.username,
    jobTitle: user.jobTitle || "",
    company: user.company || "",
    profilePic: user.profilePic || "",
    themeMode: user.themeMode || "light",
    defaultMicOff: user.defaultMicOff || false,
    defaultCamOff: user.defaultCamOff || false,
    selectedCam: user.selectedCam || "default",
    selectedMic: user.selectedMic || "default",
    selectedSpeaker: user.selectedSpeaker || "default",
    phone: user.phone || "",
    country: user.country || "India",
    timeZone: user.timeZone || "(GMT+05:30) India Standard Time",
    statusMsg: user.statusMsg || "Focusing on project work",
    statusState: user.statusState || "Available",
    pronouns: user.pronouns || "he/him",
    showJobTitle: user.showJobTitle ?? true,
    showCompany: user.showCompany ?? true,
    showProfilePhoto: user.showProfilePhoto ?? true,
    hdVideo: user.hdVideo ?? true,
    mirrorVideo: user.mirrorVideo ?? false,
    notifyInvites: user.notifyInvites ?? true,
    notifyReminders: user.notifyReminders ?? true,
    notifyJoins: user.notifyJoins ?? true,
    notifyLeaves: user.notifyLeaves ?? false,
    emailNotifs: user.emailNotifs ?? true,
    productUpdates: user.productUpdates ?? false,
    timeFormat: user.timeFormat || "12h",
    accentColor: user.accentColor || "#3B82F6",
    planName: user.planName || "Professional",
    ...(requestId ? { requestId } : {})
});

export const getUserProfile = asyncHandler(async (req, res) => {
    const user = req.user;
    res.status(httpStatus.OK).json(buildUserProfileDTO(user, req.id));
});

export const updateUserProfile = asyncHandler(async (req, res) => {
    const user = req.user;
    const allowedFields = [
        "name", "jobTitle", "company", "profilePic", "themeMode",
        "defaultMicOff", "defaultCamOff", "selectedCam", "selectedMic",
        "selectedSpeaker", "phone", "country", "timeZone", "statusMsg",
        "statusState", "pronouns", "showJobTitle", "showCompany",
        "showProfilePhoto", "hdVideo", "mirrorVideo", "notifyInvites",
        "notifyReminders", "notifyJoins", "notifyLeaves", "emailNotifs",
        "productUpdates", "timeFormat", "accentColor"
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            user[field] = req.body[field];
        }
    });

    await user.save();
    const safeProfile = buildUserProfileDTO(user);
    res.status(httpStatus.OK).json({
        success: true,
        message: "Profile updated successfully",
        profile: safeProfile,
        requestId: req.id
    });
});

export const changePassword = asyncHandler(async (req, res) => {
    const validation = validateChangePassword(req.body);
    if (!validation.isValid) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse(validation.message, ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }

    const { currentPassword, newPassword } = validation.data;

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        return res.status(httpStatus.UNAUTHORIZED).json(
            formatErrorResponse("Current password is incorrect", ERROR_CODES.AUTH_INVALID_CREDENTIALS, req.id)
        );
    }

    user.password = await bcrypt.hash(newPassword, 10);
    // Revoke all existing sessions by incrementing token version
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    });

    res.status(httpStatus.OK).json(
        formatSuccessResponse(null, "Password updated successfully. Existing sessions have been revoked.", req.id)
    );
});

export const signOutAllDevices = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        // Revoke all existing sessions by incrementing token version
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        await user.save();
    }

    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    });

    res.status(httpStatus.OK).json(
        formatSuccessResponse(null, "Signed out of all devices successfully. Existing sessions have been revoked.", req.id)
    );
});

export const deleteAccount = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession().catch(() => null);
    try {
        const user = req.user;
        if (session) {
            session.startTransaction();
            await User.deleteOne({ _id: user._id }).session(session);
            await Meeting.deleteMany({ user_id: user.username }).session(session);
            await ScheduledMeeting.deleteMany({ user_id: user.username }).session(session);
            await session.commitTransaction();
            session.endSession();
        } else {
            await User.deleteOne({ _id: user._id });
            await Meeting.deleteMany({ user_id: user.username });
            await ScheduledMeeting.deleteMany({ user_id: user.username });
        }

        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
        });

        res.status(httpStatus.OK).json(
            formatSuccessResponse(null, "Account deleted successfully", req.id)
        );
    } catch (e) {
        if (session) {
            await session.abortTransaction().catch(() => {});
            session.endSession();
        }
        throw e;
    }
});
