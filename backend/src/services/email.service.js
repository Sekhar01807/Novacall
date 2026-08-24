import nodemailer from "nodemailer";
import { logger } from "../utils/logger.js";

/**
 * Creates and returns a Nodemailer transporter based on environment configuration.
 */
const createTransporter = () => {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const rawPass = process.env.SMTP_PASS;
    const pass = rawPass ? rawPass.replace(/\s+/g, "") : rawPass;
    const service = process.env.SMTP_SERVICE; // e.g. "gmail"

    if (!user || !pass) {
        return null;
    }

    if (service) {
        return nodemailer.createTransport({
            service,
            auth: { user, pass }
        });
    }

    return nodemailer.createTransport({
        host: host || "smtp.gmail.com",
        port: port,
        secure: port === 465 || process.env.SMTP_SECURE === "true",
        auth: { user, pass }
    });
};

/**
 * Resolves the primary frontend URL for links in emails.
 */
const getFrontendUrl = () => {
    if (process.env.FRONTEND_URL) {
        const urls = process.env.FRONTEND_URL.split(",").map((u) => u.trim());
        const prod = urls.find((u) => u.startsWith("https://")) || urls[0];
        return prod.replace(/\/$/, "");
    }
    return "https://novacall-two.vercel.app";
};

/**
 * Checks whether active SMTP email dispatch credentials are configured.
 */
export const isEmailConfigured = () => {
    return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
};

/**
 * Base Email Wrapper with Modern, High-End Card Styling.
 * Bulletproof inline styling designed for cross-client compatibility (Gmail, Outlook, Apple Mail).
 */
