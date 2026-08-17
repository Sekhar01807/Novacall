import mongoose, { Schema } from "mongoose";

const scheduledMeetingSchema = new Schema({
    user_id: { type: String, required: true, trim: true, maxlength: 50, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    meeting_code: { type: String, required: true, trim: true, maxlength: 64, index: true },
    scheduled_date: { type: Date, required: true },
    scheduled_time: { type: String, default: "10:00 AM", maxlength: 30 },
    duration: { type: String, default: "30 mins", maxlength: 30 },
    time_zone: { type: String, default: "(GMT+05:30) India Standard Time", maxlength: 100 },
    description: { type: String, default: "", maxlength: 500 },
    created_at: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound and single field indexes for optimal upcoming meetings queries
scheduledMeetingSchema.index({ user_id: 1, scheduled_date: 1 });
scheduledMeetingSchema.index({ user_id: 1, created_at: -1 });

const ScheduledMeeting = mongoose.model("ScheduledMeeting", scheduledMeetingSchema);

export { ScheduledMeeting };
