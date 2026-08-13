import jwt from "jsonwebtoken";

const DEFAULT_SECRET = process.env.JWT_SECRET || "novacall_secure_jwt_secret";

/**
 * Sign a standard JWT token
 * @param {Object} payload - User data to embed in the token
 * @param {string} secret - Secret key for signing
 * @param {string|number} expiresIn - Expiration window (e.g. '7d')
 * @returns {string} - Signed JWT token
 */
export const signJWT = (payload, secret = DEFAULT_SECRET, expiresIn = "7d") => {
    return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - The JWT string
 * @param {string} secret - Secret key used for signing
 * @returns {Object|null} - Decoded payload if valid, null otherwise
 */
export const verifyJWT = (token, secret = DEFAULT_SECRET) => {
    try {
        if (!token || typeof token !== "string") return null;
        return jwt.verify(token, secret);
    } catch (error) {
        return null;
    }
};
