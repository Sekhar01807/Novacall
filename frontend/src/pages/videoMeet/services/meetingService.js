import axios from "axios";
import server from "../../../environment";

const client = axios.create({
    baseURL: `${server}/api/v1/users`
});

// Request interceptor to attach Bearer Token
client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

export const meetingService = {
    async addHistory(meetingCode) {
        const response = await client.post("/add_to_activity", { meeting_code: meetingCode });
        return response.data;
    },

    async getHistory() {
        const response = await client.get("/get_all_activity");
        return response.data;
    },

    async getUpcomingMeetings() {
        const response = await client.get("/get_upcoming_meetings");
        return response.data;
    },

    async createScheduledMeeting(data) {
        const response = await client.post("/create_scheduled_meeting", data);
        return response.data;
    },

    async deleteScheduledMeeting(id) {
        const response = await client.delete(`/delete_scheduled_meeting/${id}`);
        return response.data;
    }
};
