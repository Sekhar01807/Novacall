import httpStatus from "http-status";
import { User } from "../models/UserModel.js";
import { verifyJWT } from "../utils/jwt.js";

export const authMiddleware = async (req, res, next) => {
    try {
        let token;
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else if (req.query && req.query.token) {
            token = req.query.token;
        } else if (req.body && req.body.token) {
            token = req.body.token;
        }

        if (!token) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Access denied. Authentication token required.",
                code: "TOKEN_REQUIRED"
            });
        }

        const decoded = verifyJWT(token);

        if (!decoded) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Invalid or expired session. Please log in again.",
                code: "TOKEN_INVALID"
            });
        }

        let user;
        if (decoded.id) {
            user = await User.findById(decoded.id).select("-password");
        } else if (decoded.username) {
            user = await User.findOne({ username: decoded.username }).select("-password");
        } else {
            user = await User.findOne({ token: token }).select("-password");
        }

        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "User account no longer exists.",
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
