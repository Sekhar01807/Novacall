import React from "react";
import { Box, Tooltip, Typography } from "@mui/material";

/**
 * Connection Quality Indicator Component
 * Renders signal strength bars and tooltip with latency RTT and packet loss telemetry.
 * 
 * @param {Object} props
 * @param {string} props.quality - 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Reconnecting'
 * @param {number} [props.rtt] - Round trip time in milliseconds
 * @param {number} [props.packetLoss] - Percentage of lost packets (0 - 100)
 * @param {boolean} [props.compact] - Compact view for video tiles
 */
export function ConnectionQualityIndicator({ quality = "Excellent", rtt = 28, packetLoss = 0, compact = false }) {
    let color = "#10B981"; // Green (Excellent)
    let activeBars = 4;

    switch (quality) {
        case "Excellent":
            color = "#10B981"; // Emerald green
            activeBars = 4;
            break;
        case "Good":
            color = "#3B82F6"; // Blue
            activeBars = 3;
            break;
        case "Fair":
            color = "#F59E0B"; // Amber yellow
            activeBars = 2;
            break;
        case "Poor":
            color = "#EF4444"; // Red
            activeBars = 1;
            break;
        case "Reconnecting":
            color = "#F43F5E"; // Rose red
            activeBars = 1;
            break;
        default:
            color = "#10B981";
            activeBars = 4;
    }

    const isReconnecting = quality === "Reconnecting";

    const tooltipContent = (
        <Box sx={{ p: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', color: '#F8FAFC', mb: 0.2 }}>
                Network: {quality}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', fontSize: '0.7rem' }}>
                • Latency (RTT): {rtt !== null && rtt !== undefined ? `${Math.round(rtt)} ms` : 'Estimating...'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', fontSize: '0.7rem' }}>
                • Packet Loss: {packetLoss !== null && packetLoss !== undefined ? `${packetLoss.toFixed(1)}%` : '0.0%'}
            </Typography>
        </Box>
    );

    return (
        <Tooltip title={tooltipContent} arrow placement="top">
            <Box
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: compact ? 0.4 : 0.8,
                    bgcolor: compact ? 'rgba(0, 0, 0, 0.55)' : 'rgba(255, 255, 255, 0.08)',
                    border: `1px solid ${compact ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.12)'}`,
                    px: compact ? 0.8 : 1.2,
                    py: compact ? 0.3 : 0.4,
                    borderRadius: compact ? '6px' : '16px',
                    cursor: 'pointer',
                    animation: isReconnecting ? 'pulse 1.2s infinite' : 'none',
                    '@keyframes pulse': {
                        '0%': { opacity: 1 },
                        '50%': { opacity: 0.35 },
                        '100%': { opacity: 1 }
                    }
                }}
            >
                {/* 4 Signal Bars */}
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: compact ? 10 : 12 }}>
                    {[1, 2, 3, 4].map((bar) => {
                        const isActive = bar <= activeBars;
                        const barHeight = (bar / 4) * (compact ? 10 : 12);
                        return (
                            <Box
                                key={bar}
                                sx={{
                                    width: compact ? 2.5 : 3,
                                    height: `${barHeight}px`,
                                    bgcolor: isActive ? color : 'rgba(255, 255, 255, 0.25)',
                                    borderRadius: '1px',
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        );
                    })}
                </Box>

                {!compact && (
                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#F8FAFC' }}>
                        {quality}
                    </Typography>
                )}
            </Box>
        </Tooltip>
    );
}
