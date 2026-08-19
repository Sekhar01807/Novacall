/* eslint-disable react-refresh/only-export-components */
import React, { useContext, useState, useCallback, useEffect } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { Button, IconButton, TextField, Box, Typography, InputAdornment, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Avatar, Divider, Collapse, List, ListItem, ListItemIcon, ListItemText, CircularProgress } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventIcon from '@mui/icons-material/Event';
import SettingsIcon from '@mui/icons-material/Settings';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { AuthContext } from '../contexts/AuthContext';
import { logoImg } from '../assets/images';

function HomeComponent() {
    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    
    // Additional Polish & Priority 2 States
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [scheduledTitle, setScheduledTitle] = useState("");
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("");
    const [createdScheduleLink, setCreatedScheduleLink] = useState("");
    const [toastMessage, setToastMessage] = useState("");
    const [toastOpen, setToastOpen] = useState(false);

    // Items 11 & 12: Upcoming & Recent Meetings States
    const [upcomingList, setUpcomingList] = useState([]);
    const [recentList, setRecentList] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    
    // Profile State
    const [profileOpen, setProfileOpen] = useState(false);
    const { userData, addToUserHistory, createScheduledMeeting, getUpcomingMeetings, getHistoryOfUser, deleteScheduledMeeting } = useContext(AuthContext);
    const savedProfile = JSON.parse(localStorage.getItem("userProfile")) || {};
    const displayName = userData?.name || userData?.username || savedProfile.displayName || (localStorage.getItem("token") ? "User" : "Guest");
    const profilePic = userData?.profilePic || savedProfile.profilePic || "";

    const loadDashboardData = useCallback(async () => {
        try {
            const upcoming = await getUpcomingMeetings();
            setUpcomingList(upcoming || []);
            const history = await getHistoryOfUser();
            setRecentList((history || []).slice(-3).reverse());
        } catch (e) {
            console.error("Dashboard data load error:", e);
        }
    }, [getUpcomingMeetings, getHistoryOfUser]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    const handleProfileClick = () => {
        setProfileOpen(!profileOpen);
    };

    const [joinLoading, setJoinLoading] = useState(false);

    let handleJoinVideoCall = async () => {
        if (!meetingCode.trim()) return;
        setJoinLoading(true);
        try {
            await addToUserHistory(meetingCode);
            navigate(`/${meetingCode}`);
        } catch {
            setToastMessage("Failed to join meeting. Please try again.");
            setToastOpen(true);
        } finally {
            setJoinLoading(false);
        }
    }

    const [newMeetingLoading, setNewMeetingLoading] = useState(false);

    const handleNewMeeting = async () => {
        setNewMeetingLoading(true);
        try {
            const code = Math.random().toString(36).substring(2, 8);
            await addToUserHistory(code);
            navigate(`/${code}`);
        } catch {
            setToastMessage("Failed to create meeting. Please try again.");
            setToastOpen(true);
        } finally {
            setNewMeetingLoading(false);
        }
    };

    const handleCreateSchedule = async () => {
        if (!scheduledTitle.trim()) return;
        setScheduleLoading(true);
        try {
            const code = Math.random().toString(36).substring(2, 8);
            const link = `${window.location.origin}/${code}`;
            setCreatedScheduleLink(link);
            
            // Item 11: Persist scheduled meeting to database
            await createScheduledMeeting({
                title: scheduledTitle,
                meeting_code: code,
                date: scheduledDate || new Date().toISOString(),
                time: scheduledTime || "10:00 AM",
                scheduled_date: scheduledDate || new Date().toISOString(),
                scheduled_time: scheduledTime || "10:00 AM"
            });

            setToastMessage(`Scheduled "${scheduledTitle}" successfully!`);
            setToastOpen(true);
            loadDashboardData();
        } catch {
            setToastMessage("Failed to schedule meeting.");
            setToastOpen(true);
        } finally {
            setScheduleLoading(false);
        }
    };

    const handleDeleteSchedule = async (id) => {
        try {
            await deleteScheduledMeeting(id);
            setToastMessage("Scheduled meeting cancelled.");
            setToastOpen(true);
            loadDashboardData();
        } catch (e) {
            console.error("Delete schedule error", e);
        }
    };

    const copyScheduleLink = () => {
        navigator.clipboard.writeText(createdScheduleLink);
        setToastMessage("Scheduled Meeting Link copied!");
        setToastOpen(true);
    };

    return (
        <div className="appShell">
            {/* Left Sidebar Rail */}
            <div className="sidebarRail">
                <div>
                    <div className="sidebarBrand">
                        <img src={logoImg} alt="NovaCall Logo" style={{ height: 36, width: 'auto' }} />
                        <h2>Nova<span>Call</span></h2>
                    </div>

                    <div className="sidebarNav">
                        <div className="sidebarNavItem active">
                            <DashboardIcon fontSize="small" /> Dashboard
                        </div>
                        <div className="sidebarNavItem" onClick={() => navigate("/history")}>
                            <RestoreIcon fontSize="small" /> History
                        </div>
                        <div className="sidebarNavItem" onClick={() => setScheduleOpen(true)}>
                            <EventIcon fontSize="small" /> Schedule
                        </div>
                    </div>
                </div>

                {/* Profile Section - Moved to Bottom */}
                <Box sx={{ px: 2, mb: 2 }}>
                    <Box 
                        onClick={handleProfileClick}
                        sx={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1, 
                            borderRadius: '50px', cursor: 'pointer',
                            border: '1px solid transparent', bgcolor: 'transparent',
                            transition: 'all 0.2s ease',
                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' },
                            mb: 1
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                            <Avatar src={profilePic} sx={{ bgcolor: '#eff6ff', color: '#2563eb', width: 36, height: 36, fontWeight: 700, fontSize: '1rem', border: '1px solid #bfdbfe' }}>
                                {!profilePic && displayName.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#FFFFFF', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {displayName}
                            </Typography>
                        </Box>
                        <KeyboardArrowDownIcon sx={{ color: '#64748B', fontSize: 20 }} />
                    </Box>
                    
                    <Collapse in={profileOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding sx={{ mt: 1, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                            <ListItem button onClick={() => navigate("/profile")} sx={{ py: 1.5, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' } }}>
                                <ListItemIcon sx={{ minWidth: 36 }}><SettingsIcon fontSize="small" sx={{ color: '#F1F5F9' }} /></ListItemIcon>
                                <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600, color: '#F1F5F9' }} />
                            </ListItem>
                            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                            <ListItem button onClick={() => {
                                localStorage.removeItem("token");
                                navigate("/");
                            }} sx={{ py: 1.5, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(244, 63, 94, 0.2)' } }}>
                                <ListItemIcon sx={{ minWidth: 36 }}><LogoutIcon fontSize="small" sx={{ color: '#F43F5E' }} /></ListItemIcon>
                                <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 700, color: '#F43F5E' }} />
                            </ListItem>
                        </List>
                    </Collapse>
                </Box>
            </div>

            {/* Main Content Area */}
            <div className="dashboardContent">
                <div className="topHeaderBar">
                    <div>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            NovaCall Dashboard
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748B' }}>
                            Welcome back! Connect with your team instantly.
                        </Typography>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <Button
                            variant="contained"
                            onClick={() => setScheduleOpen(true)}
                            startIcon={<EventIcon />}
                            sx={{
                                backgroundColor: '#60A5FA',
                                color: '#fff',
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: '12px',
                                '&:hover': { backgroundColor: '#3B82F6' },
                                display: { xs: 'none', sm: 'flex' }
                            }}
                        >
                            Schedule Meeting
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => navigate("/history")}
                            startIcon={<RestoreIcon />}
                            sx={{
                                borderColor: '#CBD5E1',
                                color: '#475569',
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: '12px',
                                '&:hover': { borderColor: '#60A5FA', backgroundColor: '#F0F7FF' },
                                display: { xs: 'none', sm: 'flex' }
                            }}
                        >
                            Call Log
                        </Button>

                    </div>
                </div>

                <div className="meetContainer">
                    <div className="leftPanel">
                        <Box sx={{ maxWidth: 540 }}>
                            <Typography variant="h3" sx={{ fontWeight: 800, color: '#0F172A', fontFamily: "'Plus Jakarta Sans', sans-serif", mb: 2 }}>
                                Premium Video Meetings, <br /><span style={{ color: '#3B82F6' }}>Free for Everyone</span>
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#475569', fontSize: '1.1rem', mb: 4, lineHeight: 1.6 }}>
                                Connect, collaborate, and celebrate from anywhere with NovaCall. Enjoy high-quality video, screen sharing, and interactive features natively built-in.
                            </Typography>

                            <div className="light-card" style={{ padding: '2rem' }}>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <Button
                                        variant="contained"
                                        startIcon={newMeetingLoading ? <CircularProgress size={20} sx={{ color: '#FFF' }} /> : <VideoCallIcon />}
                                        onClick={handleNewMeeting}
                                        disabled={newMeetingLoading}
                                        className="glow-btn"
                                        sx={{ py: 1.7, px: 3, borderRadius: '12px', fontWeight: 700, flex: { xs: '1 1 100%', sm: 1 }, textTransform: 'none', fontSize: '1.05rem' }}
                                    >
                                        {newMeetingLoading ? "Creating..." : "New Meeting"}
                                    </Button>

                                    <Box sx={{ flex: { xs: '1 1 100%', sm: 1.5 }, display: 'flex', gap: 1 }}>
                                        <TextField
                                            fullWidth
                                            value={meetingCode}
                                            onChange={e => setMeetingCode(e.target.value)}
                                            placeholder="Enter room code..."
                                            variant="outlined"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <KeyboardIcon sx={{ color: '#94A3B8' }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: '12px',
                                                    backgroundColor: '#F8FAFC',
                                                    color: '#0F172A',
                                                    '& fieldset': { borderColor: '#E2E8F0' },
                                                    '&:hover fieldset': { borderColor: '#93C5FD' },
                                                    '&.Mui-focused fieldset': { borderColor: '#60A5FA' },
                                                },
                                            }}
                                        />
                                        <Button
                                            onClick={handleJoinVideoCall}
                                            disabled={!meetingCode || joinLoading}
                                            variant={meetingCode ? 'contained' : 'text'}
                                            sx={{ py: 1.5, px: 3, borderRadius: '12px', fontWeight: 700, textTransform: 'none', color: meetingCode ? '#FFF' : '#94A3B8' }}
                                        >
                                            {joinLoading ? <CircularProgress size={20} sx={{ color: '#FFF' }} /> : "Join"}
                                        </Button>
                                    </Box>
                                </Box>
                                
                                <Divider sx={{ my: 3 }} />
                                
                                <Typography variant="body2" sx={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <EventIcon fontSize="small" sx={{ color: '#3B82F6' }} /> Need to meet later? <a href="#" onClick={(e) => { e.preventDefault(); setScheduleOpen(true); }} style={{ color: '#3B82F6', fontWeight: 700, textDecoration: 'none' }}>Schedule a meeting</a>
                                </Typography>
                            </div>

                            {/* Item 12: Upcoming & Recent Meetings Section */}
                            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {upcomingList && upcomingList.length > 0 && (
                                    <Box sx={{ p: 2.5, bgcolor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <EventIcon sx={{ color: '#3B82F6', fontSize: 20 }} /> Upcoming Scheduled Meetings
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {upcomingList.map((item) => (
                                                <Box key={item._id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                                    <Box>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>{item.title}</Typography>
                                                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                                                            {new Date(item.scheduled_date).toLocaleDateString()} at {item.scheduled_time} • Code: {item.meeting_code}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <Button size="small" variant="contained" onClick={() => navigate(`/${item.meeting_code}`)} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}>
                                                            Start Call
                                                        </Button>
                                                        <Button size="small" color="error" onClick={() => handleDeleteSchedule(item._id)} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                                                            Cancel
                                                        </Button>
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                )}

                                {recentList && recentList.length > 0 && (
                                    <Box sx={{ p: 2.5, bgcolor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <RestoreIcon sx={{ color: '#8B5CF6', fontSize: 20 }} /> Recent Activity
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {recentList.map((rec, idx) => (
                                                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.2, bgcolor: '#F8FAFC', borderRadius: '10px' }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                                                        Room: <strong style={{ color: '#3B82F6' }}>{rec.meeting_code || rec.meetingCode}</strong>
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                                                        {new Date(rec.date).toLocaleDateString()}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </div>
                    
                    <div className='rightPanel'>
                        <img src="/feature-video.jpg" alt="NovaCall Video Grid Feature" style={{ borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }} />
                    </div>
                </div>
            </div>

            {/* High-Fidelity Schedule Meeting Modal */}
            <Dialog 
                open={scheduleOpen} 
                onClose={() => setScheduleOpen(false)} 
                fullWidth 
                maxWidth="md"
                PaperProps={{
                    sx: { borderRadius: '24px', p: 1 }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.4rem', borderBottom: '1px solid #E2E8F0', pb: 2 }}>
                    Schedule a Meeting
                </DialogTitle>
                <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
                        
                        {/* Left Form Column */}
                        <Box sx={{ flex: 1, p: 3, borderRight: { md: '1px solid #E2E8F0' } }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#0F172A' }}>Meeting Details</Typography>
                            
                            <TextField
                                fullWidth
                                label="Room Title"
                                value={scheduledTitle}
                                onChange={e => setScheduledTitle(e.target.value)}
                                placeholder="e.g. Design Review Meeting"
                                sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                            
                            <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="Date"
                                    InputLabelProps={{ shrink: true }}
                                    value={scheduledDate}
                                    onChange={e => setScheduledDate(e.target.value)}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                />
                                <TextField
                                    fullWidth
                                    type="time"
                                    label="Time"
                                    InputLabelProps={{ shrink: true }}
                                    value={scheduledTime}
                                    onChange={e => setScheduledTime(e.target.value)}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                />
                            </Box>

                            <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Duration"
                                    defaultValue="1 hour"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                    SelectProps={{ native: true }}
                                >
                                    <option value="30 mins">30 mins</option>
                                    <option value="1 hour">1 hour</option>
                                    <option value="2 hours">2 hours</option>
                                </TextField>
                                <TextField
                                    select
                                    fullWidth
                                    label="Time Zone"
                                    defaultValue="IST"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                                    SelectProps={{ native: true }}
                                >
                                    <option value="IST">(GMT+05:30) India Standard Time</option>
                                    <option value="UTC">(UTC) Coordinated Universal Time</option>
                                    <option value="EST">(EST) Eastern Standard Time</option>
                                </TextField>
                            </Box>

                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Add Description (Optional)"
                                placeholder="Let's review the latest designs and share feedback."
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                        </Box>

                        {/* Right Confirmation / Share Column */}
                        <Box sx={{ flex: 0.85, p: 4, backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            {createdScheduleLink ? (
                                <>
                                    <Box sx={{ width: '80%', mb: 3, position: 'relative' }}>
                                        <img src="/showcase-schedule.png" alt="Success" style={{ width: '100%', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                        <Box sx={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>
                                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#3B82F6', display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <EventIcon /> Scheduled Successfully!
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', alignSelf: 'flex-start', mb: 1 }}>
                                        Shareable Meeting Link
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', width: '100%', background: '#FFF', border: '1px solid #CBD5E1', borderRadius: '10px', p: 0.5, mb: 3 }}>
                                        <Box sx={{ flex: 1, p: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748B', fontSize: '0.9rem' }}>
                                            {createdScheduleLink}
                                        </Box>
                                        <Button 
                                            variant="contained" 
                                            disableElevation
                                            onClick={copyScheduleLink}
                                            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, minWidth: '80px' }}
                                        >
                                            Copy
                                        </Button>
                                    </Box>

                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748B', mb: 2 }}>
                                        Share via
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                                        {['Email', 'WhatsApp', 'Slack'].map(platform => (
                                            <Box key={platform} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, cursor: 'pointer', '&:hover': { opacity: 0.8 } }}>
                                                <Avatar sx={{ bgcolor: platform === 'WhatsApp' ? '#22C55E' : platform === 'Slack' ? '#E11D48' : '#3B82F6', width: 48, height: 48 }}>
                                                    {platform[0]}
                                                </Avatar>
                                                <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569' }}>{platform}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </>
                            ) : (
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: 0.4, textAlign: 'center' }}>
                                    <EventIcon sx={{ fontSize: 80, color: '#94A3B8', mb: 2 }} />
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#475569' }}>Ready to Schedule</Typography>
                                    <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 200, mt: 1 }}>Fill out the details on the left and click Schedule below.</Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                    <Button onClick={() => setScheduleOpen(false)} sx={{ fontWeight: 600, color: '#64748B' }}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        onClick={handleCreateSchedule} 
                        className="glow-btn" 
                        disabled={scheduleLoading || !!createdScheduleLink}
                        sx={{ fontWeight: 700, px: 4, borderRadius: '10px' }}
                    >
                        {scheduleLoading ? "Scheduling..." : "Schedule Meeting"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={toastOpen}
                autoHideDuration={3000}
                onClose={() => setToastOpen(false)}
                message={toastMessage}
            />
        </div>
    )
}

export default withAuth(HomeComponent)