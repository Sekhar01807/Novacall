const formatTime = () => new Date().toISOString();

const SENSITIVE_KEYWORDS = [
    "password",
    "token",
    "secret",
    "credential",
    "authorization",
    "apikey",
    "api_key",
    "jwt",
    "cookie",
    "bearer"
];

export const isSensitiveKey = (key) => {
    if (typeof key !== "string") return false;
    const normalized = key.toLowerCase();
    return SENSITIVE_KEYWORDS.some(sensitive => normalized.includes(sensitive));
};

export const sanitize = (data) => {
    if (!data || typeof data !== "object") return data;
    const clean = Array.isArray(data) ? [...data] : { ...data };
    for (const key of Object.keys(clean)) {
        if (isSensitiveKey(key)) {
            clean[key] = "***REDACTED***";
        } else if (typeof clean[key] === "object" && clean[key] !== null) {
            clean[key] = sanitize(clean[key]);
        }
    }
    return clean;
};

export const logger = {
    info: (message, meta = null) => {
        if (meta) {
            console.log(`[${formatTime()}] [INFO]: ${message}`, JSON.stringify(sanitize(meta)));
        } else {
            console.log(`[${formatTime()}] [INFO]: ${message}`);
        }
    },
    warn: (message, meta = null) => {
        if (meta) {
            console.warn(`[${formatTime()}] [WARN]: ${message}`, JSON.stringify(sanitize(meta)));
        } else {
            console.warn(`[${formatTime()}] [WARN]: ${message}`);
        }
    },
    error: (message, error = null) => {
        if (error && error.stack) {
            console.error(`[${formatTime()}] [ERROR]: ${message}\n${error.stack}`);
        } else if (error) {
            console.error(`[${formatTime()}] [ERROR]: ${message}`, JSON.stringify(sanitize(error)));
        } else {
            console.error(`[${formatTime()}] [ERROR]: ${message}`);
        }
    }
};
