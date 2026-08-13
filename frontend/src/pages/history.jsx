import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Button, Typography, IconButton, Container, Box, Chip, Tabs, Tab, TextField, InputAdornment, Skeleton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import HistoryToggleOffIcon from '@mui/icons-material/HistoryToggleOff';
import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VideocamIcon from '@mui/icons-material/Videocam';
import ChatIcon from '@mui/icons-material/Chat';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { logoImg } from '../assets/images';

export default function History() {
    const { getHistoryOfUser, userData } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [tabIndex, setTabIndex] = useState(0);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const routeTo = useNavigate();

    const displayName = userData?.name || userData?.username || "User";

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history);
                if (history && history.length > 0) {
                    setSelectedMeeting(history[0]);
                }
            } catch {
                // Handle error
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, [])

    let formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0")
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedIndex(code);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const filteredMeetings = meetings.filter(m =>
        m.meeting_code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="appShell">
            <div className="sidebarRail">
                <div>
                    <div className="sidebarBrand">
                        <img src={logoImg} alt="NovaCall Logo" style={{ height: 36, width: 'auto' }} />
                        <h2>Nova<span>Call</span></h2>
                    </div>
                </div>
            </div>

            <div className="dashboardContent" style={{ height: '100vh', overflowY: 'auto' }}>
                <div className="topHeaderBar">
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <IconButton onClick={() => routeTo("/home")} sx={{ bgcolor: '#F1F5F9' }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <div>
                            <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                Meeting History
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748B' }}>
                                Review past conferencing sessions and activity logs.
                            </Typography>
                        </div>
                    </div>
                    <TextField
                        placeholder="Search meetings..."
                        size="small"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                        }}
                        sx={{ width: 280, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                </div>

                <Box sx={{ p: 3, maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', gap: 3, height: '75vh' }}>
                            <Box sx={{ width: 340, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Skeleton variant="rounded" width="100%" height={90} sx={{ borderRadius: 3 }} />
                                <Skeleton variant="rounded" width="100%" height={90} sx={{ borderRadius: 3 }} />
                                <Skeleton variant="rounded" width="100%" height={90} sx={{ borderRadius: 3 }} />
                            </Box>
                            <Box sx={{ flexGrow: 1 }}>
                                <Skeleton variant="rounded" width="100%" height={400} sx={{ borderRadius: 4 }} />
                            </Box>
                        </Box>
                    ) : filteredMeetings.length !== 0 ? (
                        <Box sx={{ display: 'flex', gap: 3, height: '75vh' }}>
                            {/* Left Column: Meeting List */}
                            <Box sx={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto', pr: 1 }}>
                                {filteredMeetings.map((e, i) => {
                                    const isSelected = selectedMeeting === e;
                                    return (
                                        <Card
                                            key={i}
                                            onClick={() => { setSelectedMeeting(e); setTabIndex(0); }}
                                            sx={{
                                                cursor: 'pointer',
                                                borderRadius: 3,
                                                border: isSelected ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                                                boxShadow: isSelected ? '0 8px 24px rgba(59, 130, 246, 0.15)' : 'none',
                                                transition: 'all 0.2s ease',
                                                '&:hover': { borderColor: '#93C5FD' }
                                            }}
                                        >
                                            <CardContent sx={{ p: 2.5, pb: "20px !important" }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                                                    Meeting — {e.meeting_code}
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: '#64748B' }}>
                                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                                                        <CalendarTodayIcon sx={{ fontSize: 14 }} /> {formatDate(e.date)}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                                                        <AccessTimeIcon sx={{ fontSize: 14 }} /> {formatTime(e.date)}
                                                    </Typography>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </Box>

                            {/* Right Column: Meeting Details Pane */}
                            {selectedMeeting && (
                                <Box sx={{ flex: 1, borderRadius: 4, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                    <Box sx={{ p: 4, borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box>
                                            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                                                Meeting — {selectedMeeting.meeting_code}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 2 }}>
                                                <Chip icon={<CalendarTodayIcon sx={{ fontSize: 16 }} />} label={formatDate(selectedMeeting.date)} size="small" sx={{ borderRadius: 2, fontWeight: 700 }} />
                                                <Chip icon={<AccessTimeIcon sx={{ fontSize: 16 }} />} label={formatTime(selectedMeeting.date)} size="small" sx={{ borderRadius: 2, fontWeight: 700 }} />
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                                            <Button 
                                                variant="outlined" 
                                                startIcon={<ContentCopyIcon />}
                                                onClick={() => copyCode(selectedMeeting.meeting_code)}
                                                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
                                            >
                                                {copiedIndex === selectedMeeting.meeting_code ? "Copied!" : "Copy Code"}
                                            </Button>
                                            <Button 
                                                variant="contained" 
                                                startIcon={<VideocamIcon />}
                                                onClick={() => routeTo(`/${selectedMeeting.meeting_code}`)}
                                                className="glow-btn"
                                                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
                                            >
                                                Rejoin Meeting
                                            </Button>
                                        </Box>
                                    </Box>

                                    <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} sx={{ borderBottom: '1px solid #E2E8F0', px: 3, pt: 1 }}>
                                        <Tab label="Overview" sx={{ textTransform: 'none', fontWeight: 700, fontSize: '1rem' }} />
                                        <Tab label="Details" sx={{ textTransform: 'none', fontWeight: 700, fontSize: '1rem' }} />
                                    </Tabs>

                                    <Box sx={{ p: 4, flex: 1, overflowY: 'auto' }}>
                                        {tabIndex === 0 && (
                                            <Box>
                                                <Card sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid #E2E8F0' }}>
                                                    <CardContent>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#64748B', mb: 1.5, textTransform: 'uppercase' }}>Meeting Summary</Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>• Host: {displayName}</Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>• Room Code: {selectedMeeting.meeting_code}</Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>• Date: {formatDate(selectedMeeting.date)}</Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>• Time: {formatTime(selectedMeeting.date)}</Typography>
                                                    </CardContent>
                                                </Card>
                                            </Box>
                                        )}
                                        {tabIndex === 1 && (
                                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                                <ChatIcon sx={{ fontSize: 60, color: '#CBD5E1', mb: 2 }} />
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#475569' }}>No Additional Data</Typography>
                                                <Typography variant="body2" sx={{ color: '#64748B' }}>Chat logs and recordings will appear here when available.</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                py: 8,
                                px: 4,
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 2,
                                border: '1px solid #E2E8F0',
                                borderRadius: 4,
                            }}
                        >
                            <HistoryToggleOffIcon sx={{ fontSize: 64, color: '#94A3B8' }} />
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {searchQuery ? "No Matching Meetings Found" : "No Meeting History Found"}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 400 }}>
                                {searchQuery ? `No meetings match "${searchQuery}". Try a different search.` : "You haven't joined any calls yet. Start or join a meeting from the home dashboard to populate your activity log."}
                            </Typography>
                            <Button
                                variant="contained"
                                onClick={() => routeTo("/home")}
                                className="glow-btn"
                                sx={{ mt: 1, px: 4, py: 1.2 }}
                            >
                                Go to Dashboard
                            </Button>
                        </Box>
                    )}
                </Box>
            </div>
        </div>
    )
}