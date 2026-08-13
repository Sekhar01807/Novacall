import jwt from "jsonwebtoken";

export const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("FATAL: JWT_SECRET environment variable is missing in production environment.");
        }
        return "novacall_dev_only_jwt_secret_do_not_use_in_production";
    }
    return secret;
};

/**
 * Sign a standard JWT access token
 * @param {Object} payload - User data to embed in the token
 * @param {string} [secret] - Secret key for signing (defaults to environment JWT_SECRET)
 * @param {string|number} [expiresIn='7d'] - Expiration window
 * @returns {string} - Signed JWT token
 */
export const signJWT = (payload, secret = getJwtSecret(), expiresIn = "7d") => {
    const options = {};
    if (expiresIn && !payload.exp) {
        options.expiresIn = expiresIn;
    }
    return jwt.sign(payload, secret, options);
};

/**
 * Verify and decode a JWT token
 * @param {string} token - The JWT string
 * @param {string} [secret] - Secret key used for signing (defaults to environment JWT_SECRET)
 * @returns {Object|null} - Decoded payload if valid, null otherwise
 */
export const verifyJWT = (token, secret = getJwtSecret()) => {
    try {
        if (!token || typeof token !== "string") return null;
        return jwt.verify(token, secret);
    } catch (error) {
        return null;
    }
};
