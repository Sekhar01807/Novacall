import crypto from "crypto";

const base64UrlEncode = (str) => {
    return Buffer.from(str)
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
};

const base64UrlDecode = (str) => {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
        base64 += "=";
    }
    return Buffer.from(base64, "base64").toString("utf8");
};

/**
 * Sign a JWT token with HMAC-SHA256
 * @param {Object} payload - Data to embed in the token
 * @param {string} secret - Secret key for signing
 * @param {number} expiresInSeconds - Token validity in seconds (default: 7 days)
 * @returns {string} - Complete JWT token (header.payload.signature)
 */
export const signJWT = (payload, secret = process.env.JWT_SECRET || "novacall_secure_jwt_secret", expiresInSeconds = 7 * 24 * 60 * 60) => {
    const header = {
        alg: "HS256",
        typ: "JWT"
    };

    const now = Math.floor(Date.now() / 1000);
    const enrichedPayload = {
        ...payload,
        iat: now,
        exp: now + expiresInSeconds
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(enrichedPayload));

    const signature = crypto
        .createHmac("sha256", secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");

    return `${encodedHeader}.${encodedPayload}.${signature}`;
};

/**
 * Verify and decode a JWT token
 * @param {string} token - The JWT string
 * @param {string} secret - Secret key used for signing
 * @returns {Object|null} - Decoded payload if valid, null otherwise
 */
export const verifyJWT = (token, secret = process.env.JWT_SECRET || "novacall_secure_jwt_secret") => {
    try {
        if (!token || typeof token !== "string") return null;

        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const [encodedHeader, encodedPayload, signature] = parts;

        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(`${encodedHeader}.${encodedPayload}`)
            .digest("base64")
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");

        // Constant-time signature comparison to prevent timing attacks
        const sigBuffer = Buffer.from(signature);
        const expBuffer = Buffer.from(expectedSignature);
        if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
            return null;
        }

        const payload = JSON.parse(base64UrlDecode(encodedPayload));

        // Expiration check
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            return null; // Expired token
        }

        return payload;
    } catch (error) {
        return null;
    }
};
