import httpStatus from "http-status";
import bcrypt from "bcrypt";
import { User } from "../models/UserModel.js";
import { signJWT } from "../utils/jwt.js";
import { ERROR_CODES, formatErrorResponse, formatSuccessResponse } from "../utils/errorCodes.js";
import { logger } from "../utils/logger.js";

// Re-export modular controllers for full backward compatibility
export * from "./profile.controller.js";
export * from "./passwordReset.controller.js";
export * from "./meetingHistory.controller.js";

import {
    buildUserProfileDTO,
    getUserProfile,
    updateUserProfile,
    changePassword,
    signOutAllDevices,
    deleteAccount
} from "./profile.controller.js";

import {
    forgotPassword,
    resetPasswordWithCode
} from "./passwordReset.controller.js";

import {
    getUserHistory,
    addToHistory,
    createScheduledMeeting,
    getUpcomingMeetings,
    deleteScheduledMeeting
} from "./meetingHistory.controller.js";

/**
 * User Login Controller
 * Authenticates user credentials and signs a stateless JWT session token.
 */
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

        // Generic authentication error message to prevent account enumeration
        const genericAuthError = () => res.status(httpStatus.UNAUTHORIZED).json(
            formatErrorResponse("Invalid username, email, or password", ERROR_CODES.AUTH_INVALID_CREDENTIALS, req.id)
        );

        if (!user) {
            return genericAuthError();
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return genericAuthError();
        }

        const token = signJWT({
            id: user._id,
            username: user.username,
            email: user.email,
            tokenVersion: user.tokenVersion || 0
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

/**
 * User Registration Controller
 * Validates input, hashes password with bcrypt, and creates user record.
 */
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
            password: hashedPassword,
            tokenVersion: 0
        });

        await newUser.save();

        const token = signJWT({
            id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            tokenVersion: 0
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
    deleteScheduledMeeting,
    buildUserProfileDTO
};