const renderEmailCard = ({
    title,
    badgeText,
    badgeColor = "#2563eb",
    contentHtml,
    footerNote
}) => {
    const frontendUrl = getFrontendUrl();

    return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style type="text/css">
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        body { margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        @media only screen and (max-width: 600px) {
            .container-table { width: 100% !important; }
            .content-cell { padding: 24px 20px !important; }
            .header-cell { padding: 24px 20px !important; }
            .code-display { font-size: 28px !important; letter-spacing: 6px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 32px 12px; background-color: #f1f5f9;">
    <!-- Outer Table -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center">
                <!-- Main Container Card -->
                <table class="container-table" border="0" cellpadding="0" cellspacing="0" width="580" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);">
                    
                    <!-- Gradient Accent Bar -->
                    <tr>
                        <td height="4" style="background: linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #ec4899 100%); font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>

                    <!-- Header Section -->
                    <tr>
                        <td class="header-cell" align="center" style="background-color: #090d16; padding: 32px 36px 28px; text-align: center;">
                            <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <!-- Brand Logo Icon & Text -->
                                        <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-decoration: none;">
                                            Nova<span style="color: #38bdf8;">Call</span>
                                        </div>
                                        <div style="font-size: 12px; color: #94a3b8; margin-top: 4px; letter-spacing: 0.2px; font-weight: 500;">
                                            Real-Time Multi-Party Conferencing & Signaling
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Card Body Content -->
                    <tr>
                        <td class="content-cell" style="padding: 36px 40px 32px; background-color: #ffffff;">
                            ${badgeText ? `
                            <div style="margin-bottom: 20px;">
                                <span style="display: inline-block; background-color: ${badgeColor}15; color: ${badgeColor}; border: 1px solid ${badgeColor}35; padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">
                                    &bull; ${badgeText}
                                </span>
                            </div>
                            ` : ""}

                            ${contentHtml}
                        </td>
                    </tr>

                    <!-- Footer Section -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 24px 36px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                                ${footerNote || "This is an automated system notification from your NovaCall platform."}
                            </p>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="font-size: 12px; color: #94a3b8;">
                                        <a href="${frontendUrl}" style="color: #2563eb; text-decoration: none; font-weight: 600;">Launch Web App</a>
                                        &nbsp;&bull;&nbsp;
                                        <a href="${frontendUrl}/api/docs" style="color: #64748b; text-decoration: none;">API Documentation</a>
                                        &nbsp;&bull;&nbsp;
                                        <a href="https://github.com/Sekhar01807/Novacall" style="color: #64748b; text-decoration: none;">GitHub</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
                <!-- End Main Container Card -->
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * 1. Password Reset Email Dispatch (Upgraded Card)
 */
export const sendPasswordResetEmail = async ({ toEmail, username = "User", resetCode, requestId = "" }) => {
    const transporter = createTransporter();
    const fromAddress = process.env.EMAIL_FROM || `"NovaCall Security" <${process.env.SMTP_USER || "no-reply@novacall.io"}>`;

    if (!transporter) {
        const isProduction = process.env.NODE_ENV === "production";
        if (isProduction) {
            logger.error(
                "SMTP configuration missing in production. Cannot dispatch password reset email. Set SMTP_USER and SMTP_PASS.",
                { requestId, toEmail }
            );
        } else {
            logger.info(
                `[DEV EMAIL DISPATCH] Password reset code for ${toEmail}: [${resetCode}] (Valid for 15 minutes)`,
                { requestId }
            );
        }
        return { success: !isProduction, mode: isProduction ? "unconfigured" : "mock" };
    }

    const contentHtml = `
        <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; letter-spacing: -0.4px;">
            Password Reset Request
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
            Hello <strong style="color: #0f172a;">${username}</strong>, we received a request to reset the password for your NovaCall account. Use the one-time verification code below to authorize your password change:
        </p>

        <!-- Upgraded Code Card Box -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f0f9ff; border: 2px dashed #0ea5e9; border-radius: 14px; margin: 24px 0;">
            <tr>
                <td align="center" style="padding: 24px 16px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0284c7; letter-spacing: 1px; margin-bottom: 8px;">
                        One-Time Verification Code
                    </div>
                    <div class="code-display" style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #0369a1; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; padding-left: 10px;">
                        ${resetCode}
                    </div>
                    <div style="margin-top: 12px;">
                        <span style="display: inline-block; background-color: #e0f2fe; color: #0284c7; font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 12px;">
                            ⏱ Expires in 15 minutes &bull; Single-use only
                        </span>
                    </div>
                </td>
            </tr>
        </table>

        <!-- Security Advisory Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; margin: 20px 0 10px;">
            <tr>
                <td style="padding: 14px 18px; font-size: 13px; line-height: 1.5; color: #92400e;">
                    <strong>Security Notice:</strong> If you did not request this password reset, your credentials remain secure. Please disregard this email or update your password if you suspect unauthorized activity.
                </td>
            </tr>
        </table>
    `;

    const textContent = `
NovaCall — Password Reset Verification

Hello ${username},

We received a request to reset your password. Use the following 6-digit code to complete the verification:

Verification Code: ${resetCode}
(This code expires in 15 minutes and can only be used once.)

If you did not request this reset, please ignore this email.

NovaCall Security Team
    `.trim();

    try {
        const info = await transporter.sendMail({
            from: fromAddress,
            to: toEmail,
            subject: "NovaCall — Password Reset Verification Code",
            text: textContent,
            html: renderEmailCard({
                title: "NovaCall — Password Reset",
                badgeText: "Security Verification",
                badgeColor: "#0284c7",
                contentHtml
            })
        });

        logger.info(`Password reset email successfully dispatched to ${toEmail} (Message ID: ${info.messageId})`, {
            requestId,
            messageId: info.messageId
        });

        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error(`Failed to send password reset email to ${toEmail}: ${error.message}`, {
            requestId,
            error: error.message
        });
        return { success: false, error: error.message };
    }
};

/**
 * 2. Welcome Email Dispatch for New Users (Upgraded Card)
 */
export const sendWelcomeEmail = async ({ toEmail, name = "User", username, requestId = "" }) => {
    const transporter = createTransporter();
    const fromAddress = process.env.EMAIL_FROM || `"NovaCall Team" <${process.env.SMTP_USER || "welcome@novacall.io"}>`;
    const frontendUrl = getFrontendUrl();

    if (!transporter) {
        logger.info(`[DEV EMAIL DISPATCH] Welcome email for ${toEmail} (${username})`, { requestId });
        return { success: true, mode: "mock" };
    }

    const displayName = name || username || "there";

    const contentHtml = `
        <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; letter-spacing: -0.4px;">
            Welcome to NovaCall, ${displayName}!
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
            Your account <strong style="color: #0f172a;">@${username}</strong> is now active. NovaCall gives you enterprise-grade, browser-based video conferencing with zero plugins, low-latency signaling, and authoritative moderation tools.
        </p>

        <!-- Upgraded Feature Highlights Grid -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin: 20px 0;">
            <tr>
                <td style="padding: 20px 24px;">
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                        Platform Capabilities at a Glance:
                    </div>
                    
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td style="padding: 8px 0; font-size: 13px; color: #334155; line-height: 1.5; border-bottom: 1px solid #e2e8f0;">
                                <strong style="color: #2563eb;">🎥 Custom WebRTC Mesh</strong> &bull; Ultra-low latency multi-party audio, HD video, and screen sharing.
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-size: 13px; color: #334155; line-height: 1.5; border-bottom: 1px solid #e2e8f0;">
                                <strong style="color: #7c3aed;">👥 Host Moderation</strong> &bull; Remote participant muting, kick permissions, and room termination.
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-size: 13px; color: #334155; line-height: 1.5; border-bottom: 1px solid #e2e8f0;">
                                <strong style="color: #059669;">📅 Calendar Scheduling</strong> &bull; Schedule upcoming conferences with automatic timezone alignment.
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-size: 13px; color: #334155; line-height: 1.5;">
                                <strong style="color: #d97706;">💬 Secure Real-Time Chat</strong> &bull; In-meeting chat with dual-layer XSS protection & anti-flood filters.
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Main Action CTA Button -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 16px;">
            <tr>
                <td align="center">
                    <a href="${frontendUrl}/home" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 50px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.35); text-align: center;">
                        Launch NovaCall Dashboard &rarr;
                    </a>
                </td>
            </tr>
        </table>
    `;

    const textContent = `
Welcome to NovaCall, ${displayName}!

Your account @${username} is active.

Launch Dashboard: ${frontendUrl}/home

Key Features:
- Custom Full-Mesh WebRTC Conferencing
- Host Moderation & Stage Management
- Meeting Scheduling & History Tracking
- Protected In-Meeting Chat

Enjoy connecting with NovaCall!
    `.trim();

    try {
        const info = await transporter.sendMail({
            from: fromAddress,
            to: toEmail,
            subject: `Welcome to NovaCall, ${displayName}!`,
            text: textContent,
            html: renderEmailCard({
                title: "Welcome to NovaCall",
                badgeText: "Account Activated",
                badgeColor: "#059669",
                contentHtml
            })
        });

        logger.info(`Welcome email dispatched to ${toEmail} (Message ID: ${info.messageId})`, {
            requestId,
            messageId: info.messageId
        });

        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error(`Failed to send welcome email to ${toEmail}: ${error.message}`, {
            requestId,
            error: error.message
        });
        return { success: false, error: error.message };
    }
};

/**
 * 3. Scheduled Meeting Confirmation & Invitee Dispatch (Upgraded Card)
 */
export const sendMeetingScheduleEmail = async ({
    toEmail,
    hostName = "Host",
    title,
    meetingCode,
    scheduledDate,
    scheduledTime,
    duration = 30,
    timeZone = "UTC",
    description = "",
    invitees = [],
    isHostConfirmation = true,
    requestId = ""
}) => {
    const transporter = createTransporter();
    const fromAddress = process.env.EMAIL_FROM || `"NovaCall Meetings" <${process.env.SMTP_USER || "meetings@novacall.io"}>`;
    const frontendUrl = getFrontendUrl();
    const joinUrl = `${frontendUrl}/videoMeet/${meetingCode}`;

    // Format human-readable date
    let formattedDate = scheduledDate;
    let dayNum = "24";
    let monthShort = "AUG";

    try {
        if (scheduledDate) {
            const d = new Date(scheduledDate);
            if (!isNaN(d.getTime())) {
                formattedDate = d.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                });
                dayNum = d.getDate().toString();
                monthShort = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
            }
        }
    } catch {
        formattedDate = String(scheduledDate);
    }

    if (!transporter) {
        logger.info(`[DEV EMAIL DISPATCH] Scheduled meeting email for ${toEmail}: "${title}" [Code: ${meetingCode}]`, {
            requestId,
            date: formattedDate,
            time: scheduledTime
        });
        return { success: true, mode: "mock" };
    }

    const badgeText = isHostConfirmation ? "Meeting Confirmed" : "Meeting Invitation";
    const badgeColor = isHostConfirmation ? "#2563eb" : "#7c3aed";
    const heading = isHostConfirmation
        ? `Meeting Scheduled: "${title}"`
        : `Invitation: "${title}"`;

    const contentHtml = `
        <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 10px 0; letter-spacing: -0.4px;">
            ${heading}
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
            ${isHostConfirmation 
                ? `Your video conference has been scheduled on NovaCall. Meeting details and the direct access link are provided below:` 
                : `<strong style="color: #0f172a;">${hostName}</strong> has scheduled a video meeting on NovaCall and invited you to join:`}
        </p>

        <!-- Upgraded Meeting Calendar Card Table -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin: 20px 0;">
            <tr>
                <td style="padding: 24px;">
                    <!-- Calendar Header Block -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px;">
                        <tr>
                            <!-- Calendar Date Tile -->
                            <td width="64" valign="top">
                                <div style="width: 54px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                                    <div style="background: #2563eb; color: #ffffff; font-size: 10px; font-weight: 700; padding: 3px 0; text-transform: uppercase;">
                                        ${monthShort}
                                    </div>
                                    <div style="font-size: 22px; font-weight: 800; color: #0f172a; padding: 4px 0 6px;">
                                        ${dayNum}
                                    </div>
                                </div>
                            </td>
                            <!-- Meeting Title & Host -->
                            <td valign="middle" style="padding-left: 14px;">
                                <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
                                    ${title}
                                </div>
                                <div style="font-size: 13px; color: #64748b;">
                                    Organized by <strong style="color: #334155;">${hostName}</strong>
                                </div>
                            </td>
                        </tr>
                    </table>

                    <!-- Details Grid -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 500;">📅 Date:</td>
                            <td align="right" style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">${formattedDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 500;">⏰ Time:</td>
                            <td align="right" style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">${scheduledTime} (${timeZone})</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 500;">⏳ Duration:</td>
                            <td align="right" style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">${duration} minutes</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0 4px; font-size: 13px; color: #64748b; font-weight: 500;">🔑 Room Code:</td>
                            <td align="right" style="padding: 8px 0 4px;">
                                <span style="background: #eff6ff; color: #1d4ed8; font-family: monospace; font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 6px; border: 1px solid #bfdbfe;">
                                    ${meetingCode}
                                </span>
                            </td>
                        </tr>
                        ${description ? `
                        <tr>
                            <td colspan="2" style="padding-top: 12px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #475569;">
                                <strong style="color: #0f172a;">Agenda:</strong> ${description}
                            </td>
                        </tr>
                        ` : ""}
                    </table>
                </td>
            </tr>
        </table>

        <!-- Direct Join CTA Button -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 16px;">
            <tr>
                <td align="center">
                    <a href="${joinUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 15px 36px; border-radius: 50px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.35); text-align: center;">
                        Join Video Meeting Now &rarr;
                    </a>
                </td>
            </tr>
        </table>

        <!-- Direct Link Backup Box -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; text-align: center; margin-top: 12px;">
            <span style="font-size: 11px; color: #64748b;">Direct Access Link: </span>
            <a href="${joinUrl}" style="font-size: 11px; color: #2563eb; text-decoration: underline; word-break: break-all;">
                ${joinUrl}
            </a>
        </div>
    `;

    const textContent = `
NovaCall — Scheduled Meeting ${isHostConfirmation ? "Confirmation" : "Invitation"}

Meeting: ${title}
Host: ${hostName}
Date: ${formattedDate}
Time: ${scheduledTime} (${timeZone})
Duration: ${duration} minutes
Room Code: ${meetingCode}
${description ? `Agenda: ${description}\n` : ""}
Direct Join: ${joinUrl}
    `.trim();

    // Prepare recipients list: user + any additional invitees
    const recipientList = new Set();
    if (toEmail) recipientList.add(toEmail.trim());

    if (Array.isArray(invitees)) {
        invitees.forEach((inv) => {
            if (typeof inv === "string" && inv.includes("@")) recipientList.add(inv.trim());
        });
    } else if (typeof invitees === "string" && invitees.includes("@")) {
        invitees.split(",").forEach((inv) => {
            if (inv.includes("@")) recipientList.add(inv.trim());
        });
    }

    try {
        const sendPromises = Array.from(recipientList).map((recipient) =>
            transporter.sendMail({
                from: fromAddress,
                to: recipient,
                subject: `${isHostConfirmation && recipient === toEmail ? "Meeting Confirmed" : "Meeting Invitation"}: ${title}`,
                text: textContent,
                html: renderEmailCard({
                    title: `NovaCall Meeting: ${title}`,
                    badgeText,
                    badgeColor,
                    contentHtml
                })
            })
        );

        const results = await Promise.allSettled(sendPromises);
        const successful = results.filter((r) => r.status === "fulfilled").length;

        logger.info(`Scheduled meeting emails dispatched: ${successful}/${recipientList.size} recipients for "${title}"`, {
            requestId,
            meetingCode
        });

        return { success: true, count: successful };
    } catch (error) {
        logger.error(`Failed to send scheduled meeting emails for ${meetingCode}: ${error.message}`, {
            requestId,
            error: error.message
        });
        return { success: false, error: error.message };
    }
};
