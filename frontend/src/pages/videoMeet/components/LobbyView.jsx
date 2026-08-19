import React from "react";
import { TextField, Button, Box, Chip } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import styles from "../../../styles/videoComponent.module.css";
import { logoImg } from "../../../assets/images";

export function LobbyView({
    localVideoRef,
    username,
    setUsername,
    userData,
    onJoin
}) {
    return (
        <div className={styles.lobbyWrapper}>
            <div className={styles.lobbyCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={logoImg} alt="NovaCall" style={{ height: 38, width: 'auto' }} />
                    <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, color: '#0F172A', fontSize: '1.8rem' }}>
                        Nova<span style={{ color: '#3B82F6' }}>Call</span> Lobby
                    </h2>
                </div>

                <div className={styles.lobbyVideoBox}>
                    <video ref={localVideoRef} autoPlay muted playsInline></video>
                </div>

                <TextField
                    fullWidth
                    label="Display Name"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#F8FAFC' } }}
                />

                {userData?.username ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Chip
                            icon={<LockOutlinedIcon style={{ fontSize: 14 }} />}
                            label={`Signed in as @${userData.username}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                        />
                    </Box>
                ) : null}

                <Button
                    fullWidth
                    variant="contained"
                    className="glow-btn"
                    onClick={onJoin}
                    disabled={!username.trim()}
                    sx={{ py: 1.5, fontSize: '1.05rem', borderRadius: '12px', fontWeight: 700 }}
                >
                    Join Meeting Room
                </Button>

                <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => window.location.href = "/home"}
                    sx={{ mt: 1, py: 1.2, borderRadius: '12px', fontWeight: 600, color: '#64748B', borderColor: '#CBD5E1' }}
                >
                    Back to Dashboard
                </Button>
            </div>
        </div>
    );
}
