import jwt from "jsonwebtoken";

const WEAK_SECRETS = new Set([
    "secret",
    "jwt_secret",
    "password",
    "123456",
    "12345678",
    "novacall_dev_only_jwt_secret_do_not_use_in_production"
]);

/**
 * Validate JWT Secret strength on server startup
 * Refuses execution in production if the secret is absent, insecure, or shorter than 32 characters.
 */
export const validateJwtSecretAtStartup = () => {
    const secret = process.env.JWT_SECRET;
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
        if (!secret) {
            throw new Error("FATAL: JWT_SECRET environment variable is required in production mode.");
        }
        if (secret.length < 32) {
            throw new Error("FATAL: JWT_SECRET must be at least 32 characters long in production mode.");
        }
        if (WEAK_SECRETS.has(secret.toLowerCase())) {
            throw new Error("FATAL: JWT_SECRET cannot be a known weak or placeholder default secret.");
        }
    }
    return true;
};

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
 * @param {string|number} [expiresIn='24h'] - Expiration window (default 24 hours)
 * @returns {string} - Signed JWT token
 */
export const signJWT = (payload, secret = getJwtSecret(), expiresIn = "24h") => {
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
