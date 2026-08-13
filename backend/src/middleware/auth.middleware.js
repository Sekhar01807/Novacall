import httpStatus from "http-status";
import { User } from "../models/UserModel.js";
import { verifyJWT } from "../utils/jwt.js";

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Access denied. Bearer authentication token required in Authorization header.",
                code: "TOKEN_REQUIRED"
            });
        }

        const token = authHeader.substring(7);
        const decoded = verifyJWT(token);

        if (!decoded) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Invalid or expired session. Please log in again.",
                code: "TOKEN_INVALID"
            });
        }

        const user = await User.findById(decoded.id || decoded._id).select("-password");

        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "User account not found or has been removed.",
                code: "USER_NOT_FOUND"
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(httpStatus.UNAUTHORIZED).json({
            success: false,
            message: "Authentication verification failed.",
            code: "AUTH_ERROR"
        });
    }
};

