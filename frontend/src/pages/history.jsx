import React, { useContext, useEffect, useState, useCallback } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';
import withAuth from '../utils/withAuth';
import { 
    Card, CardContent, Button, Typography, IconButton, Box, Chip, Tabs, Tab, 
    TextField, InputAdornment, Skeleton, Pagination, MenuItem, Select, FormControl, InputLabel 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import HistoryToggleOffIcon from '@mui/icons-material/HistoryToggleOff';
import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VideocamIcon from '@mui/icons-material/Videocam';
import ChatIcon from '@mui/icons-material/Chat';
import RefreshIcon from '@mui/icons-material/Refresh';
import { logoImg } from '../assets/images';

function History() {
    const { getHistoryOfUser, userData } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [tabIndex, setTabIndex] = useState(0);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalMeetings, setTotalMeetings] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const routeTo = useNavigate();

    const displayName = userData?.name || userData?.username || "User";

    // Debounce search query input by 300ms
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1); // Reset to page 1 on search term update
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getHistoryOfUser(page, limit, debouncedSearch);
            if (response && response.pagination) {
                // Paginated envelope
                setMeetings(response.meetings || []);
                setTotalMeetings(response.pagination.total || 0);
                setTotalPages(response.pagination.totalPages || 1);
                if (response.meetings && response.meetings.length > 0) {
                    setSelectedMeeting(response.meetings[0]);
                } else {
                    setSelectedMeeting(null);
                }
            } else if (Array.isArray(response)) {
                // Legacy direct array fallback
                setMeetings(response);
                setTotalMeetings(response.length);
                setTotalPages(Math.ceil(response.length / limit) || 1);
                if (response.length > 0) setSelectedMeeting(response[0]);
            }
        } catch (err) {
            console.error("Error fetching meeting history:", err);
        } finally {
            setLoading(false);
        }
    }, [getHistoryOfUser, page, limit, debouncedSearch]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedIndex(code);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handlePageChange = (event, newPage) => {
        setPage(newPage);
    };

    const handleLimitChange = (event) => {
        setLimit(Number(event.target.value));
        setPage(1);
    };

    const startItemIndex = totalMeetings === 0 ? 0 : (page - 1) * limit + 1;
    const endItemIndex = Math.min(page * limit, totalMeetings);

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
                                Review past conferencing sessions, participant logs, and recordings.
                            </Typography>
                        </div>
                    </div>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TextField
                            placeholder="Search by room code..."
                            size="small"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                            }}
                            sx={{ width: 260, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#FFF' } }}
                        />
                        <IconButton onClick={fetchHistory} sx={{ bgcolor: '#F1F5F9' }} title="Refresh History">
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </div>

                <Box sx={{ p: 3, maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                    {/* Header Statistics & Pagination summary */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, px: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#475569' }}>
                            Showing <span style={{ color: '#3B82F6' }}>{startItemIndex}–{endItemIndex}</span> of {totalMeetings} total meetings
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <Select
                                    value={limit}
                                    onChange={handleLimitChange}
                                    sx={{ borderRadius: 2, fontSize: '0.85rem', bgcolor: '#FFF' }}
                                >
                                    <MenuItem value={5}>5 per page</MenuItem>
                                    <MenuItem value={10}>10 per page</MenuItem>
                                    <MenuItem value={25}>25 per page</MenuItem>
                                    <MenuItem value={50}>50 per page</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', gap: 3, height: '70vh' }}>
                            <Box sx={{ width: 340, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Skeleton variant="rounded" width="100%" height={90} sx={{ borderRadius: 3 }} />
                                <Skeleton variant="rounded" width="100%" height={90} sx={{ borderRadius: 3 }} />
                                <Skeleton variant="rounded" width="100%" height={90} sx={{ borderRadius: 3 }} />
                            </Box>
                            <Box sx={{ flexGrow: 1 }}>
                                <Skeleton variant="rounded" width="100%" height={400} sx={{ borderRadius: 4 }} />
                            </Box>
                        </Box>
                    ) : meetings.length !== 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', gap: 3, minHeight: '62vh' }}>
                                {/* Left Column: Meeting List */}
                                <Box sx={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto', pr: 1, maxHeight: '65vh' }}>
                                    {meetings.map((e, i) => {
                                        const isSelected = selectedMeeting?._id === e._id || selectedMeeting === e;
                                        return (
                                            <Card
                                                key={e._id || i}
                                                onClick={() => { setSelectedMeeting(e); setTabIndex(0); }}
                                                sx={{
                                                    cursor: 'pointer',
                                                    borderRadius: 3,
                                                    border: isSelected ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                                                    boxShadow: isSelected ? '0 8px 24px rgba(59, 130, 246, 0.15)' : 'none',
                                                    transition: 'all 0.2s ease',
                                                    bgcolor: isSelected ? '#F0F9FF' : '#FFF',
                                                    '&:hover': { borderColor: '#93C5FD', transform: 'translateY(-1px)' }
                                                }}
                                            >
                                                <CardContent sx={{ p: 2.5, pb: "20px !important" }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                                                            {e.meeting_code}
                                                        </Typography>
                                                        <Chip label="Completed" size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontWeight: 700 }} />
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: '#64748B' }}>
                                                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                                                            <CalendarTodayIcon sx={{ fontSize: 13 }} /> {formatDate(e.date)}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                                                            <AccessTimeIcon sx={{ fontSize: 13 }} /> {formatTime(e.date)}
                                                        </Typography>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </Box>

                                {/* Right Column: Meeting Details Pane */}
                                {selectedMeeting && (
                                    <Box sx={{ flex: 1, borderRadius: 4, border: '1px solid #E2E8F0', bgcolor: '#FFF', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                        <Box sx={{ p: 4, borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box>
                                                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                                    Room: {selectedMeeting.meeting_code}
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 1.5 }}>
                                                    <Chip icon={<CalendarTodayIcon sx={{ fontSize: 14 }} />} label={formatDate(selectedMeeting.date)} size="small" sx={{ borderRadius: 2, fontWeight: 700 }} />
                                                    <Chip icon={<AccessTimeIcon sx={{ fontSize: 14 }} />} label={formatTime(selectedMeeting.date)} size="small" sx={{ borderRadius: 2, fontWeight: 700 }} />
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
                                                    Rejoin Room
                                                </Button>
                                            </Box>
                                        </Box>

                                        <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} sx={{ borderBottom: '1px solid #E2E8F0', px: 3, pt: 1 }}>
                                            <Tab label="Session Overview" sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.95rem' }} />
                                            <Tab label="Chat & Activity" sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.95rem' }} />
                                        </Tabs>

                                        <Box sx={{ p: 4, flex: 1, overflowY: 'auto' }}>
                                            {tabIndex === 0 && (
                                                <Box>
                                                    <Card sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
                                                        <CardContent>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#475569', mb: 2, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                                                Meeting Metadata
                              `                             </Typography>
                                                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#334155' }}>
                                                                • <strong>User ID / Host:</strong> {displayName}
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#334155' }}>
                                                                • <strong>Room Code:</strong> {selectedMeeting.meeting_code}
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#334155' }}>
                                                                • <strong>Date Recorded:</strong> {formatDate(selectedMeeting.date)}
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                                                                • <strong>Timestamp:</strong> {formatTime(selectedMeeting.date)}
                                                            </Typography>
                                                        </CardContent>
                                                    </Card>
                                                </Box>
                                            )}
                                            {tabIndex === 1 && (
                                                <Box sx={{ textAlign: 'center', py: 8 }}>
                                                    <ChatIcon sx={{ fontSize: 48, color: '#94A3B8', mb: 2 }} />
                                                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#475569' }}>Real-time Session Completed</Typography>
                                                    <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 360, mx: 'auto', mt: 0.5 }}>
                                                        In-meeting ephemeral chat messages and recordings are purged on session teardown.
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                )}
                            </Box>

                            {/* Pagination Controls Bar */}
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', pt: 2, pb: 2 }}>
                                <Pagination
                                    count={totalPages}
                                    page={page}
                                    onChange={handlePageChange}
                                    color="primary"
                                    shape="rounded"
                                    size="medium"
                                    showFirstButton
                                    showLastButton
                                />
                            </Box>
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
                                bgcolor: '#FFF'
                            }}
                        >
                            <HistoryToggleOffIcon sx={{ fontSize: 64, color: '#94A3B8' }} />
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {searchQuery ? "No Matching Meetings Found" : "No Meeting History Found"}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 400 }}>
                                {searchQuery ? `No meeting codes match "${searchQuery}". Try clearing your search.` : "You haven't joined any calls yet. Start or join a meeting from the home dashboard to populate your activity log."}
                            </Typography>
                            <Button
                                variant="contained"
                                onClick={() => routeTo("/home")}
                                className="glow-btn"
                                sx={{ mt: 1, px: 4, py: 1.2, borderRadius: '10px' }}
                            >
                                Go to Dashboard
                            </Button>
                        </Box>
                    )}
                </Box>
            </div>
        </div>
    );
}

export default withAuth(History);