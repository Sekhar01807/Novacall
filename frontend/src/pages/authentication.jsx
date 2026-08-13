import * as React from 'react';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar, Alert, CircularProgress } from '@mui/material';
import { logoImg } from '../assets/images';
import { useLocation, useNavigate } from 'react-router-dom';

const highContrastLightTheme = createTheme({
    palette: {
        mode: 'light',
        background: {
            default: '#F8FAFC',
            paper: '#FFFFFF',
        },
        primary: {
            main: '#60A5FA',
            dark: '#3B82F6',
            light: '#93C5FD',
        },
        text: {
            primary: '#0F172A',
            secondary: '#475569',
        }
    },
    typography: {
        fontFamily: "'Inter', sans-serif",
    },
    shape: {
        borderRadius: 14,
    },
});

export default function Authentication() {
    const location = useLocation();
    const navigate = useNavigate();
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [rememberMe, setRememberMe] = React.useState(() => localStorage.getItem('rememberMe') === 'true');
    const [loading, setLoading] = React.useState(false);
    const [emailError, setEmailError] = React.useState('');
    const [passwordError, setPasswordError] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [confirmPasswordError, setConfirmPasswordError] = React.useState('');

    // Forgot Password Modal States
    const [forgotModalOpen, setForgotModalOpen] = React.useState(false);
    const [forgotEmail, setForgotEmail] = React.useState('');
    const [forgotStep, setForgotStep] = React.useState(1); // 1: Email, 2: Code & New Password
    const [generatedCode, setGeneratedCode] = React.useState('');
    const [enteredCode, setEnteredCode] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [forgotMsg, setForgotMsg] = React.useState('');
    const [forgotErr, setForgotErr] = React.useState('');
    const [forgotLoading, setForgotLoading] = React.useState(false);

    // Guest Join Feature States
    const [guestModalOpen, setGuestModalOpen] = React.useState(false);
    const [guestName, setGuestName] = React.useState('Guest Participant');
    const [guestRoomCode, setGuestRoomCode] = React.useState('demo-room');

    // Initial state based on mode query param
    const [formState, setFormState] = React.useState(() => {
        const queryParams = new URLSearchParams(location.search);
        return queryParams.get('mode') === 'signup' ? 1 : 0;
    });

    React.useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.get('mode') === 'signup') {
            setFormState(1);
        } else if (queryParams.get('mode') === 'signin') {
            setFormState(0);
        }

        if (queryParams.get('reason') === 'expired') {
            setError('Your session has expired. Please sign in again.');
        }

        const savedEmail = localStorage.getItem('savedEmail');
        if (savedEmail && localStorage.getItem('rememberMe') === 'true') {
            setEmail(savedEmail);
        }
    }, [location.search]);

    const [open, setOpen] = React.useState(false);
    const { handleRegister, handleLogin } = React.useContext(AuthContext);

    let handleAuth = async () => {
        // Item 7: Client-side input validation
        setEmailError('');
        setPasswordError('');
        setConfirmPasswordError('');
        setError('');

        if (!email.trim()) {
            setEmailError('Email is required');
            return;
        }

        if (formState === 1) {
            // Registration validation
            if (!name.trim()) {
                setError('Full name is required');
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                setEmailError('Please enter a valid email address');
                return;
            }
            if (password.length < 8) {
                setPasswordError('Password must be at least 8 characters');
                return;
            }
            if (!/[A-Z]/.test(password)) {
                setPasswordError('Password must contain at least one uppercase letter');
                return;
            }
            if (!/[0-9]/.test(password)) {
                setPasswordError('Password must contain at least one number');
                return;
            }
            // Item 9: Confirm password check
            if (password !== confirmPassword) {
                setConfirmPasswordError('Passwords do not match');
                return;
            }
        } else {
            // Login validation
            if (!password.trim()) {
                setPasswordError('Password is required');
                return;
            }
        }

        setLoading(true);
        try {
            if (formState === 0) {
                if (rememberMe) {
                    localStorage.setItem('rememberMe', 'true');
                    localStorage.setItem('savedEmail', email);
                } else {
                    localStorage.removeItem('rememberMe');
                    localStorage.removeItem('savedEmail');
                }
                await handleLogin(email, password);
            }
            if (formState === 1) {
                let result = await handleRegister(name, email, email, password);
                setName("");
                setEmail("");
                setConfirmPassword("");
                setMessage(result);
                setOpen(true);
                setError("");
                setFormState(0);
                setPassword("");
            }
        } catch (err) {
            let msg = (err.response?.data?.message || "Invalid credentials. Please check and try again.");
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    // Item 10: Forgot Password Handlers
    const handleSendResetCode = async () => {
        if (!forgotEmail.trim()) {
            setForgotErr('Please enter your email address');
            return;
        }
        setForgotLoading(true);
        setForgotErr('');
        try {
            const res = await fetch(`${server}/api/v1/users/forgot_password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setGeneratedCode(data.resetCode || '123456');
            setForgotMsg(`Verification code generated: ${data.resetCode || '123456'}`);
            setForgotStep(2);
        } catch (err) {
            setForgotErr(err.message || 'Failed to send reset code');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleResetPasswordSubmit = async () => {
        if (!enteredCode || !newPassword) {
            setForgotErr('Please fill in all fields');
            return;
        }
        if (newPassword.length < 8) {
            setForgotErr('New password must be at least 8 characters long');
            return;
        }
        setForgotLoading(true);
        setForgotErr('');
        try {
            const res = await fetch(`${server}/api/v1/users/reset_password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail, resetCode: enteredCode, newPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setMessage('Password reset successfully! Please sign in with your new password.');
            setOpen(true);
            setForgotModalOpen(false);
            setForgotStep(1);
            setForgotEmail('');
            setEnteredCode('');
            setNewPassword('');
        } catch (err) {
            setForgotErr(err.message || 'Reset failed');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleGuestJoinSubmit = () => {
        if (!guestRoomCode.trim()) return;
        localStorage.setItem("guestDisplayName", guestName.trim() || "Guest Participant");
        navigate(`/${guestRoomCode.trim()}`);
    };

    const generateRandomGuestCode = () => {
        const rand = Math.random().toString(36).substring(2, 8);
        setGuestRoomCode(rand);
    };

    return (
        <ThemeProvider theme={highContrastLightTheme}>
            <CssBaseline />
            {/* Crisp High-Contrast Background Container */}
            <Box
                sx={{
                    minHeight: '100vh',
                    width: '100vw',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage: `url('/auth-bg.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    imageRendering: 'high-quality',
                    backgroundColor: '#F0F7FF',
                    position: 'relative',
                    p: { xs: 2.5, sm: 4 },
                }}
            >
                {/* WIDER Medium Size Crisp Card (maxWidth: 480px) */}
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 4, sm: 5 },
                        width: '100%',
                        maxWidth: 560,
                        borderRadius: 5,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 20px 50px rgba(148, 163, 184, 0.18)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: 2,
                        transform: 'scale(0.9)',
                    }}
                >
                    {/* Centered Brand Emblem Logo */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3.5 }}>
                        <img src={logoImg} alt="NovaCall" style={{ height: 64, width: 'auto', marginBottom: 12 }} />
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            Nova<span style={{ color: '#3B82F6' }}>Call</span>
                        </Typography>
                    </Box>

                    {/* Segmented Sign In / Sign Up Selector */}
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 3.5, p: 0.6, backgroundColor: '#F1F5F9', borderRadius: 3, width: '100%' }}>
                        <Button
                            fullWidth
                            size="medium"
                            onClick={() => { setFormState(0); setError(''); }}
                            sx={{
                                borderRadius: 2.5,
                                py: 1.1,
                                fontWeight: 700,
                                fontSize: '0.98rem',
                                textTransform: 'none',
                                color: formState === 0 ? '#FFFFFF' : '#475569',
                                backgroundColor: formState === 0 ? '#60A5FA' : 'transparent',
                                boxShadow: formState === 0 ? '0 2px 8px rgba(96,165,250,0.3)' : 'none',
                                '&:hover': {
                                    backgroundColor: formState === 0 ? '#3B82F6' : 'rgba(0,0,0,0.04)',
                                }
                            }}
                        >
                            Sign In
                        </Button>
                        <Button
                            fullWidth
                            size="medium"
                            onClick={() => { setFormState(1); setError(''); }}
                            sx={{
                                borderRadius: 2.5,
                                py: 1.1,
                                fontWeight: 700,
                                fontSize: '0.98rem',
                                textTransform: 'none',
                                color: formState === 1 ? '#FFFFFF' : '#475569',
                                backgroundColor: formState === 1 ? '#60A5FA' : 'transparent',
                                boxShadow: formState === 1 ? '0 2px 8px rgba(96,165,250,0.3)' : 'none',
                                '&:hover': {
                                    backgroundColor: formState === 1 ? '#3B82F6' : 'rgba(0,0,0,0.04)',
                                }
                            }}
                        >
                            Sign Up
                        </Button>
                    </Box>

                    {/* High-Contrast Inputs */}
                    <Box component="form" noValidate sx={{ width: '100%' }}>
                        {formState === 1 && (
                            <TextField
                                margin="dense"
                                required
                                fullWidth
                                id="name"
                                label="Full Name"
                                placeholder="Enter your full name"
                                name="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PersonOutlineIcon fontSize="small" sx={{ color: '#64748B' }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    mb: 2,
                                    '& .MuiInputLabel-root': { color: '#475569', fontWeight: 600 },
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 3,
                                        backgroundColor: '#FFFFFF',
                                        color: '#0F172A',
                                        '& fieldset': { borderColor: '#CBD5E1' },
                                        '&:hover fieldset': { borderColor: '#60A5FA' },
                                        '&.Mui-focused fieldset': { borderColor: '#3B82F6' }
                                    }
                                }}
                            />
                        )}

                        <TextField
                            margin="dense"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            placeholder="Enter email address"
                            name="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                            error={!!emailError}
                            helperText={emailError}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <BadgeOutlinedIcon fontSize="small" sx={{ color: '#64748B' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                mb: 2,
                                '& .MuiInputLabel-root': { color: '#475569', fontWeight: 600 },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    backgroundColor: '#FFFFFF',
                                    color: '#0F172A',
                                    '& fieldset': { borderColor: '#CBD5E1' },
                                    '&:hover fieldset': { borderColor: '#60A5FA' },
                                    '&.Mui-focused fieldset': { borderColor: '#3B82F6' }
                                }
                            }}
                        />

                        <TextField
                            margin="dense"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            placeholder="Enter password"
                            value={password}
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                            error={!!passwordError}
                            helperText={passwordError || (formState === 1 ? 'Min 8 chars, 1 uppercase, 1 number' : '')}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlinedIcon fontSize="small" sx={{ color: '#64748B' }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            sx={{ color: '#64748B' }}
                                        >
                                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                mb: 2,
                                '& .MuiInputLabel-root': { color: '#475569', fontWeight: 600 },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    backgroundColor: '#FFFFFF',
                                    color: '#0F172A',
                                    '& fieldset': { borderColor: '#CBD5E1' },
                                    '&:hover fieldset': { borderColor: '#60A5FA' },
                                    '&.Mui-focused fieldset': { borderColor: '#3B82F6' }
                                }
                            }}
                        />

                        {formState === 1 && (
                            <TextField
                                margin="dense"
                                required
                                fullWidth
                                name="confirmPassword"
                                label="Confirm Password"
                                placeholder="Re-enter password"
                                value={confirmPassword}
                                type={showPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmPasswordError(''); }}
                                error={!!confirmPasswordError}
                                helperText={confirmPasswordError}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockOutlinedIcon fontSize="small" sx={{ color: '#64748B' }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    mb: 2,
                                    '& .MuiInputLabel-root': { color: '#475569', fontWeight: 600 },
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 3,
                                        backgroundColor: '#FFFFFF',
                                        color: '#0F172A',
                                        '& fieldset': { borderColor: '#CBD5E1' },
                                        '&:hover fieldset': { borderColor: '#60A5FA' },
                                        '&.Mui-focused fieldset': { borderColor: '#3B82F6' }
                                    }
                                }}
                            />
                        )}

                        {formState === 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', mt: 0.5, mb: 1 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            size="small"
                                            sx={{ color: '#64748B', '&.Mui-checked': { color: '#3B82F6' } }}
                                        />
                                    }
                                    label={<Typography variant="body2" sx={{ color: '#475569', fontSize: '0.85rem', fontWeight: 600 }}>Remember Me</Typography>}
                                />
                                {/* Item 10: Forgot Password Link */}
                                <Typography
                                    variant="body2"
                                    onClick={() => { setForgotModalOpen(true); setForgotStep(1); setForgotErr(''); setForgotMsg(''); }}
                                    sx={{ color: '#3B82F6', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                >
                                    Forgot Password?
                                </Typography>
                            </Box>
                        )}

                        {error && (
                            <Alert severity="error" sx={{ mt: 1.5, mb: 1.5, borderRadius: 3, fontSize: '0.88rem' }}>
                                {error}
                            </Alert>
                        )}

                        <Button
                            type="button"
                            fullWidth
                            variant="contained"
                            onClick={handleAuth}
                            disabled={loading}
                            sx={{
                                mt: 1.5,
                                mb: 1.5,
                                py: 1.5,
                                borderRadius: 3,
                                fontWeight: 700,
                                fontSize: '1rem',
                                textTransform: 'none',
                                backgroundColor: '#60A5FA',
                                color: '#FFFFFF',
                                boxShadow: '0 4px 15px rgba(96, 165, 250, 0.35)',
                                '&:hover': {
                                    backgroundColor: '#3B82F6',
                                    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.45)',
                                },
                                '&.Mui-disabled': {
                                    backgroundColor: '#93C5FD',
                                    color: '#FFFFFF',
                                }
                            }}
                        >
                            {loading ? <CircularProgress size={24} sx={{ color: '#FFFFFF' }} /> : (formState === 0 ? "Sign In" : "Create Account")}
                        </Button>

                        {/* Interactive Guest Join Action Button */}
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => setGuestModalOpen(true)}
                            startIcon={<VideoCallIcon />}
                            sx={{
                                mb: 1,
                                py: 1.3,
                                borderRadius: 3,
                                fontWeight: 600,
                                fontSize: '0.94rem',
                                textTransform: 'none',
                                borderColor: '#CBD5E1',
                                color: '#475569',
                                '&:hover': {
                                    borderColor: '#60A5FA',
                                    backgroundColor: '#F0F7FF',
                                }
                            }}
                        >
                            Join a meeting as guest
                        </Button>
                    </Box>
                </Paper>

                {/* Footer Line */}
                <Box sx={{ position: 'absolute', bottom: 20, textAlign: 'center', zIndex: 2 }}>
                    <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.82rem', fontWeight: 600 }}>
                        NovaCall • Professional HD Video Conferencing Platform
                    </Typography>
                </Box>

                {/* Interactive Guest Meeting Join Modal */}
                <Dialog open={guestModalOpen} onClose={() => setGuestModalOpen(false)} fullWidth maxWidth="xs">
                    <DialogTitle sx={{ fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Join Meeting as Guest
                    </DialogTitle>
                    <DialogContent dividers>
                        <TextField
                            fullWidth
                            margin="dense"
                            label="Your Display Name"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="e.g. John Guest"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonOutlineIcon fontSize="small" sx={{ color: '#94A3B8' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                        <TextField
                            fullWidth
                            margin="dense"
                            label="Meeting Room Code"
                            value={guestRoomCode}
                            onChange={(e) => setGuestRoomCode(e.target.value)}
                            placeholder="Enter room code..."
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <KeyboardIcon fontSize="small" sx={{ color: '#94A3B8' }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Tooltip title="Generate Code">
                                            <IconButton size="small" onClick={generateRandomGuestCode} sx={{ color: '#3B82F6' }}>
                                                <AutoAwesomeIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setGuestModalOpen(false)} sx={{ fontWeight: 600 }}>Cancel</Button>
                        <Button
                            variant="contained"
                            onClick={handleGuestJoinSubmit}
                            className="glow-btn"
                            sx={{ fontWeight: 700, px: 3 }}
                        >
                            Join Room Now
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>

            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={() => setOpen(false)}
                message={message}
            />
            {/* Item 10: Forgot Password Modal Dialog */}
            <Dialog open={forgotModalOpen} onClose={() => setForgotModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Reset Password
                </DialogTitle>
                <DialogContent dividers>
                    {forgotErr && (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{forgotErr}</Alert>
                    )}
                    {forgotMsg && (
                        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>{forgotMsg}</Alert>
                    )}

                    {forgotStep === 1 ? (
                        <Box>
                            <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
                                Enter your registered email address below. We'll generate a verification code to reset your password.
                            </Typography>
                            <TextField
                                fullWidth
                                label="Email Address"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                variant="outlined"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                        </Box>
                    ) : (
                        <Box>
                            <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
                                Enter the 6-digit code shown above and your new password.
                            </Typography>
                            <TextField
                                fullWidth
                                label="Verification Code"
                                value={enteredCode}
                                onChange={(e) => setEnteredCode(e.target.value)}
                                variant="outlined"
                                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                            <TextField
                                fullWidth
                                type="password"
                                label="New Password (min 8 chars)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                variant="outlined"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setForgotModalOpen(false)} sx={{ fontWeight: 600, color: '#64748B' }}>Cancel</Button>
                    {forgotStep === 1 ? (
                        <Button variant="contained" onClick={handleSendResetCode} disabled={forgotLoading} sx={{ borderRadius: '10px', fontWeight: 700 }}>
                            {forgotLoading ? <CircularProgress size={20} sx={{ color: '#FFF' }} /> : "Generate Code"}
                        </Button>
                    ) : (
                        <Button variant="contained" onClick={handleResetPasswordSubmit} disabled={forgotLoading} sx={{ borderRadius: '10px', fontWeight: 700 }}>
                            {forgotLoading ? <CircularProgress size={20} sx={{ color: '#FFF' }} /> : "Reset Password"}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </ThemeProvider>
    );
}