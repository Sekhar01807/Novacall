export const DEFAULT_ALLOWED_ORIGINS = [
    "https://novacall-two.vercel.app",
    "https://novacall-backend.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000"
];

/**
 * Returns the authoritative list of allowed origins.
 * Explicitly trusted production frontend origins or local development origins.
 * Wildcard .vercel.app origins are strictly disallowed.
 * 
 * @returns {string[]}
 */
export const getAllowedOrigins = () => {
    const custom = process.env.FRONTEND_URL;
    if (custom) {
        return custom.includes(",")
            ? custom.split(",").map(o => o.trim()).filter(Boolean)
            : [custom.trim()];
    }
    return DEFAULT_ALLOWED_ORIGINS;
};

/**
 * Validates whether an incoming HTTP Origin or Referer header is authorized.
 * 
 * @param {string} origin - Origin string (e.g., 'https://novacall-two.vercel.app')
 * @returns {boolean}
 */
export const isOriginAllowed = (origin) => {
    if (!origin) return false;
    const allowed = getAllowedOrigins();
    
    // In development mode, allow localhost / 127.0.0.1 origins
    if (process.env.NODE_ENV !== "production") {
        if (allowed.includes("*") || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
            return true;
        }
    }

    return allowed.includes(origin);
};
