import { Schema, model } from "mongoose";

const meetingSchema = new Schema({
    user_id: {
        type: String,
        required: true,
        index: true
    },
    meeting_code: {
        type: String,
        required: true,
        index: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    }
}, { timestamps: true });

// Compound and single field indexes for optimal history queries
meetingSchema.index({ user_id: 1, date: -1 });
meetingSchema.index({ date: -1 });
meetingSchema.index({ user_id: 1, meeting_code: 1 });

const Meeting = model("Meeting", meetingSchema);

export { Meeting };