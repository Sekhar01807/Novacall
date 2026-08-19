import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";

export function MeetingModals({
    showLeaveConfirm,
    onCloseLeaveConfirm,
    isHost,
    onConfirmLeave,
    roomFullModalOpen,
    kickedModalOpen,
    meetingEndedModalOpen
}) {
    return (
        <>
            {/* Leave Confirmation Dialog */}
            <Dialog open={showLeaveConfirm} onClose={onCloseLeaveConfirm}>
                <DialogTitle sx={{ fontWeight: 800 }}>{isHost ? "End Meeting for Everyone?" : "Leave Meeting?"}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: '#475569' }}>
                        {isHost ? "As the host, leaving will end the call for all participants." : "Are you sure you want to exit this call?"}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={onCloseLeaveConfirm}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={onConfirmLeave} sx={{ fontWeight: 700 }}>
                        {isHost ? "End Call" : "Leave Call"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Room Full / Capacity Exceeded Modal Dialog */}
            <Dialog open={roomFullModalOpen} onClose={() => {}}>
                <DialogTitle sx={{ fontWeight: 800, color: '#F59E0B' }}>Meeting Room Full</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: '#475569' }}>
                        This meeting room has reached its maximum participant limit. Please wait for an attendee to leave or contact the meeting organizer.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="contained" onClick={() => window.location.href = "/home"} sx={{ fontWeight: 700 }}>
                        Return to Dashboard
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Kicked Modal Dialog */}
            <Dialog open={kickedModalOpen} onClose={() => {}}>
                <DialogTitle sx={{ fontWeight: 800, color: '#EF4444' }}>Removed From Meeting</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: '#475569' }}>
                        You have been removed from this meeting room by the host.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="contained" onClick={() => window.location.href = "/home"} sx={{ fontWeight: 700 }}>
                        Return to Dashboard
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Meeting Ended Modal Dialog */}
            <Dialog open={meetingEndedModalOpen} onClose={() => {}}>
                <DialogTitle sx={{ fontWeight: 800, color: '#3B82F6' }}>Meeting Concluded</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: '#475569' }}>
                        The host has ended this meeting for all participants.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="contained" onClick={() => window.location.href = "/home"} sx={{ fontWeight: 700 }}>
                        Return to Dashboard
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
