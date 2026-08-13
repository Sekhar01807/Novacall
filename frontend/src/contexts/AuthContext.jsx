import axios from "axios";
import httpStatus from "http-status";
import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${server}/api/v1/users`
})

export const AuthProvider = ({ children }) => {
    const authContext = useContext(AuthContext);
    const [userData, setUserData] = useState(authContext);
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
        const token = localStorage.getItem("token");
        if (!token) return null;
        try {
            const res = await client.get("/get_profile", { params: { token } });
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
            console.error("Error fetching user profile:", e);
        }
        return null;
    };

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const handleRegister = async (name, email, username, password) => {
        try {
            let request = await client.post("/register", {
                name: name,
                email: email,
                username: username,
                password: password
            });

            if (request.status === httpStatus.CREATED) {
                return request.data.message;
            }
        } catch (err) {
            throw err;
        }
    };

    const handleLogin = async (username, password) => {
        try {
            let request = await client.post("/login", {
                username: username,
                password: password
            });

            if (request.status === httpStatus.OK) {
                localStorage.setItem("token", request.data.token);
                await fetchUserProfile();
                router("/home");
            }
        } catch (err) {
            throw err;
        }
    };

    const updateUserProfile = async (profileData) => {
        const token = localStorage.getItem("token");
        try {
            const res = await client.post("/update_profile", { token, ...profileData });
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
        } catch (e) {
            throw e;
        }
    };

    const changePassword = async (oldPassword, newPassword) => {
        const token = localStorage.getItem("token");
        try {
            const res = await client.post("/change_password", { token, oldPassword, newPassword });
            return res.data;
        } catch (e) {
            throw e;
        }
    };

    const signOutAllDevices = async () => {
        const token = localStorage.getItem("token");
        try {
            await client.post("/signout_all", { token });
        } catch (e) {
            console.error("Sign out all error", e);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("userProfile");
            setUserData({});
            router("/");
        }
    };

    const deleteAccount = async () => {
        const token = localStorage.getItem("token");
        try {
            await client.post("/delete_account", { token });
        } catch (e) {
            console.error("Delete account error", e);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("userProfile");
            setUserData({});
            router("/");
        }
    };

    const getHistoryOfUser = async () => {
        try {
            let request = await client.get("/get_all_activity", {
                params: {
                    token: localStorage.getItem("token")
                }
            });
            return request.data;
        } catch (err) {
            throw err;
        }
    };

    const addToUserHistory = async (meetingCode) => {
        try {
            let request = await client.post("/add_to_activity", {
                token: localStorage.getItem("token"),
                meeting_code: meetingCode
            });
            return request;
        } catch (e) {
            throw e;
        }
    };

    const data = {
        userData,
        setUserData,
        themeMode,
        setThemeMode,
        fetchUserProfile,
        updateUserProfile,
        changePassword,
        signOutAllDevices,
        deleteAccount,
        addToUserHistory,
        getHistoryOfUser,
        handleRegister,
        handleLogin
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
};