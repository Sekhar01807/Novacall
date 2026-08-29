import React, { useState } from "react";
import { Box, Typography, TextField, Button } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { decodeHTMLEntities } from "../../../utils/textUtils";
import styles from "../../../styles/videoComponent.module.css";

export function ChatPanel({ messages, onSendMessage }) {
    const [messageText, setMessageText] = useState("");

    const handleSend = (e) => {
        e.preventDefault();
        if (!messageText.trim()) return;
        onSendMessage(messageText.trim());
        setMessageText("");
    };

    const renderFormattedText = (rawText) => {
        const text = decodeHTMLEntities(rawText);
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
        const parts = text.split(urlRegex);

        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                const href = part.startsWith('www.') ? `https://${part}` : part;
                return (
                    <a
                        key={i}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#60A5FA', textDecoration: 'underline', wordBreak: 'break-all' }}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    const getCleanSenderName = (rawSender) => {
        const decoded = decodeHTMLEntities(rawSender);
        if (!decoded) return 'Participant';
        if (decoded.includes('@')) {
            return decoded.split('@')[0];
        }
        return decoded;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Messages Scroll Area */}
            <div className={styles.chattingDisplay}>
                {messages.length !== 0 ? (
                    messages.map((item, index) => (
                        <div className={styles.chatBubble} key={index}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.3 }}>
                                <p className={styles.chatSender}>{getCleanSenderName(item.sender)}</p>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.65rem' }}>
                                    {item.timestamp}
                                </Typography>
                            </Box>
                            <p className={styles.chatText}>{renderFormattedText(item.data)}</p>
                        </div>
                    ))
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748B' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>No messages yet</Typography>
                        <Typography variant="caption">Send a message to everyone in the room</Typography>
                    </div>
                )}
            </div>

            {/* Input Box */}
            <div className={styles.chattingArea}>
                <form onSubmit={handleSend} style={{ display: 'flex', width: '100%', gap: '8px' }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Type a message to everyone..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '10px',
                                color: '#F8FAFC',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' },
                                '&:hover fieldset': { borderColor: '#3B82F6' },
                                '&.Mui-focused fieldset': { borderColor: '#3B82F6' }
                            }
                        }}
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!messageText.trim()}
                        sx={{ borderRadius: '10px', minWidth: '44px', px: 1.5, bgcolor: '#3B82F6' }}
                    >
                        <SendIcon fontSize="small" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
