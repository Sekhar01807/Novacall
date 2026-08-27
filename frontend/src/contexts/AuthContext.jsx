import axios from "axios";
import httpStatus from "http-status";
import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

/* eslint-disable react-refresh/only-export-components */
export const AuthContext = createContext({});

export const client = axios.create({
    baseURL: `${server}/api/v1/users`,
    withCredentials: true
});

export const AuthProvider = ({ children }) => {
    const [userData, setUserData] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [themeMode, setThemeModeState] = useState(localStorage.getItem("themeMode") || "light");
    const router = useNavigate();

    // Helper to apply theme to document
    const applyTheme = (mode) => {
        let activeTheme = mode;
        if (mode === "system") {
            activeTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }
        document.documentElement.setAttribute("data-theme", activeTheme);
        if (activeTheme === "dark") {
            document.body.classList.add("dark-theme");
        } else {
            document.body.classList.remove("dark-theme");
        }
    };

    useEffect(() => {
        applyTheme(themeMode);
        localStorage.setItem("themeMode", themeMode);
    }, [themeMode]);

    const setThemeMode = (mode) => {
        setThemeModeState(mode);
    };

    const fetchUserProfile = async () => {
        try {
            const res = await client.get("/get_profile");
            if (res.status === httpStatus.OK && res.data) {
                setUserData(res.data);
                const localProf = {
                    displayName: res.data.name || res.data.username,
                    email: res.data.email,
                    jobTitle: res.data.jobTitle,
                    company: res.data.company,
                    profilePic: res.data.profilePic,
                    themeMode: res.data.themeMode,
                    defaultMicOff: res.data.defaultMicOff,
                    defaultCamOff: res.data.defaultCamOff,
                    selectedCam: res.data.selectedCam,
                    selectedMic: res.data.selectedMic
                };
                localStorage.setItem("userProfile", JSON.stringify(localProf));
                localStorage.setItem("meetingSettings", JSON.stringify({
                    defaultMicOff: res.data.defaultMicOff,
                    defaultCamOff: res.data.defaultCamOff
                }));
                if (res.data.themeMode) {
                    setThemeModeState(res.data.themeMode);
                }
                return res.data;
            }
        } catch (e) {
            setUserData(null);
            localStorage.removeItem("userProfile");
        } finally {
            setAuthLoading(false);
        }
        return null;
    };

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const handleRegister = async (name, email, username, password) => {
        const request = await client.post("/register", {
            name: name,
            email: email,
            username: username,
            password: password
        });

        if (request.status === httpStatus.CREATED) {
            return request.data.message;
        }
    };

    const handleLogin = async (username, password) => {
        const request = await client.post("/login", {
            username: username,
            password: password
        });

        if (request.status === httpStatus.OK) {
            await fetchUserProfile();
            router("/home");
        }
    };

    const handleLogout = async () => {
        try {
            await client.post("/logout");
        } catch (e) {
            console.error("Logout error", e);
        } finally {
            localStorage.removeItem("userProfile");
            localStorage.removeItem("meetingSettings");
            setUserData(null);
            router("/");
        }
    };

    const updateUserProfile = async (profileData) => {
        const res = await client.post("/update_profile", profileData);
        if (res.status === httpStatus.OK && res.data.profile) {
            setUserData(res.data.profile);
            const updated = res.data.profile;
            localStorage.setItem("userProfile", JSON.stringify({
                displayName: updated.name || updated.username,
                email: updated.email,
                jobTitle: updated.jobTitle,
                company: updated.company,
                profilePic: updated.profilePic,
                themeMode: updated.themeMode,
                defaultMicOff: updated.defaultMicOff,
                defaultCamOff: updated.defaultCamOff,
                selectedCam: updated.selectedCam,
                selectedMic: updated.selectedMic
            }));
            localStorage.setItem("meetingSettings", JSON.stringify({
                defaultMicOff: updated.defaultMicOff,
                defaultCamOff: updated.defaultCamOff
            }));
            if (updated.themeMode) {
                setThemeModeState(updated.themeMode);
            }
            return res.data;
        }
    };

    const changePassword = async (oldPassword, newPassword) => {
        const res = await client.post("/change_password", { currentPassword: oldPassword, newPassword });
        return res.data;
    };

    const signOutAllDevices = async () => {
        try {
            await client.post("/signout_all");
        } catch (e) {
            console.error("Sign out all error", e);
        } finally {
            localStorage.removeItem("userProfile");
            localStorage.removeItem("meetingSettings");
            setUserData(null);
            router("/");
        }
    };

    const deleteAccount = async () => {
        try {
            await client.post("/delete_account");
        } catch (e) {
            console.error("Delete account error", e);
        } finally {
            localStorage.removeItem("userProfile");
            localStorage.removeItem("meetingSettings");
            setUserData(null);
            router("/");
        }
    };

    const getHistoryOfUser = async (page = 1, limit = 10, search = "") => {
        const request = await client.get("/get_all_activity", {
            params: {
                page: page,
                limit: limit,
                search: search
            }
        });
        return request.data;
    };

    const addToUserHistory = async (meetingCode) => {
        const request = await client.post("/add_to_activity", {
            meeting_code: meetingCode
        });
        return request;
    };

    const createScheduledMeeting = async (meetingData) => {
        const res = await client.post("/create_scheduled_meeting", meetingData);
        return res.data;
    };

    const getUpcomingMeetings = async () => {
        try {
            const res = await client.get("/get_upcoming_meetings");
            return res.data;
        } catch (e) {
            console.error("Error fetching upcoming meetings:", e);
            return [];
        }
    };

    const deleteScheduledMeeting = async (id) => {
        const res = await client.delete(`/delete_scheduled_meeting/${id}`);
        return res.data;
    };

    const data = {
        userData,
        setUserData,
        authLoading,
        isAuthenticated: Boolean(userData?.username),
        themeMode,
        setThemeMode,
        fetchUserProfile,
        updateUserProfile,
        changePassword,
        handleLogout,
        signOutAllDevices,
        deleteAccount,
        addToUserHistory,
        getHistoryOfUser,
        createScheduledMeeting,
        getUpcomingMeetings,
        deleteScheduledMeeting,
        handleRegister,
        handleLogin
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
};