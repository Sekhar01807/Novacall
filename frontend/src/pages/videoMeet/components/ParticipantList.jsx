import React from "react";
import { Box, Typography, Avatar, IconButton, Button, Chip } from "@mui/material";
import MicOffIcon from "@mui/icons-material/MicOff";
import MoreVertIcon from "@mui/icons-material/MoreVert";

export function ParticipantList({
    localUsername,
    isHost,
    remoteVideos,
    peerNames,
    onHostMute,
    onHostKick
}) {
    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#94A3B8', mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
                In Meeting ({remoteVideos.length + 1})
            </Typography>

            {/* Local User Item */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.2, border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 2.5, mb: 1, bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#3B82F6', width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700 }}>
                        {localUsername.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                        {localUsername} (You)
                    </Typography>
                </Box>
                {isHost && (
                    <Chip label="Host" size="small" sx={{ bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', fontWeight: 700, height: 22, fontSize: '0.7rem' }} />
                )}
            </Box>

            {/* Remote Participants */}
            {remoteVideos.map((vid, idx) => {
                const sId = vid.socketId || idx;
                const name = peerNames[vid.socketId] || `Participant ${idx + 1}`;
                return (
                    <Box
                        key={sId}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1.2,
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 2.5,
                            mb: 0.8,
                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' }
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: '#8B5CF6', width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700 }}>
                                {name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                                {name}
                            </Typography>
                        </Box>

                        {isHost && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconButton
                                    size="small"
                                    onClick={() => onHostMute(vid.socketId)}
                                    sx={{ color: '#FB7185' }}
                                    title="Mute Participant"
                                >
                                    <MicOffIcon style={{ fontSize: 16 }} />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => onHostKick(vid.socketId)}
                                    sx={{ color: '#94A3B8' }}
                                    title="Remove Participant"
                                >
                                    <MoreVertIcon style={{ fontSize: 16 }} />
                                </IconButton>
                            </Box>
                        )}
                    </Box>
                );
            })}
        </Box>
    );
}
