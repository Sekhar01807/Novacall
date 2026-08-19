/**
 * Request Input Validation Utility
 * Standardized schema validators for authentication, profile, meeting scheduling, and security operations.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate User Login Input
 */
export const validateLogin = (body = {}) => {
    const username = body.username ? String(body.username).trim() : "";
    const password = body.password ? String(body.password).trim() : "";

    if (!username) {
        return { isValid: false, message: "Email or username is required" };
    }
    if (!password) {
        return { isValid: false, message: "Password is required" };
    }

    return { isValid: true, data: { username, password } };
};

/**
 * Validate User Registration Input
 */
export const validateRegister = (body = {}) => {
    const name = body.name ? String(body.name).trim() : "";
    const email = body.email ? String(body.email).trim().toLowerCase() : "";
    const username = body.username ? String(body.username).trim() : "";
    const password = body.password ? String(body.password) : "";

    if (!name) {
        return { isValid: false, message: "Full name is required" };
    }
    if (!email) {
        return { isValid: false, message: "Email is required" };
    }
    if (!EMAIL_REGEX.test(email)) {
        return { isValid: false, message: "Please enter a valid email address" };
    }
    if (!username) {
        return { isValid: false, message: "Username is required" };
    }
    if (!password || password.length < 8) {
        return { isValid: false, message: "Password must be at least 8 characters long" };
    }
    if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: "Password must contain at least one uppercase letter" };
    }
    if (!/[0-9]/.test(password)) {
        return { isValid: false, message: "Password must contain at least one number" };
    }

    return { isValid: true, data: { name, email, username, password } };
};

/**
 * Validate Forgot Password Input
 */
export const validateForgotPassword = (body = {}) => {
    const email = body.email ? String(body.email).trim().toLowerCase() : "";
    if (!email) {
        return { isValid: false, message: "Email is required" };
    }
    return { isValid: true, data: { email } };
};

/**
 * Validate Password Reset With Code Input
 */
export const validateResetPassword = (body = {}) => {
    const email = body.email ? String(body.email).trim().toLowerCase() : "";
    const resetCode = body.resetCode ? String(body.resetCode).trim() : "";
    const newPassword = body.newPassword ? String(body.newPassword) : "";

    if (!email || !resetCode || !newPassword) {
        return { isValid: false, message: "Please provide email, reset code, and new password" };
    }
    if (newPassword.length < 8) {
        return { isValid: false, message: "New password must be at least 8 characters long" };
    }

    return { isValid: true, data: { email, resetCode, newPassword } };
};

/**
 * Validate Change Password Input
 */
export const validateChangePassword = (body = {}) => {
    const currentPassword = body.currentPassword ? String(body.currentPassword) : "";
    const newPassword = body.newPassword ? String(body.newPassword) : "";

    if (!currentPassword || !newPassword) {
        return { isValid: false, message: "Please provide current and new password" };
    }
    if (newPassword.length < 8) {
        return { isValid: false, message: "New password must be at least 8 characters long" };
    }

    return { isValid: true, data: { currentPassword, newPassword } };
};

/**
 * Validate Scheduled Meeting Input
 */
export const validateScheduledMeeting = (body = {}) => {
    const title = body.title ? String(body.title).trim() : "";
    const rawDate = body.scheduled_date || body.date;
    const rawTime = body.scheduled_time || body.time || "10:00 AM";
    const duration = body.duration ? String(body.duration).trim().substring(0, 30) : "30 mins";
    const time_zone = body.time_zone ? String(body.time_zone).trim().substring(0, 100) : "(GMT+05:30) India Standard Time";
    const description = body.description ? String(body.description).trim().substring(0, 500) : "";

    if (!title || !rawDate) {
        return { isValid: false, message: "Meeting title and scheduled date are required" };
    }
    if (title.length > 120) {
        return { isValid: false, message: "Meeting title cannot exceed 120 characters" };
    }

    const scheduledDateObj = new Date(rawDate);
    if (isNaN(scheduledDateObj.getTime())) {
        return { isValid: false, message: "Invalid scheduled date format" };
    }

    return {
        isValid: true,
        data: {
            title,
            scheduled_date: scheduledDateObj,
            scheduled_time: String(rawTime).trim().substring(0, 30),
            duration,
            time_zone,
            description,
            meeting_code: body.meeting_code
        }
    };
};

/**
 * Validate Meeting History Activity Input
 */
export const validateMeetingCode = (body = {}) => {
    const meeting_code = body.meeting_code ? String(body.meeting_code).trim() : "";
    if (!meeting_code) {
        return { isValid: false, message: "Meeting code required" };
    }
    return { isValid: true, data: { meeting_code } };
};
