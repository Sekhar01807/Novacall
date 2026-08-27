import { Router } from "express";
import { 
    loginUser, registerUser, logoutUser, addToHistory, getUserHistory, getUserProfile, 
    updateUserProfile, changePassword, signOutAllDevices, deleteAccount,
    forgotPassword, resetPasswordWithCode, createScheduledMeeting,
    getUpcomingMeetings, deleteScheduledMeeting 
} from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

// Public Auth Routes
router.route("/login").post(loginUser);
router.route("/register").post(registerUser);
router.route("/logout").post(logoutUser);
router.route("/forgot_password").post(forgotPassword);
router.route("/reset_password").post(resetPasswordWithCode);

// Protected User Routes (authMiddleware required)
router.route("/add_to_activity").post(authMiddleware, addToHistory);
router.route("/get_all_activity").get(authMiddleware, getUserHistory);
router.route("/get_profile").get(authMiddleware, getUserProfile);
router.route("/update_profile").post(authMiddleware, updateUserProfile);
router.route("/change_password").post(authMiddleware, changePassword);
router.route("/signout_all").post(authMiddleware, signOutAllDevices);
router.route("/delete_account").post(authMiddleware, deleteAccount);

// Protected Meeting Scheduling Routes
router.route("/create_scheduled_meeting").post(authMiddleware, createScheduledMeeting);
router.route("/get_upcoming_meetings").get(authMiddleware, getUpcomingMeetings);
router.route("/delete_scheduled_meeting/:id").delete(authMiddleware, deleteScheduledMeeting);

export default router;