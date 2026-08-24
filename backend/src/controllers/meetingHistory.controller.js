import httpStatus from "http-status";
import { Meeting } from "../models/meetingModel.js";
import { ScheduledMeeting } from "../models/scheduledMeetingModel.js";
import { ERROR_CODES, formatErrorResponse, formatSuccessResponse } from "../utils/errorCodes.js";
import { logger } from "../utils/logger.js";
import { generateSecureRoomCode } from "../utils/roomCodeGenerator.js";
import { normalizeRoomCode } from "../sockets/roomState.js";
import { validateScheduledMeeting, validateMeetingCode } from "../utils/validators.js";
import { sendMeetingScheduleEmail } from "../services/email.service.js";

/**
 * Get User Meeting History with Pagination & Search Support
 */
export const getUserHistory = async (req, res) => {
    try {
        const user = req.user;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const search = req.query.search ? String(req.query.search).trim() : "";

        const query = { user_id: user.username };
        if (search) {
            query.meeting_code = { $regex: search, $options: "i" };
        }

        const total = await Meeting.countDocuments(query);
        const meetings = await Meeting.find(query)
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const totalPages = Math.ceil(total / limit) || 1;

        return res.status(httpStatus.OK).json({
            success: true,
            meetings: meetings,
            data: meetings,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            requestId: req.id
        });
    } catch (e) {
        logger.error("Get user history error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(e.message, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

export const addToHistory = async (req, res) => {
    const validation = validateMeetingCode(req.body);
    if (!validation.isValid) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse(validation.message, ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }

    const { meeting_code } = validation.data;

    try {
        const user = req.user;
        const newMeeting = new Meeting({
            user_id: user.username,
            meeting_code
        });

        await newMeeting.save();
        res.status(httpStatus.CREATED).json(
            formatSuccessResponse(newMeeting, "Added code to history", req.id)
        );
    } catch (e) {
        logger.error("Add to history error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(e.message, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

export const createScheduledMeeting = async (req, res) => {
    const validation = validateScheduledMeeting(req.body);
    if (!validation.isValid) {
        return res.status(httpStatus.BAD_REQUEST).json(
            formatErrorResponse(validation.message, ERROR_CODES.VALIDATION_ERROR, req.id)
        );
    }

    const {
        title,
        scheduled_date,
        scheduled_time,
        duration,
        time_zone,
        description
    } = validation.data;

    // Room code: normalize or generate secure room code
    let meeting_code = req.body.meeting_code ? normalizeRoomCode(req.body.meeting_code) : "";
    if (!meeting_code) {
        meeting_code = generateSecureRoomCode();
    }

    try {
        const user = req.user;
        const newMeeting = new ScheduledMeeting({
            user_id: user.username,
            title,
            scheduled_date,
            scheduled_time,
            duration,
            time_zone,
            description,
            meeting_code
        });

        await newMeeting.save();

        // Asynchronously dispatch styled confirmation email to host (and invitees if provided)
        sendMeetingScheduleEmail({
            toEmail: user.email,
            hostName: user.name || user.username || "Host",
            title: newMeeting.title,
            meetingCode: newMeeting.meeting_code,
            scheduledDate: newMeeting.scheduled_date,
            scheduledTime: newMeeting.scheduled_time,
            duration: newMeeting.duration,
            timeZone: newMeeting.time_zone,
            description: newMeeting.description,
            invitees: req.body.invitees,
            isHostConfirmation: true,
            requestId: req.id
        }).catch((err) => {
            logger.warn("Scheduled meeting email async dispatch warning:", { error: err.message, requestId: req.id });
        });

        res.status(httpStatus.CREATED).json({
            success: true,
            message: "Meeting scheduled successfully",
            meeting: newMeeting,
            requestId: req.id
        });
    } catch (e) {
        logger.error("Create scheduled meeting error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(e.message, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

export const getUpcomingMeetings = async (req, res) => {
    try {
        const user = req.user;
        const meetings = await ScheduledMeeting.find({ user_id: user.username }).sort({ scheduled_date: 1, scheduled_time: 1 });
        res.status(httpStatus.OK).json({
            success: true,
            meetings: meetings,
            data: meetings,
            requestId: req.id
        });
    } catch (e) {
        logger.error("Get upcoming meetings error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(e.message, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};

export const deleteScheduledMeeting = async (req, res) => {
    const { id } = req.params;
    try {
        const user = req.user;
        // Atomic ownership query: Enforce meeting ownership at the database query level
        const deleted = await ScheduledMeeting.findOneAndDelete({ _id: id, user_id: user.username });

        if (!deleted) {
            // Check if meeting exists under another user to distinguish 403 Forbidden vs 404 Not Found
            const existsUnderOtherUser = await ScheduledMeeting.findById(id);
            if (existsUnderOtherUser) {
                return res.status(httpStatus.FORBIDDEN).json(
                    formatErrorResponse("You are not authorized to delete this meeting", ERROR_CODES.FORBIDDEN, req.id)
                );
            }
            return res.status(httpStatus.NOT_FOUND).json(
                formatErrorResponse("Scheduled meeting not found", ERROR_CODES.NOT_FOUND, req.id)
            );
        }

        res.status(httpStatus.OK).json(
            formatSuccessResponse(null, "Scheduled meeting cancelled successfully", req.id)
        );
    } catch (e) {
        logger.error("Delete scheduled meeting error", { error: e.message, requestId: req.id });
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json(
            formatErrorResponse(e.message, ERROR_CODES.INTERNAL_SERVER_ERROR, req.id)
        );
    }
};
