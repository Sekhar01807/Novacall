import httpStatus from "http-status";
import crypto from "node:crypto";
import { User } from "../models/UserModel.js";
import bcrypt from "bcrypt";
import { Meeting } from "../models/meetingModel.js";
import { ScheduledMeeting } from "../models/scheduledMeetingModel.js";
import { signJWT } from "../utils/jwt.js";
import { ERROR_CODES, formatErrorResponse, formatSuccessResponse } from "../utils/errorCodes.js";
import { logger } from "../utils/logger.js";
import { generateSecureRoomCode } from "../utils/roomCodeGenerator.js";

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !username.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("Email or username is required", ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }
    if (!password || !password.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("Password is required", ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }

    try {
        const user = await User.findOne({
            $or: [{ username: username.trim() }, { email: username.trim().toLowerCase() }]
        });

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json(
                formatErrorResponse("No account found with this username or email", ERROR_CODES.AUTH_USER_NOT_FOUND, req.id)
            );
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(httpStatus.UNAUTHORIZED).json(
                formatErrorResponse("Invalid credentials. Please check your password.", ERROR_CODES.AUTH_INVALID_CREDENTIALS, req.id)
            );
        }

        const token = signJWT({
            id: user._id,
            username: user.username,
            email: user.email
        });

        return res.status(httpStatus.OK).json(
            formatSuccessResponse({
                token: token,
                email: user.email,
                username: user.username,
                name: user.name
            }, null, req.id)
        );

    } catch (e) {
        logger.error("Login controller error", { error: e.message, requestId: req.id });
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(`Login error: ${e.message}`, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

const register = async (req, res) => {
    const { name, email, username, password } = req.body;

    if (!name || !name.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("Full name is required", ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }
    if (!email || !email.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("Email is required", ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("Please enter a valid email address", ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }
    if (!username || !username.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("Username is required", ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }
    if (!password || password.length < 8) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("Password must be at least 8 characters long", ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }
    if (!/[A-Z]/.test(password)) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("Password must contain at least one uppercase letter", ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }
    if (!/[0-9]/.test(password)) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("Password must contain at least one number", ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }

    try {
        const existingUser = await User.findOne({
            $or: [{ username: username.trim() }, { email: email.trim().toLowerCase() }]
        });

        if (existingUser) {
            return res.status(httpStatus.CONFLICT).json(
                formatErrorResponse("An account with this email or username already exists", ERROR_CODES.USER_EXISTS, req.id)
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            username: username.trim(),
            password: hashedPassword
        });

        await newUser.save();

        const token = signJWT({
            id: newUser._id,
            username: newUser.username,
            email: newUser.email
        });

        res.status(httpStatus.CREATED).json(
            formatSuccessResponse({
                token: token,
                name: newUser.name,
                username: newUser.username,
                email: newUser.email
            }, "User registered successfully", req.id)
        );

    } catch (e) {
        logger.error("Registration controller error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(`Registration failed: ${e.message}`, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

/**
 * Get User Meeting History with Pagination & Search Support
 * Query parameters:
 *  - page: number (default 1)
 *  - limit: number (default 10, max 100)
 *  - search: string (optional meeting code substring filter)
 */
const getUserHistory = async (req, res) => {
    try {
        const user = req.user;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const search = req.query.search ? String(req.query.search).trim() : "";

        const query = { user_id: user.username };
        if (search) {
            query.meeting_code = { $regex: search, $options: "i" };
        }

        const total = await Meeting.countDocuments(query);
        const meetings = await Meeting.find(query)
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const totalPages = Math.ceil(total / limit) || 1;

        // Structured paginated response with backward compatible array field
        return res.status(httpStatus.OK).json({
            success: true,
            meetings: meetings,
            data: meetings, // alias for standard consumer
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            requestId: req.id
        });
    } catch (e) {
        logger.error("Get user history error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(e.message, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

const addToHistory = async (req, res) => {
    const { meeting_code } = req.body;
    if (!meeting_code || !meeting_code.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("Meeting code required", ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }

    try {
        const user = req.user;
        const newMeeting = new Meeting({
            user_id: user.username,
            meeting_code: meeting_code.trim()
        });

        await newMeeting.save();
        res.status(httpStatus.CREATED).json(
            formatSuccessResponse(newMeeting, "Added code to history", req.id)
        );
    } catch (e) {
        logger.error("Add to history error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(e.message, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

const getUserProfile = async (req, res) => {
    try {
        const user = req.user;
        res.status(httpStatus.OK).json({
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
            requestId: req.id
        });
    } catch (e) {
        logger.error("Get profile error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(e.message, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

const updateUserProfile = async (req, res) => {
    try {
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
        const safeUser = user.toObject();
        delete safeUser.password;
        res.status(httpStatus.OK).json({
            success: true,
            message: "Profile updated successfully",
            profile: safeUser,
            requestId: req.id
        });
    } catch (e) {
        logger.error("Update profile error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(e.message, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("Please provide current and new password", ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }

    if (newPassword.length < 8) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("New password must be at least 8 characters long", ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }

    try {
        const user = await User.findById(req.user._id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(httpStatus.UNAUTHORIZED).json(
                formatErrorResponse("Current password is incorrect", ERROR_CODES.AUTH_INVALID_CREDENTIALS, req.id)
            );
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.status(httpStatus.OK).json(
            formatSuccessResponse(null, "Password updated successfully", req.id)
        );
    } catch (e) {
        logger.error("Change password error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(e.message, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

const signOutAllDevices = async (req, res) => {
    res.status(httpStatus.OK).json(
        formatSuccessResponse(null, "Signed out of all devices", req.id)
    );
};

const deleteAccount = async (req, res) => {
    try {
        const user = req.user;
        await User.deleteOne({ _id: user._id });
        await Meeting.deleteMany({ user_id: user.username });
        await ScheduledMeeting.deleteMany({ user_id: user.username });

        res.status(httpStatus.OK).json(
            formatSuccessResponse(null, "Account deleted successfully", req.id)
        );
    } catch (e) {
        logger.error("Delete account error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(e.message, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

// In-memory hashed verification store: email => { hashedCode, expires, attempts }
const resetCodes = new Map();

/**
 * Request a password reset code
 * Security hardening:
 * - Generates cryptographically secure 6-digit code.
 * - Stores SHA-256 hashed code with 15-minute expiration and max 5 verification attempts.
 * - In production mode, code is NEVER returned in response.
 */
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email || !email.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("Email is required", ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json(
                formatErrorResponse("No account found with this email address", ERROR_CODES.AUTH_USER_NOT_FOUND, req.id)
            );
        }

        // Generate cryptographically secure 6-digit code
        const code = crypto.randomInt(100000, 1000000).toString();
        // Compute SHA-256 hash for secure storage
        const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
        const expires = Date.now() + 15 * 60 * 1000; // 15 minutes

        resetCodes.set(normalizedEmail, {
            hashedCode,
            expires,
            attempts: 0
        });

        // Persist to user record as well
        user.resetPasswordToken = hashedCode;
        user.resetPasswordExpires = new Date(expires);
        user.resetPasswordAttempts = 0;
        await user.save();

        logger.info(`Password reset code generated and hashed for: ${normalizedEmail}`, { requestId: req.id });

        const isProduction = process.env.NODE_ENV === "production";
        const responsePayload = {
            success: true,
            message: isProduction
                ? "If an account exists with this email, a verification code has been dispatched."
                : "Password reset code generated. (Demo Notice: Verification code provided in payload for development testing only.)",
            code: "RESET_CODE_DISPATCHED",
            requestId: req.id
        };

        // NEVER expose raw reset code in production
        if (!isProduction && !process.env.SMTP_HOST) {
            responsePayload.resetCode = code;
        }

        res.status(httpStatus.OK).json(responsePayload);
    } catch (e) {
        logger.error("Forgot password error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(e.message, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

/**
 * Verify reset code and update user password
 * Security hardening:
 * - Constant-time / SHA-256 hash comparison.
 * - Max 5 attempts rate limiting per code.
 * - Single-use token invalidation upon success.
 */
const resetPasswordWithCode = async (req, res) => {
    const { email, resetCode, newPassword } = req.body;
    if (!email || !resetCode || !newPassword) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("Please provide email, reset code, and new password", ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }

    if (newPassword.length < 8) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("New password must be at least 8 characters long", ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();
        let record = resetCodes.get(normalizedEmail);

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json(
                formatErrorResponse("User not found", ERROR_CODES.AUTH_USER_NOT_FOUND, req.id)
            );
        }

        // Fallback to database user record if memory was reset
        if (!record && user.resetPasswordToken && user.resetPasswordExpires) {
            record = {
                hashedCode: user.resetPasswordToken,
                expires: new Date(user.resetPasswordExpires).getTime(),
                attempts: user.resetPasswordAttempts || 0
            };
        }

        if (!record) {
            return res.status(httpStatus.BAD_REQUEST).json(
                formatErrorResponse("No active password reset request found for this email", ERROR_CODES.INVALID_CODE, req.id)
            );
        }

        // Check expiration
        if (Date.now() > record.expires) {
            resetCodes.delete(normalizedEmail);
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await user.save();
            return res.status(httpStatus.BAD_REQUEST).json(
                formatErrorResponse("Verification code has expired. Please request a new code.", ERROR_CODES.INVALID_CODE, req.id)
            );
        }

        // Rate limit attempts (Max 5 attempts)
        record.attempts = (record.attempts || 0) + 1;
        if (record.attempts > 5) {
            resetCodes.delete(normalizedEmail);
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            user.resetPasswordAttempts = 0;
            await user.save();
            return res.status(httpStatus.TOO_MANY_REQUESTS).json(
                formatErrorResponse("Too many invalid attempts. This reset code is now invalidated.", ERROR_CODES.TOO_MANY_ATTEMPTS, req.id)
            );
        }

        // Hash user supplied code to compare against stored hash
        const inputHash = crypto.createHash("sha256").update(String(resetCode).trim()).digest("hex");
        const isMatch = record.hashedCode === inputHash;

        if (!isMatch) {
            return res.status(httpStatus.BAD_REQUEST).json(
                formatErrorResponse(`Invalid verification code. (${5 - record.attempts} attempts remaining)`, ERROR_CODES.INVALID_CODE, req.id)
            );
        }

        // Code is valid: Update password and enforce single-use invalidation
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.resetPasswordAttempts = 0;
        await user.save();

        resetCodes.delete(normalizedEmail);
        logger.info(`Password successfully reset for: ${normalizedEmail}`, { requestId: req.id });

        res.status(httpStatus.OK).json(
            formatSuccessResponse(null, "Password reset successful. You can now log in.", req.id)
        );
    } catch (e) {
        logger.error("Reset password error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(e.message, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

const createScheduledMeeting = async (req, res) => {
    const title = req.body.title;
    const meeting_code = req.body.meeting_code || generateSecureRoomCode();
    const date = req.body.date || req.body.scheduled_date;
    const time = req.body.time || req.body.scheduled_time;

    if (!title || !date || !time) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("Missing required fields for scheduling", ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }

    try {
        const user = req.user;
        const newMeeting = new ScheduledMeeting({
            user_id: user.username,
            title: title.trim(),
            date: date,
            time: time,
            meeting_code: meeting_code.trim()
        });

        await newMeeting.save();
        res.status(httpStatus.CREATED).json({
            success: true,
            message: "Meeting scheduled successfully",
            meeting: newMeeting,
            requestId: req.id
        });
    } catch (e) {
        logger.error("Create scheduled meeting error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(e.message, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

const getUpcomingMeetings = async (req, res) => {
    try {
        const user = req.user;
        const meetings = await ScheduledMeeting.find({ user_id: user.username }).sort({ scheduled_date: 1, scheduled_time: 1 });
        res.status(httpStatus.OK).json({
            success: true,
            meetings: meetings,
            data: meetings,
            requestId: req.id
        });
    } catch (e) {
        logger.error("Get upcoming meetings error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(e.message, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

const deleteScheduledMeeting = async (req, res) => {
    const { id } = req.params;
    try {
        const user = req.user;
        // Atomic ownership query: Enforce meeting ownership at the database query level
        const deleted = await ScheduledMeeting.findOneAndDelete({ _id: id, user_id: user.username });

        if (!deleted) {
            // Check if meeting exists under another user to distinguish 403 Forbidden vs 404 Not Found
            const existsUnderOtherUser = await ScheduledMeeting.findById(id);
            if (existsUnderOtherUser) {
                return res.status(httpStatus.FORBIDDEN).json(
                    formatErrorResponse("You are not authorized to delete this meeting", ERROR_CODES.FORBIDDEN, req.id)
                );
            }
            return res.status(httpStatus.NOT_FOUND).json(
                formatErrorResponse("Scheduled meeting not found", ERROR_CODES.NOT_FOUND, req.id)
            );
        }

        res.status(httpStatus.OK).json(
            formatSuccessResponse(null, "Scheduled meeting cancelled successfully", req.id)
        );
    } catch (e) {
        logger.error("Delete scheduled meeting error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(e.message, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

export { 
    login as loginUser, 
    register as registerUser, 
    getUserHistory, 
    addToHistory,
    getUserProfile,
    updateUserProfile,
    changePassword,
    signOutAllDevices,
    deleteAccount,
    forgotPassword,
    resetPasswordWithCode,
    createScheduledMeeting,
    getUpcomingMeetings,
    deleteScheduledMeeting
};