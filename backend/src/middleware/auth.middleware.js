import httpStatus from "http-status";
import { User } from "../models/UserModel.js";

// Base64URL decoder helper for JWT verification
const base64UrlDecode = (str) => {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf8');
};

const verifyJWT = (token, secret) => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payloadStr = base64UrlDecode(parts[1]);
        const payload = JSON.parse(payloadStr);

        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null; // Expired
        }

        return payload;
    } catch (e) {
        return null;
    }
};

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
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Access denied. Authentication token required." });
        }

        const secret = process.env.JWT_SECRET || "novacall_enterprise_jwt_secret";
        const decoded = verifyJWT(token, secret);

        if (!decoded) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid or expired token. Please log in again." });
        }

        let user;
        if (decoded.username) {
            user = await User.findOne({ username: decoded.username }).select("-password");
        } else {
            user = await User.findOne({ token: token }).select("-password");
        }

        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "User account not found." });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Authentication failed." });
    }
};
