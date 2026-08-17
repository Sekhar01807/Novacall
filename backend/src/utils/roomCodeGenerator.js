import crypto from "node:crypto";

/**
 * Generate a cryptographically secure, high-entropy meeting room code.
 * Format: "nov-xxxx-xxxx" where x is lowercase alphanumeric, providing high collision resistance.
 * @param {string} [prefix="nov"] - Optional custom prefix
 * @returns {string} - High-entropy room code
 */
export const generateSecureRoomCode = (prefix = "nov") => {
    // Generate 6 random bytes (48 bits of entropy)
    const randomBuffer = crypto.randomBytes(6);
    // Base30 string without ambiguous characters
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let part1 = "";
    let part2 = "";

    for (let i = 0; i < 4; i++) {
        part1 += chars[randomBuffer[i] % chars.length];
        part2 += chars[randomBuffer[i + 2] % chars.length];
    }

    return `${prefix}-${part1}-${part2}`;
};

/**
 * Validate format of a room code
 * Accepts 3-64 alphanumeric characters, dashes, and underscores.
 * @param {string} code
 * @returns {boolean}
 */
export const isValidRoomCodeFormat = (code) => {
    if (!code || typeof code !== "string") return false;
    const trimmed = code.trim();
    return /^[a-zA-Z0-9_-]{3,64}$/.test(trimmed);
};
