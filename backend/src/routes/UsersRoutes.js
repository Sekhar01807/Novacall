import { Router } from "express";
import { loginUser, registerUser, addToHistory, getUserHistory, getUserProfile, updateUserProfile, changePassword, signOutAllDevices, deleteAccount } from "../controllers/user.controller.js";

const router = Router();

router.route("/login").post(loginUser);
router.route("/register").post(registerUser);
router.route("/add_to_activity").post(addToHistory);
router.route("/get_all_activity").get(getUserHistory);
router.route("/get_profile").get(getUserProfile);
router.route("/update_profile").post(updateUserProfile);
router.route("/change_password").post(changePassword);
router.route("/signout_all").post(signOutAllDevices);
router.route("/delete_account").post(deleteAccount);

export default router;