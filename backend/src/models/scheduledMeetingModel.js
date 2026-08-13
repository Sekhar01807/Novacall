import mongoose, { Schema } from "mongoose";

const scheduledMeetingSchema = new Schema({
    user_id: { type: String, required: true },
    title: { type: String, required: true },
    meeting_code: { type: String, required: true },
    scheduled_date: { type: Date, required: true },
    scheduled_time: { type: String, default: "10:00 AM" },
    duration: { type: String, default: "30 mins" },
    time_zone: { type: String, default: "(GMT+05:30) India Standard Time" },
    description: { type: String, default: "" },
    created_at: { type: Date, default: Date.now }
});

const ScheduledMeeting = mongoose.model("ScheduledMeeting", scheduledMeetingSchema);

export { ScheduledMeeting };
