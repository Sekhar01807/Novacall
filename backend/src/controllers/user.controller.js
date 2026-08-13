import httpStatus from "http-status";
import { User } from "../models/UserModel.js";
import bcrypt from "bcrypt";
import { Meeting } from "../models/meetingModel.js";
import { ScheduledMeeting } from "../models/scheduledMeetingModel.js";
import { signJWT } from "../utils/jwt.js";

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !username.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: "Email or username is required",
            code: "VALIDATION_ERROR"
        });
    }
    if (!password || !password.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: "Password is required",
            code: "VALIDATION_ERROR"
        });
    }

    try {
        const user = await User.findOne({
            $or: [{ username: username.trim() }, { email: username.trim().toLowerCase() }]
        });

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({
                success: false,
                message: "No account found with this username or email",
                code: "USER_NOT_FOUND"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Invalid credentials. Please check your password.",
                code: "INVALID_CREDENTIALS"
            });
        }

        const token = signJWT({
            id: user._id,
            username: user.username,
            email: user.email
        });

        return res.status(httpStatus.OK).json({
            success: true,
            token: token,
            email: user.email,
            username: user.username,
            name: user.name
        });

    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: `Login error: ${e.message}`,
            code: "SERVER_ERROR"
        });
    }
};

const register = async (req, res) => {
    const { name, email, username, password } = req.body;

    if (!name || !name.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Full name is required", code: "VALIDATION_ERROR" });
    }
    if (!email || !email.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Email is required", code: "VALIDATION_ERROR" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Please enter a valid email address", code: "VALIDATION_ERROR" });
    }
    if (!username || !username.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Username is required", code: "VALIDATION_ERROR" });
    }
    if (!password || password.length < 8) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Password must be at least 8 characters long", code: "VALIDATION_ERROR" });
    }
    if (!/[A-Z]/.test(password)) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Password must contain at least one uppercase letter", code: "VALIDATION_ERROR" });
    }
    if (!/[0-9]/.test(password)) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Password must contain at least one number", code: "VALIDATION_ERROR" });
    }

    try {
        const existingUser = await User.findOne({
            $or: [{ username: username.trim() }, { email: email.trim().toLowerCase() }]
        });

        if (existingUser) {
            return res.status(httpStatus.CONFLICT).json({
                success: false,
                message: "An account with this email or username already exists",
                code: "USER_EXISTS"
            });
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

        res.status(httpStatus.CREATED).json({
            success: true,
            message: "User registered successfully",
            token: token,
            name: newUser.name,
            username: newUser.username,
            email: newUser.email
        });

    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: `Registration failed: ${e.message}`,
            code: "SERVER_ERROR"
        });
    }
};

const getUserHistory = async (req, res) => {
    try {
        const user = req.user;
        const meetings = await Meeting.find({ user_id: user.username }).sort({ date: -1 });
        res.status(httpStatus.OK).json(meetings);
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: e.message, code: "SERVER_ERROR" });
    }
};

const addToHistory = async (req, res) => {
    const { meeting_code } = req.body;
    if (!meeting_code) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Meeting code required", code: "VALIDATION_ERROR" });
    }

    try {
        const user = req.user;
        const newMeeting = new Meeting({
            user_id: user.username,
            meeting_code: meeting_code
        });

        await newMeeting.save();
        res.status(httpStatus.CREATED).json({ success: true, message: "Added code to history" });
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: e.message, code: "SERVER_ERROR" });
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
            planName: user.planName || "Professional"
        });
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: e.message, code: "SERVER_ERROR" });
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
        res.status(httpStatus.OK).json({ success: true, message: "Profile updated successfully" });
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: e.message, code: "SERVER_ERROR" });
    }
};

const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Please provide current and new password", code: "VALIDATION_ERROR" });
    }

    if (newPassword.length < 8) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "New password must be at least 8 characters long", code: "VALIDATION_ERROR" });
    }

    try {
        const user = await User.findById(req.user._id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(httpStatus.UNAUTHORIZED).json({ success: false, message: "Current password is incorrect", code: "INVALID_CREDENTIALS" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.status(httpStatus.OK).json({ success: true, message: "Password updated successfully" });
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: e.message, code: "SERVER_ERROR" });
    }
};

const signOutAllDevices = async (req, res) => {
    res.status(httpStatus.OK).json({ success: true, message: "Signed out of all devices" });
};

const deleteAccount = async (req, res) => {
    try {
        const user = req.user;
        await User.deleteOne({ _id: user._id });
        await Meeting.deleteMany({ user_id: user.username });
        await ScheduledMeeting.deleteMany({ user_id: user.username });

        res.status(httpStatus.OK).json({ success: true, message: "Account deleted successfully" });
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: e.message, code: "SERVER_ERROR" });
    }
};

const resetCodes = new Map();

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Email is required", code: "VALIDATION_ERROR" });

    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "No account found with this email address", code: "USER_NOT_FOUND" });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        resetCodes.set(email.toLowerCase(), { code, expires: Date.now() + 15 * 60 * 1000 });

        res.status(httpStatus.OK).json({
            success: true,
            message: "Reset code generated successfully",
            resetCode: code
        });
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: e.message, code: "SERVER_ERROR" });
    }
};

const resetPasswordWithCode = async (req, res) => {
    const { email, resetCode, newPassword } = req.body;
    if (!email || !resetCode || !newPassword) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Please provide email, reset code, and new password", code: "VALIDATION_ERROR" });
    }

    try {
        const record = resetCodes.get(email.toLowerCase());
        if (!record || record.code !== resetCode || Date.now() > record.expires) {
            return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Invalid or expired reset code", code: "INVALID_CODE" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "User not found", code: "USER_NOT_FOUND" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        resetCodes.delete(email.toLowerCase());

        res.status(httpStatus.OK).json({ success: true, message: "Password reset successful. You can now log in." });
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: e.message, code: "SERVER_ERROR" });
    }
};

const createScheduledMeeting = async (req, res) => {
    const { title, date, time, meeting_code } = req.body;
    if (!title || !date || !time || !meeting_code) {
        return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Missing required fields for scheduling", code: "VALIDATION_ERROR" });
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
        res.status(httpStatus.CREATED).json({ success: true, message: "Meeting scheduled successfully", meeting: newMeeting });
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: e.message, code: "SERVER_ERROR" });
    }
};

const getUpcomingMeetings = async (req, res) => {
    try {
        const user = req.user;
        const meetings = await ScheduledMeeting.find({ user_id: user.username }).sort({ date: 1, time: 1 });
        res.status(httpStatus.OK).json(meetings);
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: e.message, code: "SERVER_ERROR" });
    }
};

const deleteScheduledMeeting = async (req, res) => {
    const { id } = req.params;
    try {
        const user = req.user;
        const meeting = await ScheduledMeeting.findById(id);

        if (!meeting) {
            return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "Scheduled meeting not found", code: "NOT_FOUND" });
        }

        if (meeting.user_id !== user.username) {
            return res.status(httpStatus.FORBIDDEN).json({ success: false, message: "You are not authorized to delete this meeting", code: "FORBIDDEN" });
        }

        await ScheduledMeeting.findByIdAndDelete(id);
        res.status(httpStatus.OK).json({ success: true, message: "Scheduled meeting cancelled successfully" });
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: e.message, code: "SERVER_ERROR" });
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