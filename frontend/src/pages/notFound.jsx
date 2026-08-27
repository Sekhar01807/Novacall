import React, { useContext } from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import { logoImg } from '../assets/images';
import { AuthContext } from '../contexts/AuthContext';

export default function NotFound() {
    const navigate = useNavigate();
    const { userData, isAuthenticated } = useContext(AuthContext);
    const isLoggedIn = isAuthenticated || Boolean(userData?.username);

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0F172A',
            backgroundImage: 'radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.15) 0px, transparent 50%)',
            px: 2,
            fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
            <Container maxWidth="sm">
                <Paper elevation={0} sx={{
                    p: { xs: 4, sm: 6 },
                    borderRadius: '24px',
                    textAlign: 'center',
                    background: 'rgba(30, 41, 59, 0.7)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    {/* Brand Logo */}
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                        <img src={logoImg} alt="NovaCall" style={{ height: 36, width: 'auto' }} />
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
                            Nova<span style={{ color: '#60A5FA' }}>Call</span>
                        </Typography>
                    </Box>

                    {/* 404 Badge */}
                    <Box sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '20px',
                        bgcolor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2.5
                    }}>
                        <VideocamOffIcon sx={{ fontSize: 40, color: '#F87171' }} />
                    </Box>

                    <Typography variant="h2" sx={{ fontWeight: 900, color: '#F8FAFC', mb: 1, fontSize: { xs: '3rem', sm: '4rem' }, letterSpacing: '-0.03em' }}>
                        404
                    </Typography>

                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#F8FAFC', mb: 1.5 }}>
                        Page or Meeting Not Found
                    </Typography>

                    <Typography variant="body1" sx={{ color: '#94A3B8', mb: 4, lineHeight: 1.6 }}>
                        The link you followed doesn't exist, the meeting room may have ended, or the URL was entered incorrectly.
                    </Typography>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'center' }}>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate(-1)}
                            sx={{
                                py: 1.4,
                                px: 3,
                                borderRadius: '12px',
                                textTransform: 'none',
                                fontWeight: 700,
                                color: '#F8FAFC',
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                                '&:hover': {
                                    borderColor: '#60A5FA',
                                    bgcolor: 'rgba(96, 165, 250, 0.1)'
                                }
                            }}
                        >
                            Go Back
                        </Button>

                        <Button
                            variant="contained"
                            startIcon={<HomeIcon />}
                            onClick={() => navigate(isLoggedIn ? '/home' : '/')}
                            sx={{
                                py: 1.4,
                                px: 3,
                                borderRadius: '12px',
                                textTransform: 'none',
                                fontWeight: 700,
                                bgcolor: '#3B82F6',
                                '&:hover': { bgcolor: '#2563EB' }
                            }}
                        >
                            {isLoggedIn ? "Go to Dashboard" : "Go to Home"}
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}
