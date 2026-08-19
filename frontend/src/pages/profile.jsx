import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Button, TextField, Box, Typography, Avatar, IconButton, Divider, Grid, 
    Switch, FormControlLabel, Select, MenuItem, InputLabel, FormControl, 
    Dialog, DialogTitle, DialogContent, DialogActions, Alert, Chip, RadioGroup, Radio 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import VideocamIcon from '@mui/icons-material/Videocam';
import SettingsVoiceIcon from '@mui/icons-material/SettingsVoice';
import SecurityIcon from '@mui/icons-material/Security';
import PaletteIcon from '@mui/icons-material/Palette';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PhoneIcon from '@mui/icons-material/Phone';
import LanguageIcon from '@mui/icons-material/Language';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DevicesIcon from '@mui/icons-material/Devices';

import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TuneIcon from '@mui/icons-material/Tune';
import CircleIcon from '@mui/icons-material/Circle';

import "../App.css";
import { logoImg } from '../assets/images';
import { AuthContext } from '../contexts/AuthContext';

function ProfileComponent() {
    const navigate = useNavigate();
    const { 
        userData, updateUserProfile, changePassword, signOutAllDevices, 
        deleteAccount, themeMode, setThemeMode, fetchUserProfile 
    } = useContext(AuthContext);

    const [activeTab, setActiveTab] = useState('personal');

    // 1. Personal Information State
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [profilePic, setProfilePic] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [company, setCompany] = useState("");
    const [country, setCountry] = useState("India");
    const [timeZone, setTimeZone] = useState("(GMT+05:30) India Standard Time");

    // 2. Meeting Profile State
    const [pronouns, setPronouns] = useState("he/him");
    const [showJobTitle, setShowJobTitle] = useState(true);
    const [showCompany, setShowCompany] = useState(true);
    const [showProfilePhoto, setShowProfilePhoto] = useState(true);

    // 3. Audio & Video Settings State
    const [selectedMic, setSelectedMic] = useState("default");
    const [selectedSpeaker, setSelectedSpeaker] = useState("default");
    const [selectedCam, setSelectedCam] = useState("default");
    const [hdVideo, setHdVideo] = useState(true);
    const [mirrorVideo, setMirrorVideo] = useState(false);
    const [testMediaOpen, setTestMediaOpen] = useState(false);
    const testVideoRef = useRef(null);

    // 4. Availability & Status State
    const [statusState, setStatusState] = useState("Available");
    const [statusMsg, setStatusMsg] = useState("Focusing on project work");

    // 5. Meeting Preferences State
    const [defaultMicOff, setDefaultMicOff] = useState(false);
    const [defaultCamOff, setDefaultCamOff] = useState(false);

    // 6. Notifications State
    const [notifyInvites, setNotifyInvites] = useState(true);
    const [notifyReminders, setNotifyReminders] = useState(true);
    const [notifyJoins, setNotifyJoins] = useState(true);
    const [notifyLeaves, setNotifyLeaves] = useState(false);
    const [emailNotifs, setEmailNotifs] = useState(true);
    const [productUpdates, setProductUpdates] = useState(false);

    // 9. Language & Region State
    const [language, setLanguage] = useState("en-US");
    const [timeFormat, setTimeFormat] = useState("12h");



    // Dialog & Alert States
    const [pwDialogOpen, setPwDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [pwAlert, setPwAlert] = useState({ show: false, message: "", severity: "info" });
    const [statusAlert, setStatusAlert] = useState({ show: false, message: "", severity: "success" });

    // Sync with AuthContext userData & fetch Activity History on Mount
    useEffect(() => {
        const load = async () => {
            let data = userData;
            if (!data || !data.email) {
                data = await fetchUserProfile();
            }
            if (data) {
                if (data.name || data.username) setDisplayName(data.name || data.username);
                if (data.email) setEmail(data.email);
                if (data.phone) setPhone(data.phone);
                if (data.profilePic) setProfilePic(data.profilePic);
                if (data.jobTitle) setJobTitle(data.jobTitle);
                if (data.company) setCompany(data.company);
                if (data.country) setCountry(data.country);
                if (data.timeZone) setTimeZone(data.timeZone);
                if (data.statusMsg) setStatusMsg(data.statusMsg);
                if (data.statusState) setStatusState(data.statusState);
                if (data.pronouns) setPronouns(data.pronouns);
                if (data.showJobTitle !== undefined) setShowJobTitle(data.showJobTitle);
                if (data.showCompany !== undefined) setShowCompany(data.showCompany);
                if (data.showProfilePhoto !== undefined) setShowProfilePhoto(data.showProfilePhoto);
                if (data.defaultMicOff !== undefined) setDefaultMicOff(data.defaultMicOff);
                if (data.defaultCamOff !== undefined) setDefaultCamOff(data.defaultCamOff);
                if (data.selectedCam) setSelectedCam(data.selectedCam);
                if (data.selectedMic) setSelectedMic(data.selectedMic);
                if (data.selectedSpeaker) setSelectedSpeaker(data.selectedSpeaker);
                if (data.hdVideo !== undefined) setHdVideo(data.hdVideo);
                if (data.mirrorVideo !== undefined) setMirrorVideo(data.mirrorVideo);
                if (data.notifyInvites !== undefined) setNotifyInvites(data.notifyInvites);
                if (data.notifyReminders !== undefined) setNotifyReminders(data.notifyReminders);
                if (data.notifyJoins !== undefined) setNotifyJoins(data.notifyJoins);
                if (data.notifyLeaves !== undefined) setNotifyLeaves(data.notifyLeaves);
                if (data.emailNotifs !== undefined) setEmailNotifs(data.emailNotifs);
                if (data.productUpdates !== undefined) setProductUpdates(data.productUpdates);
                if (data.timeFormat) setTimeFormat(data.timeFormat);
            }
        };
        load();
    }, [userData, fetchUserProfile]);

    const handleSave = async () => {
        try {
            await updateUserProfile({
                name: displayName,
                phone,
                jobTitle,
                company,
                country,
                timeZone,
                profilePic,
                statusState,
                statusMsg,
                pronouns,
                showJobTitle,
                showCompany,
                showProfilePhoto,
                themeMode,
                defaultMicOff,
                defaultCamOff,
                selectedCam,
                selectedMic,
                selectedSpeaker,
                hdVideo,
                mirrorVideo,
                notifyInvites,
                notifyReminders,
                notifyJoins,
                notifyLeaves,
                emailNotifs,
                productUpdates,
                timeFormat
            });
            setStatusAlert({ show: true, message: "Profile & Settings saved successfully to MongoDB!", severity: "success" });
            setTimeout(() => {
                navigate("/home");
            }, 1200);
        } catch (e) {
            setStatusAlert({ show: true, message: "Failed to save settings: " + (e.response?.data?.message || e.message), severity: "error" });
        }
    };

    const handleChangePasswordSubmit = async () => {
        if (!newPassword) {
            setPwAlert({ show: true, message: "Please enter a new password", severity: "error" });
            return;
        }
        try {
            const res = await changePassword(oldPassword, newPassword);
            setPwAlert({ show: true, message: res.message || "Password updated successfully!", severity: "success" });
            setTimeout(() => {
                setPwDialogOpen(false);
                setOldPassword("");
                setNewPassword("");
                setPwAlert({ show: false, message: "", severity: "info" });
            }, 1500);
        } catch (e) {
            setPwAlert({ show: true, message: e.response?.data?.message || "Failed to update password", severity: "error" });
        }
    };

    const handleDeleteAccountConfirm = async () => {
        try {
            await deleteAccount();
        } catch (e) {
            alert("Failed to delete account: " + e.message);
        }
    };

    const handleAvatarClick = () => {
        const url = prompt("Enter a direct URL for your profile picture (or leave blank for default avatar):", profilePic);
        if (url !== null) {
            setProfilePic(url);
        }
    };

    const startTestMedia = async () => {
        setTestMediaOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setTimeout(() => {
                if (testVideoRef.current) {
                    testVideoRef.current.srcObject = stream;
                }
            }, 300);
        } catch (e) {
            console.error("Test stream error:", e);
        }
    };

    const stopTestMedia = () => {
        if (testVideoRef.current && testVideoRef.current.srcObject) {
            testVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
        }
        setTestMediaOpen(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Available': return '#10B981';
            case 'Busy': return '#F59E0B';
            case 'Do Not Disturb': return '#F43F5E';
            case 'Away': return '#8B5CF6';
            default: return '#64748B';
        }
    };

    const tabs = [
        { id: 'personal', icon: <PersonIcon />, label: "Personal Information" },
        { id: 'meeting', icon: <VideocamIcon />, label: "Meeting Profile" },
        { id: 'audio', icon: <SettingsVoiceIcon />, label: "Audio & Video" },
        { id: 'status', icon: <CircleIcon style={{ fontSize: 14, color: getStatusColor(statusState) }} />, label: "Availability / Status" },
        { id: 'preferences', icon: <TuneIcon />, label: "Meeting Preferences" },
        { id: 'notifications', icon: <NotificationsIcon />, label: "Notifications" },
        { id: 'security', icon: <SecurityIcon />, label: "Security" },
        { id: 'devices', icon: <DevicesIcon />, label: "Devices" },
        { id: 'region', icon: <LanguageIcon />, label: "Language & Region" },
        { id: 'appearance', icon: <PaletteIcon />, label: "Appearance" },
        { id: 'danger', icon: <WarningIcon style={{ color: '#F43F5E' }} />, label: "Danger Zone" },
    ];

    return (
        <div className="appShell">
            {/* Left Sidebar Rail */}
            <div className="sidebarRail">
                <div>
                    <div className="sidebarBrand">
                        <img src={logoImg} alt="NovaCall Logo" style={{ height: 36, width: 'auto' }} />
                        <h2>Nova<span>Call</span></h2>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="dashboardContent" style={{ backgroundColor: '#F8FAFC', height: '100vh', overflowY: 'auto', paddingTop: '1.5rem' }}>
                <div className="topHeaderBar" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <IconButton onClick={() => navigate("/home")} sx={{ bgcolor: '#F1F5F9' }}>
                                <ArrowBackIcon />
                            </IconButton>
                            <div>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    Settings & Profile
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#64748B' }}>
                                    Manage your account credentials, preferences, and conferencing tools.
                                </Typography>
                            </div>
                        </div>
                        <Button 
                            variant="contained" 
                            size="medium"
                            onClick={handleSave}
                            startIcon={<SaveIcon />}
                            sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none', bgcolor: '#3B82F6', '&:hover': { bgcolor: '#2563EB' }, boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }}
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>

                <Box sx={{ maxWidth: '1180px', margin: '0 auto', width: '100%', px: 4, pb: 6 }}>
                    
                    {/* SECTION 1: Top Profile Header Card */}
                    <Box sx={{ bgcolor: '#FFFFFF', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(148, 163, 184, 0.08)', p: 3, mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Box sx={{ position: 'relative' }}>
                                <Avatar src={profilePic} sx={{ width: 72, height: 72, fontSize: '1.8rem', fontWeight: 800, bgcolor: '#3B82F6', color: '#FFF' }}>
                                    {!profilePic && (displayName ? displayName.charAt(0).toUpperCase() : 'U')}
                                </Avatar>
                                <CircleIcon sx={{ position: 'absolute', bottom: 0, right: 0, fontSize: 18, color: getStatusColor(statusState), border: '2px solid #FFF', borderRadius: '50%' }} />
                            </Box>
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>{displayName || 'User'}</Typography>
                                </Box>
                                <Typography variant="body2" sx={{ color: '#64748B' }}>{email}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <CircleIcon sx={{ fontSize: 10, color: getStatusColor(statusState) }} />
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: getStatusColor(statusState) }}>
                                        {statusState} — {statusMsg}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                        <Button variant="outlined" onClick={handleAvatarClick} sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 700 }}>
                            Edit Profile Photo
                        </Button>
                    </Box>

                    {/* SECTION 2: Left Nav + Right Content Grid */}
                    <Box sx={{ display: 'flex', gap: 4 }}>
                        
                        {/* Left Navigation Suite */}
                        <Box sx={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                            {tabs.map((tab) => (
                                <Box 
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    sx={{ 
                                        display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.4, 
                                        borderRadius: '12px', cursor: 'pointer',
                                        bgcolor: activeTab === tab.id ? '#EFF6FF' : 'transparent',
                                        color: activeTab === tab.id ? '#2563EB' : (tab.id === 'danger' ? '#F43F5E' : '#475569'),
                                        fontWeight: activeTab === tab.id ? 700 : 600,
                                        border: '1px solid transparent',
                                        borderColor: activeTab === tab.id ? '#BFDBFE' : 'transparent',
                                        transition: 'all 0.2s',
                                        '&:hover': { bgcolor: activeTab === tab.id ? '#EFF6FF' : '#F1F5F9' }
                                    }}
                                >
                                    {tab.icon}
                                    <Typography variant="body2" sx={{ fontWeight: 'inherit', color: 'inherit' }}>{tab.label}</Typography>
                                </Box>
                            ))}
                        </Box>

                        {/* Right Content Panels */}
                        <Box sx={{ flex: 1, borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 30px rgba(148, 163, 184, 0.05)', p: 4 }}>
                            
                            {/* 1. Personal Information */}
                            {activeTab === 'personal' && (
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Personal Information</Typography>
                                    <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>Basic user credentials used across your NovaCall profile.</Typography>
                                    <Grid container spacing={2.5}>
                                        <Grid item xs={12} md={6}>
                                            <TextField fullWidth label="Full Name" value={displayName} onChange={e => setDisplayName(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField fullWidth label="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField fullWidth label="Email Address" value={email} disabled sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#F8FAFC' } }} />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField fullWidth label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField fullWidth label="Job Title" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Product Designer" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField fullWidth label="Company / Organization" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Inc." sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField fullWidth label="Country / Region" value={country} onChange={e => setCountry(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField fullWidth label="Time Zone" value={timeZone} onChange={e => setTimeZone(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}

                            {/* 2. Meeting Profile */}
                            {activeTab === 'meeting' && (
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Meeting Profile</Typography>
                                    <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>Configure your public identity when in live video rooms.</Typography>
                                    <Grid container spacing={2.5}>
                                        <Grid item xs={12} md={6}>
                                            <TextField fullWidth label="Meeting Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField fullWidth label="Pronouns (Optional)" value={pronouns} onChange={e => setPronouns(e.target.value)} placeholder="e.g. he/him or she/her" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                                        </Grid>
                                    </Grid>
                                    <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        <FormControlLabel control={<Switch checked={showJobTitle} onChange={e => setShowJobTitle(e.target.checked)} />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Show job title in meetings</Typography>} />
                                        <FormControlLabel control={<Switch checked={showCompany} onChange={e => setShowCompany(e.target.checked)} />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Show company name in meetings</Typography>} />
                                        <FormControlLabel control={<Switch checked={showProfilePhoto} onChange={e => setShowProfilePhoto(e.target.checked)} />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Show profile photo when camera is off</Typography>} />
                                    </Box>
                                </Box>
                            )}

                            {/* 3. Audio & Video Settings */}
                            {activeTab === 'audio' && (
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Audio & Video Settings</Typography>
                                    <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>Test and select default conferencing hardware.</Typography>
                                    <Grid container spacing={2.5} sx={{ mb: 3 }}>
                                        <Grid item xs={12}>
                                            <FormControl fullWidth><InputLabel>Microphone</InputLabel><Select value={selectedMic} onChange={e => setSelectedMic(e.target.value)} label="Microphone" sx={{ borderRadius: '12px' }}><MenuItem value="default">MacBook Pro Microphone (Built-in)</MenuItem><MenuItem value="external">USB Condenser Microphone</MenuItem></Select></FormControl>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <FormControl fullWidth><InputLabel>Speaker</InputLabel><Select value={selectedSpeaker} onChange={e => setSelectedSpeaker(e.target.value)} label="Speaker" sx={{ borderRadius: '12px' }}><MenuItem value="default">MacBook Pro Speakers (Built-in)</MenuItem><MenuItem value="external">External Headphones</MenuItem></Select></FormControl>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <FormControl fullWidth><InputLabel>Camera</InputLabel><Select value={selectedCam} onChange={e => setSelectedCam(e.target.value)} label="Camera" sx={{ borderRadius: '12px' }}><MenuItem value="default">FaceTime HD Camera (Built-in)</MenuItem><MenuItem value="external">External 1080p Webcam</MenuItem></Select></FormControl>
                                        </Grid>
                                    </Grid>
                                    <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                                        <FormControlLabel control={<Switch checked={hdVideo} onChange={e => setHdVideo(e.target.checked)} />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>HD Video Resolution</Typography>} />
                                        <FormControlLabel control={<Switch checked={mirrorVideo} onChange={e => setMirrorVideo(e.target.checked)} />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Mirror My Video</Typography>} />
                                    </Box>
                                    <Button variant="outlined" startIcon={<TuneIcon />} onClick={startTestMedia} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>
                                        Test Audio & Video Hardware
                                    </Button>
                                </Box>
                            )}

                            {/* 4. Availability / Status */}
                            {activeTab === 'status' && (
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Availability & Status</Typography>
                                    <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>Set your status for team members in NovaCall.</Typography>
                                    <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
                                        {['Available', 'Busy', 'Do Not Disturb', 'Away', 'Offline'].map(st => (
                                            <Chip 
                                                key={st}
                                                icon={<CircleIcon style={{ fontSize: 12, color: getStatusColor(st) }} />}
                                                label={st}
                                                onClick={() => setStatusState(st)}
                                                sx={{ 
                                                    fontWeight: 700, borderRadius: '10px', px: 1, py: 2,
                                                    bgcolor: statusState === st ? '#EFF6FF' : '#F8FAFC',
                                                    border: statusState === st ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                                                    color: statusState === st ? '#3B82F6' : '#475569'
                                                }}
                                            />
                                        ))}
                                    </Box>
                                    <TextField fullWidth label="Status Message" value={statusMsg} onChange={e => setStatusMsg(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                                </Box>
                            )}

                            {/* 5. Meeting Preferences */}
                            {activeTab === 'preferences' && (
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Meeting Preferences</Typography>
                                    <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>Configure automatic room behaviors on entry.</Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>Join with Microphone Muted</Typography>
                                            <Switch checked={defaultMicOff} onChange={e => setDefaultMicOff(e.target.checked)} />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>Join with Camera OFF</Typography>
                                            <Switch checked={defaultCamOff} onChange={e => setDefaultCamOff(e.target.checked)} />
                                        </Box>
                                    </Box>
                                </Box>
                            )}

                            {/* 6. Notifications */}
                            {activeTab === 'notifications' && (
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Notifications</Typography>
                                    <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>Control alerts for invitations and meeting activity.</Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        <FormControlLabel control={<Switch checked={notifyInvites} onChange={e => setNotifyInvites(e.target.checked)} />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Meeting invitations</Typography>} />
                                        <FormControlLabel control={<Switch checked={notifyReminders} onChange={e => setNotifyReminders(e.target.checked)} />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Meeting starting reminders</Typography>} />
                                        <FormControlLabel control={<Switch checked={notifyJoins} onChange={e => setNotifyJoins(e.target.checked)} />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Participant join alerts</Typography>} />
                                        <FormControlLabel control={<Switch checked={emailNotifs} onChange={e => setEmailNotifs(e.target.checked)} />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Email summary updates</Typography>} />
                                    </Box>
                                </Box>
                            )}

                            {/* 7. Security */}
                            {activeTab === 'security' && (
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Security</Typography>
                                    <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>Manage account password and active login sessions.</Typography>
                                    <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 2.5, mb: 2 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Password</Typography>
                                        <Typography variant="body2" sx={{ color: '#64748B', mb: 1.5 }}>Update your password regularly for protection.</Typography>
                                        <Button variant="outlined" onClick={() => setPwDialogOpen(true)} sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 700 }}>Change Password</Button>
                                    </Box>
                                    <Box sx={{ border: '1px solid #FECDD3', bgcolor: '#FFF1F2', borderRadius: '12px', p: 2.5 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#BE123C' }}>Sign Out Everywhere</Typography>
                                        <Typography variant="body2" sx={{ color: '#BE123C', mb: 1.5 }}>Terminate active login sessions on all devices.</Typography>
                                        <Button variant="contained" color="error" onClick={signOutAllDevices} sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 700 }}>Sign Out All Devices</Button>
                                    </Box>
                                </Box>
                            )}

                            {/* 8. Devices */}
                            {activeTab === 'devices' && (
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Devices</Typography>
                                    <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>Currently connected hardware and web browsers.</Typography>
                                    <Box sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: '12px', bgcolor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Windows PC — Chrome Browser</Typography>
                                            <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700 }}>● Active now</Typography>
                                        </Box>
                                        <Button size="small" variant="outlined" color="error" onClick={signOutAllDevices} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}>Sign Out</Button>
                                    </Box>
                                </Box>
                            )}

                            {/* 9. Language & Region */}
                            {activeTab === 'region' && (
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Language & Region</Typography>
                                    <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>Select your preferred language and time formats.</Typography>
                                    <Grid container spacing={2.5}>
                                        <Grid item xs={12} md={6}>
                                            <FormControl fullWidth><InputLabel>Language</InputLabel><Select value={language} onChange={e => setLanguage(e.target.value)} label="Language" sx={{ borderRadius: '12px' }}><MenuItem value="en-US">English (US)</MenuItem><MenuItem value="en-UK">English (UK)</MenuItem></Select></FormControl>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Time Format</Typography>
                                            <RadioGroup row value={timeFormat} onChange={e => setTimeFormat(e.target.value)}>
                                                <FormControlLabel value="12h" control={<Radio />} label="12-hour (AM/PM)" />
                                                <FormControlLabel value="24h" control={<Radio />} label="24-hour" />
                                            </RadioGroup>
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}

                            {/* 10. Appearance */}
                            {activeTab === 'appearance' && (
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Appearance</Typography>
                                    <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>Customize NovaCall's visual theme mode.</Typography>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        {['light', 'dark', 'system'].map((mode) => (
                                            <Box key={mode} onClick={() => setThemeMode(mode)} sx={{ border: themeMode === mode ? '2px solid #3B82F6' : '1px solid #E2E8F0', borderRadius: '12px', p: 2, width: '120px', textAlign: 'center', cursor: 'pointer', bgcolor: themeMode === mode ? '#F0F7FF' : 'transparent', opacity: themeMode === mode ? 1 : 0.5 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: themeMode === mode ? '#3B82F6' : '#64748B', textTransform: 'capitalize' }}>{mode}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {/* 13. Danger Zone */}
                            {activeTab === 'danger' && (
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#BE123C', mb: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Danger Zone</Typography>
                                    <Typography variant="body2" sx={{ color: '#BE123C', mb: 3 }}>IRREVERSIBLE ACTIONS. Proceed with caution.</Typography>
                                    <Box sx={{ p: 3, border: '1px solid #FECDD3', borderRadius: '16px', bgcolor: '#FFF1F2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#BE123C' }}>Delete Account</Typography>
                                            <Typography variant="body2" sx={{ color: '#BE123C' }}>Permanently remove your account and all meeting history data.</Typography>
                                        </Box>
                                        <Button variant="contained" color="error" onClick={() => setDeleteDialogOpen(true)} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>Delete Account</Button>
                                    </Box>
                                </Box>
                            )}

                            {statusAlert.show && (
                                <Box sx={{ mt: 3 }}>
                                    <Alert severity={statusAlert.severity} onClose={() => setStatusAlert({ ...statusAlert, show: false })}>
                                        {statusAlert.message}
                                    </Alert>
                                </Box>
                            )}

                        </Box>
                    </Box>
                </Box>
            </div>

            {/* Change Password Dialog Modal */}
            <Dialog open={pwDialogOpen} onClose={() => setPwDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: 800 }}>Change Password</DialogTitle>
                <DialogContent dividers>
                    {pwAlert.show && <Alert severity={pwAlert.severity} sx={{ mb: 2 }}>{pwAlert.message}</Alert>}
                    <TextField fullWidth margin="dense" type="password" label="Current Password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} sx={{ mb: 2 }} />
                    <TextField fullWidth margin="dense" type="password" label="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setPwDialogOpen(false)} sx={{ fontWeight: 600, textTransform: 'none' }}>Cancel</Button>
                    <Button onClick={handleChangePasswordSubmit} variant="contained" sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '8px' }}>Update Password</Button>
                </DialogActions>
            </Dialog>

            {/* Live Hardware Test Modal */}
            <Dialog open={testMediaOpen} onClose={stopTestMedia} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 800 }}>Hardware Diagnostic Test</DialogTitle>
                <DialogContent dividers sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>Testing camera & microphone inputs live...</Typography>
                    <Box sx={{ width: '100%', height: 260, bgcolor: '#0F172A', borderRadius: '12px', overflow: 'hidden', mb: 2 }}>
                        <video ref={testVideoRef} autoPlay muted style={{ width: '100%', height: '100%', objectFit: 'cover' }}></video>
                    </Box>
                    <Chip icon={<CheckCircleIcon sx={{ color: '#10B981 !important' }} />} label="Audio & Video hardware operational" color="success" variant="outlined" sx={{ fontWeight: 700 }} />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={stopTestMedia} variant="contained" sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '8px' }}>Close Diagnostic</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Account Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle sx={{ fontWeight: 800, color: '#BE123C' }}>Permanently Delete Account?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: '#475569' }}>
                        This action cannot be undone. All your user profile credentials and meeting activity history will be permanently deleted from the database.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} sx={{ fontWeight: 600, textTransform: 'none' }}>Cancel</Button>
                    <Button onClick={handleDeleteAccountConfirm} variant="contained" color="error" sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '8px' }}>Delete My Account</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default ProfileComponent;
