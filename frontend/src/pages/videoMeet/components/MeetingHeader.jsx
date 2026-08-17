import React from "react";
import { Box, Typography, Chip, Tooltip, IconButton } from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import PeopleIcon from "@mui/icons-material/People";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { ConnectionQualityIndicator } from "./ConnectionQualityIndicator";
import { logoImg } from "../../../assets/images";

export function MeetingHeader({ roomCode, isHost, participantCount, networkQuality, networkMetrics, onCopyUrl, copied }) {
    return (
        <Box sx={{
            height: 60,
            bgcolor: '#0F172A',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            zIndex: 100
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
                <img src={logoImg} alt="NovaCall" style={{ height: 28, width: 'auto' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '1rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    NovaCall
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', px: 1.2, py: 0.3, borderRadius: '8px' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#94A3B8', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        Room: {roomCode}
                    </Typography>
                    <Tooltip title={copied ? "Copied!" : "Copy Link"}>
                        <IconButton size="small" onClick={onCopyUrl} sx={{ color: '#60A5FA', p: 0.2 }}>
                            <ContentCopyIcon style={{ fontSize: 13 }} />
                        </IconButton>
                    </Tooltip>
                </Box>

                <Chip 
                    icon={<SecurityIcon style={{ fontSize: 13, color: '#60A5FA' }} />}
                    label={isHost ? "Host" : "Participant"} 
                    size="small" 
                    sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.3)', height: 24 }} 
                />

                <ConnectionQualityIndicator
                    quality={networkQuality}
                    rtt={networkMetrics?.rtt}
                    packetLoss={networkMetrics?.packetLoss}
                />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, bgcolor: 'rgba(255, 255, 255, 0.06)', px: 1.4, py: 0.4, borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <PeopleIcon style={{ fontSize: 15, color: '#94A3B8' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.8rem' }}>
                    {participantCount} {participantCount === 1 ? 'person' : 'people'}
                </Typography>
            </Box>
        </Box>
    );
}
