const formatTime = () => new Date().toISOString();

const sanitize = (data) => {
    if (!data) return data;
    if (typeof data !== "object") return data;
    const clean = Array.isArray(data) ? [...data] : { ...data };
    const sensitiveKeys = ["password", "token", "newPassword", "oldPassword", "currentPassword", "secret"];
    for (const key of Object.keys(clean)) {
        if (sensitiveKeys.includes(key.toLowerCase())) {
            clean[key] = "***REDACTED***";
        } else if (typeof clean[key] === "object") {
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
