import mongoose, { Schema } from "mongoose";

const scheduledMeetingSchema = new Schema({
    user_id: { type: String, required: true, index: true },
    title: { type: String, required: true },
    meeting_code: { type: String, required: true, index: true },
    scheduled_date: { type: Date, required: true },
    scheduled_time: { type: String, default: "10:00 AM" },
    duration: { type: String, default: "30 mins" },
    time_zone: { type: String, default: "(GMT+05:30) India Standard Time" },
    description: { type: String, default: "" },
    created_at: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound and single field indexes for optimal upcoming meetings queries
scheduledMeetingSchema.index({ user_id: 1, scheduled_date: 1 });
scheduledMeetingSchema.index({ user_id: 1, created_at: -1 });

const ScheduledMeeting = mongoose.model("ScheduledMeeting", scheduledMeetingSchema);

export { ScheduledMeeting };
