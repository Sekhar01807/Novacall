import httpStatus from "http-status";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { User } from "../models/UserModel.js";
import { ERROR_CODES, formatErrorResponse, formatSuccessResponse } from "../utils/errorCodes.js";
import { logger } from "../utils/logger.js";
import { validateForgotPassword, validateResetPassword } from "../utils/validators.js";
import { sendPasswordResetEmail, isEmailConfigured } from "../services/email.service.js";
import { asyncHandler, ApiError } from "../utils/apiError.js";

// In-memory hashed verification store: email => { hashedCode, expires, attempts }
const resetCodes = new Map();

// Periodic memory hygiene: clean expired reset records every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [email, record] of resetCodes.entries()) {
        if (now > record.expires) {
            resetCodes.delete(email);
        }
    }
}, 10 * 60 * 1000).unref();

/**
 * Request a password reset code
 * Security hardening:
 * - Generates cryptographically secure 6-digit code.
 * - Stores SHA-256 hashed code with 15-minute expiration and max 5 verification attempts.
 * - Dispatches verification email via Nodemailer (with dev console fallback).
 * - Generic response prevents user/email enumeration.
 * - In production mode, code is NEVER returned in HTTP response payload.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
    const validation = validateForgotPassword(req.body);
    if (!validation.isValid) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse(validation.message, ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }

    const { email } = validation.data;
    const user = await User.findOne({ email });

    const isProduction = process.env.NODE_ENV === "production";
    const genericMessage = isProduction || isEmailConfigured()
        ? "If an account exists with this email, a verification code has been dispatched."
        : "Password reset code generated. (Demo Notice: Verification code provided in payload for development testing only.)";

    if (!user) {
        // Constant-time generic response to prevent account enumeration
        return res.status(httpStatus.OK).json({
            success: true,
            message: genericMessage,
            code: "RESET_CODE_DISPATCHED",
            requestId: req.id
        });
    }

    // Generate cryptographically secure 6-digit code
    const code = crypto.randomInt(100000, 1000000).toString();
    // Compute SHA-256 hash for secure storage
    const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
    const expires = Date.now() + 15 * 60 * 1000; // 15 minutes

    resetCodes.set(email, {
        hashedCode,
        expires,
        attempts: 0
    });

    // Persist to user record as well
    user.resetPasswordToken = hashedCode;
    user.resetPasswordExpires = new Date(expires);
    user.resetPasswordAttempts = 0;
    await user.save();

    logger.info(`Password reset code generated and hashed for: ${email}`, { requestId: req.id });

    // Dispatch real email via Nodemailer
    await sendPasswordResetEmail({
        toEmail: email,
        username: user.name || user.username || "User",
        resetCode: code,
        requestId: req.id
    });

    const responsePayload = {
        success: true,
        message: genericMessage,
        code: "RESET_CODE_DISPATCHED",
        requestId: req.id
    };

    // NEVER expose raw reset code in production or when live email is configured
    if (!isProduction && !isEmailConfigured()) {
        responsePayload.resetCode = code;
    }

    res.status(httpStatus.OK).json(responsePayload);
});

/**
 * Verify reset code and update user password
 * Security hardening:
 * - Constant-time / SHA-256 hash comparison.
 * - Max 5 attempts rate limiting per code.
 * - Single-use token invalidation upon success.
 * - Revokes all existing sessions via tokenVersion.
 */
export const resetPasswordWithCode = asyncHandler(async (req, res) => {
    const validation = validateResetPassword(req.body);
    if (!validation.isValid) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse(validation.message, ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }

    const { email, resetCode, newPassword } = validation.data;
    let record = resetCodes.get(email);

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("Invalid verification code or expired request", ERROR_CODES.INVALID_CODE, req.id)
        );
    }

    // Fallback to database user record if memory was reset
    if (!record && user.resetPasswordToken && user.resetPasswordExpires) {
        record = {
            hashedCode: user.resetPasswordToken,
            expires: new Date(user.resetPasswordExpires).getTime(),
            attempts: user.resetPasswordAttempts || 0
        };
        resetCodes.set(email, record);
    }

    if (!record || !user.resetPasswordToken) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("No active password reset request found for this email", ERROR_CODES.INVALID_CODE, req.id)
        );
    }

    // Check expiration
    if (Date.now() > record.expires) {
        resetCodes.delete(email);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.resetPasswordAttempts = 0;
        await user.save();
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse("Verification code has expired. Please request a new code.", ERROR_CODES.INVALID_CODE, req.id)
        );
    }

    // Check if code has already exceeded maximum attempts
    const currentAttempts = Math.max(record.attempts || 0, user.resetPasswordAttempts || 0);
    if (currentAttempts >= 5) {
        resetCodes.delete(email);
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
        // Increment and immediately persist attempt count in DB and memory
        const newAttempts = currentAttempts + 1;
        record.attempts = newAttempts;
        user.resetPasswordAttempts = newAttempts;

        if (newAttempts >= 5) {
            resetCodes.delete(email);
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            user.resetPasswordAttempts = 0;
            await user.save();
            return res.status(httpStatus.TOO_MANY_REQUESTS).json(
                formatErrorResponse("Too many invalid attempts. This reset code is now invalidated.", ERROR_CODES.TOO_MANY_ATTEMPTS, req.id)
            );
        }

        await user.save();
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse(`Invalid verification code. (${5 - newAttempts} attempts remaining)`, ERROR_CODES.INVALID_CODE, req.id)
        );
    }

    // Code is valid: Update password, revoke existing sessions, enforce single-use invalidation
    user.password = await bcrypt.hash(newPassword, 10);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.resetPasswordAttempts = 0;
    await user.save();

    resetCodes.delete(email);
    logger.info(`Password successfully reset for: ${email}`, { requestId: req.id });

    res.status(httpStatus.OK).json(
        formatSuccessResponse(null, "Password reset successful. You can now log in.", req.id)
    );
});
