import httpStatus from "http-status";
import { User } from "../models/UserModel.js";
import { verifyJWT } from "../utils/jwt.js";
import { ERROR_CODES, formatErrorResponse } from "../utils/errorCodes.js";

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(httpStatus.UNAUTHORIZED).json(
                formatErrorResponse(
                    "Access denied. Bearer authentication token required in Authorization header.",
                    ERROR_CODES.AUTH_TOKEN_REQUIRED,
                    req.id
                )
            );
        }

        const token = authHeader.substring(7);
        const decoded = verifyJWT(token);

        if (!decoded) {
            return res.status(httpStatus.UNAUTHORIZED).json(
                formatErrorResponse(
                    "Invalid or expired session. Please log in again.",
                    ERROR_CODES.AUTH_TOKEN_INVALID,
                    req.id
                )
            );
        }

        const user = await User.findById(decoded.id || decoded._id).select("-password");

        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json(
                formatErrorResponse(
                    "User account not found or has been removed.",
                    ERROR_CODES.AUTH_USER_NOT_FOUND,
                    req.id
                )
            );
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(httpStatus.UNAUTHORIZED).json(
            formatErrorResponse(
                "Authentication verification failed.",
                ERROR_CODES.UNAUTHORIZED,
                req.id
            )
        );
    }
};

