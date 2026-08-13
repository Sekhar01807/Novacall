import httpStatus from "http-status";
import { User } from "../models/UserModel.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meetingModel.js";
import { ScheduledMeeting } from "../models/scheduledMeetingModel.js";

const base64UrlEncode = (str) => {
    return Buffer.from(str)
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
};

const generateJWT = (payload, secret) => {
    const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = crypto
        .createHmac("sha256", secret)
        .update(`${header}.${encodedPayload}`)
        .digest("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    return `${header}.${encodedPayload}.${signature}`;
};

const verifyJWT = (token, secret) => {
    try {
        const [header, payload, signature] = token.split(".");
        const expectedSig = crypto
            .createHmac("sha256", secret)
            .update(`${header}.${payload}`)
            .digest("base64")
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");
        if (signature !== expectedSig) return null;
        const decodedPayload = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
        if (decodedPayload.exp && Date.now() / 1000 > decodedPayload.exp) return null;
        return decodedPayload;
    } catch {
        return null;
    }
};

const login = async (req, res) => {
    const { username, password } = req.body;

    // Item 7: Login input validation
    if (!username || !username.trim()) {
        return res.status(400).json({ message: "Email or username is required" });
    }
    if (!password || !password.trim()) {
        return res.status(400).json({ message: "Password is required" });
    }

    try {
        const user = await User.findOne({ $or: [{ username: username }, { email: username }] });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User Not Found" });
        }

        let isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (isPasswordCorrect) {
            const secret = process.env.JWT_SECRET || "novacall_enterprise_jwt_secret";
            const payload = {
                id: user._id,
                username: user.username,
                email: user.email,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days expiration
            };

            const token = generateJWT(payload, secret);

            user.token = token;
            await user.save();
            return res.status(httpStatus.OK).json({ token: token, email: user.email, username: user.username, name: user.name });
        } else {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid Username or password" });
        }

    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const register = async (req, res) => {
    const { name, email, username, password } = req.body;

    // Item 7: Server-side input validation
    if (!name || !name.trim()) {
        return res.status(400).json({ message: "Full name is required" });
    }
    if (!email || !email.trim()) {
        return res.status(400).json({ message: "Email is required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
    }
    if (!username || !username.trim()) {
        return res.status(400).json({ message: "Username is required" });
    }
    if (!password || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }
    if (!/[A-Z]/.test(password)) {
        return res.status(400).json({ message: "Password must contain at least one uppercase letter" });
    }
    if (!/[0-9]/.test(password)) {
        return res.status(400).json({ message: "Password must contain at least one number" });
    }

    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            // Item 8: Use 409 Conflict instead of 302 Found
            return res.status(409).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name,
            email: email,
            username: username,
            password: hashedPassword
        });

        await newUser.save();

        res.status(httpStatus.CREATED).json({ message: "User Registered Successfully" });

    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const getUserHistory = async (req, res) => {
    const { token } = req.query;

    try {
        const secret = process.env.JWT_SECRET || "novacall_enterprise_jwt_secret";
        const decoded = verifyJWT(token, secret);
        
        let user;
        if (decoded && decoded.username) {
            user = await User.findOne({ username: decoded.username });
        } else {
            user = await User.findOne({ token: token });
        }

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User session expired or invalid" });
        }

        const meetings = await Meeting.find({ user_id: user.username });
        res.json(meetings);
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const addToHistory = async (req, res) => {
    const { token, meeting_code } = req.body;

    try {
        const secret = process.env.JWT_SECRET || "novacall_enterprise_jwt_secret";
        const decoded = verifyJWT(token, secret);
        
        let user;
        if (decoded && decoded.username) {
            user = await User.findOne({ username: decoded.username });
        } else {
            user = await User.findOne({ token: token });
        }

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User session invalid" });
        }

        const newMeeting = new Meeting({
            user_id: user.username,
            meeting_code: meeting_code
        });

        await newMeeting.save();

        res.status(httpStatus.CREATED).json({ message: "Added code to history" });
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const getUserProfile = async (req, res) => {
    const { token } = req.query;

    try {
        const secret = process.env.JWT_SECRET || "novacall_enterprise_jwt_secret";
        const decoded = verifyJWT(token, secret);
        
        let user;
        if (decoded && decoded.username) {
            user = await User.findOne({ username: decoded.username });
        } else {
            user = await User.findOne({ token: token });
        }

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User session expired or invalid" });
        }

        res.json({
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
        res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const updateUserProfile = async (req, res) => {
    const { 
        token, name, jobTitle, company, profilePic, themeMode, defaultMicOff, defaultCamOff, 
        selectedCam, selectedMic, selectedSpeaker, phone, country, timeZone, statusMsg, 
        statusState, pronouns, showJobTitle, showCompany, showProfilePhoto, hdVideo, mirrorVideo, 
        notifyInvites, notifyReminders, notifyJoins, notifyLeaves, emailNotifs, productUpdates, 
        timeFormat, accentColor, planName 
    } = req.body;

    try {
        const secret = process.env.JWT_SECRET || "novacall_enterprise_jwt_secret";
        const decoded = verifyJWT(token, secret);
        
        let user;
        if (decoded && decoded.username) {
            user = await User.findOne({ username: decoded.username });
        } else {
            user = await User.findOne({ token: token });
        }

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User session invalid" });
        }

        if (name !== undefined) user.name = name;
        if (jobTitle !== undefined) user.jobTitle = jobTitle;
        if (company !== undefined) user.company = company;
        if (profilePic !== undefined) user.profilePic = profilePic;
        if (themeMode !== undefined) user.themeMode = themeMode;
        if (defaultMicOff !== undefined) user.defaultMicOff = defaultMicOff;
        if (defaultCamOff !== undefined) user.defaultCamOff = defaultCamOff;
        if (selectedCam !== undefined) user.selectedCam = selectedCam;
        if (selectedMic !== undefined) user.selectedMic = selectedMic;
        if (selectedSpeaker !== undefined) user.selectedSpeaker = selectedSpeaker;
        if (phone !== undefined) user.phone = phone;
        if (country !== undefined) user.country = country;
        if (timeZone !== undefined) user.timeZone = timeZone;
        if (statusMsg !== undefined) user.statusMsg = statusMsg;
        if (statusState !== undefined) user.statusState = statusState;
        if (pronouns !== undefined) user.pronouns = pronouns;
        if (showJobTitle !== undefined) user.showJobTitle = showJobTitle;
        if (showCompany !== undefined) user.showCompany = showCompany;
        if (showProfilePhoto !== undefined) user.showProfilePhoto = showProfilePhoto;
        if (hdVideo !== undefined) user.hdVideo = hdVideo;
        if (mirrorVideo !== undefined) user.mirrorVideo = mirrorVideo;
        if (notifyInvites !== undefined) user.notifyInvites = notifyInvites;
        if (notifyReminders !== undefined) user.notifyReminders = notifyReminders;
        if (notifyJoins !== undefined) user.notifyJoins = notifyJoins;
        if (notifyLeaves !== undefined) user.notifyLeaves = notifyLeaves;
        if (emailNotifs !== undefined) user.emailNotifs = emailNotifs;
        if (productUpdates !== undefined) user.productUpdates = productUpdates;
        if (timeFormat !== undefined) user.timeFormat = timeFormat;
        if (accentColor !== undefined) user.accentColor = accentColor;
        if (planName !== undefined) user.planName = planName;

        await user.save();

        res.status(httpStatus.OK).json({ 
            message: "Profile updated successfully",
            profile: {
                name: user.name,
                email: user.email,
                username: user.username,
                jobTitle: user.jobTitle,
                company: user.company,
                profilePic: user.profilePic,
                themeMode: user.themeMode,
                defaultMicOff: user.defaultMicOff,
                defaultCamOff: user.defaultCamOff,
                selectedCam: user.selectedCam,
                selectedMic: user.selectedMic,
                selectedSpeaker: user.selectedSpeaker,
                phone: user.phone,
                country: user.country,
                timeZone: user.timeZone,
                statusMsg: user.statusMsg,
                statusState: user.statusState,
                pronouns: user.pronouns,
                showJobTitle: user.showJobTitle,
                showCompany: user.showCompany,
                showProfilePhoto: user.showProfilePhoto,
                hdVideo: user.hdVideo,
                mirrorVideo: user.mirrorVideo,
                notifyInvites: user.notifyInvites,
                notifyReminders: user.notifyReminders,
                notifyJoins: user.notifyJoins,
                notifyLeaves: user.notifyLeaves,
                emailNotifs: user.emailNotifs,
                productUpdates: user.productUpdates,
                timeFormat: user.timeFormat,
                accentColor: user.accentColor,
                planName: user.planName
            }
        });
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const changePassword = async (req, res) => {
    const { token, oldPassword, newPassword } = req.body;

    try {
        const secret = process.env.JWT_SECRET || "novacall_enterprise_jwt_secret";
        const decoded = verifyJWT(token, secret);

        let user;
        if (decoded && decoded.username) {
            user = await User.findOne({ username: decoded.username });
        } else {
            user = await User.findOne({ token: token });
        }

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User session invalid" });
        }

        if (oldPassword) {
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(httpStatus.UNAUTHORIZED).json({ message: "Incorrect old password" });
            }
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.status(httpStatus.OK).json({ message: "Password updated successfully" });
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const signOutAllDevices = async (req, res) => {
    const { token } = req.body;

    try {
        const secret = process.env.JWT_SECRET || "novacall_enterprise_jwt_secret";
        const decoded = verifyJWT(token, secret);

        let user;
        if (decoded && decoded.username) {
            user = await User.findOne({ username: decoded.username });
        } else {
            user = await User.findOne({ token: token });
        }

        if (user) {
            user.token = "";
            await user.save();
        }

        res.status(httpStatus.OK).json({ message: "Signed out of all devices" });
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const deleteAccount = async (req, res) => {
    const { token } = req.body;

    try {
        const secret = process.env.JWT_SECRET || "novacall_enterprise_jwt_secret";
        const decoded = verifyJWT(token, secret);

        let user;
        if (decoded && decoded.username) {
            user = await User.findOne({ username: decoded.username });
        } else {
            user = await User.findOne({ token: token });
        }

        if (user) {
            await User.deleteOne({ _id: user._id });
            await Meeting.deleteMany({ user_id: user.username });
        }

        res.status(httpStatus.OK).json({ message: "Account deleted successfully" });
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

// Item 10: Forgot Password Flow
const resetCodes = new Map(); // In-memory reset code storage (email -> { code, expires })

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "No account found with this email address" });
        }

        // Generate a 6-digit verification code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        resetCodes.set(email.toLowerCase(), { code, expires: Date.now() + 15 * 60 * 1000 });

        res.status(httpStatus.OK).json({
            message: "Reset code generated successfully",
            resetCode: code // Returned for user verification
        });
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const resetPasswordWithCode = async (req, res) => {
    const { email, resetCode, newPassword } = req.body;
    if (!email || !resetCode || !newPassword) {
        return res.status(400).json({ message: "Please provide email, reset code, and new password" });
    }

    try {
        const record = resetCodes.get(email.toLowerCase());
        if (!record || record.code !== resetCode || Date.now() > record.expires) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid or expired reset code" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        resetCodes.delete(email.toLowerCase());

        res.status(httpStatus.OK).json({ message: "Password reset successful. You can now sign in." });
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

// Item 11: DB-Persisted Scheduled Meetings
const createScheduledMeeting = async (req, res) => {
    const { token, title, meeting_code, scheduled_date, scheduled_time, duration, time_zone, description } = req.body;
    if (!title || !meeting_code || !scheduled_date) {
        return res.status(400).json({ message: "Title, meeting code, and date are required" });
    }

    try {
        const secret = process.env.JWT_SECRET || "novacall_enterprise_jwt_secret";
        const decoded = verifyJWT(token, secret);
        
        let user;
        if (decoded && decoded.username) {
            user = await User.findOne({ username: decoded.username });
        } else {
            user = await User.findOne({ token: token });
        }

        const userId = user ? user.username : "guest";

        const newSchedule = new ScheduledMeeting({
            user_id: userId,
            title,
            meeting_code,
            scheduled_date: new Date(scheduled_date),
            scheduled_time: scheduled_time || "10:00 AM",
            duration: duration || "30 mins",
            time_zone: time_zone || "(GMT+05:30) India Standard Time",
            description: description || ""
        });

        await newSchedule.save();
        res.status(httpStatus.CREATED).json({ message: "Meeting scheduled successfully", meeting: newSchedule });
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const getUpcomingMeetings = async (req, res) => {
    const { token } = req.query;
    try {
        const secret = process.env.JWT_SECRET || "novacall_enterprise_jwt_secret";
        const decoded = verifyJWT(token, secret);
        
        let user;
        if (decoded && decoded.username) {
            user = await User.findOne({ username: decoded.username });
        } else {
            user = await User.findOne({ token: token });
        }

        const userId = user ? user.username : "guest";
        const meetings = await ScheduledMeeting.find({ user_id: userId }).sort({ scheduled_date: 1 });
        res.json(meetings);
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const deleteScheduledMeeting = async (req, res) => {
    const { id } = req.params;
    try {
        await ScheduledMeeting.findByIdAndDelete(id);
        res.json({ message: "Scheduled meeting cancelled successfully" });
    } catch (e) {
        res.status(500).json({ message: `Something went wrong: ${e.message}` });
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