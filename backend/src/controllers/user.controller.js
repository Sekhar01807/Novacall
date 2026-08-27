import httpStatus from "http-status";
import bcrypt from "bcrypt";
import { User } from "../models/UserModel.js";
import { signJWT } from "../utils/jwt.js";
import { ERROR_CODES, formatErrorResponse, formatSuccessResponse } from "../utils/errorCodes.js";
import { logger } from "../utils/logger.js";
import { validateLogin, validateRegister } from "../utils/validators.js";
import { sendWelcomeEmail } from "../services/email.service.js";
import { asyncHandler, ApiError } from "../utils/apiError.js";

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
const login = asyncHandler(async (req, res) => {
    const validation = validateLogin(req.body);
    if (!validation.isValid) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse(validation.message, ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }

    const { username, password } = validation.data;

    const user = await User.findOne({
        $or: [{ username }, { email: username.toLowerCase() }]
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

    // Set HttpOnly session cookie for enhanced XSS protection
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(httpStatus.OK).json(
        formatSuccessResponse({
            email: user.email,
            username: user.username,
            name: user.name
        }, "Logged in successfully", req.id)
    );
});

/**
 * User Registration Controller
 * Validates input, hashes password with bcrypt, and creates user record.
 */
const register = asyncHandler(async (req, res) => {
    const validation = validateRegister(req.body);
    if (!validation.isValid) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse(validation.message, ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }

    const { name, email, username, password } = validation.data;

    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existingUser) {
        return res.status(httpStatus.CONFLICT).json(
            formatErrorResponse("An account with this email or username already exists", ERROR_CODES.USER_EXISTS, req.id)
        );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        name,
        email,
        username,
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

    // Set HttpOnly session cookie for enhanced XSS protection
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Asynchronously dispatch styled Welcome Email to the new user
    sendWelcomeEmail({
        toEmail: newUser.email,
        name: newUser.name,
        username: newUser.username,
        requestId: req.id
    }).catch((err) => {
        logger.warn("Welcome email async dispatch warning:", { error: err.message, requestId: req.id });
    });

    res.status(httpStatus.CREATED).json(
        formatSuccessResponse({
            name: newUser.name,
            username: newUser.username,
            email: newUser.email
        }, "User registered successfully", req.id)
    );
});

/**
 * User Logout Controller
 * Clears the session HttpOnly cookie.
 */
const logout = asyncHandler(async (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    });

    return res.status(httpStatus.OK).json(
        formatSuccessResponse(null, "Logged out successfully", req.id)
    );
});

export { 
    login as loginUser, 
    register as registerUser, 
    logout as logoutUser,
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